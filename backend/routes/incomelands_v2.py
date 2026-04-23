from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
import random
import string
import shutil
import asyncio
import tempfile

# Load environment variables first
ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# Import emergent integrations after loading env
try:
    from emergentintegrations.llm.openai import OpenAISpeechToText
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logging.warning("emergentintegrations not available")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'incomelands-secret-key-2024')
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Incomelands 2.0 API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ================== MODELS ==================

class UserCreate(BaseModel):
    phone: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    otp: str

class User(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    profile_image: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    subscription_type: str = "free"
    created_at: str

class PropertyCreate(BaseModel):
    property_type: str  # Land, Plot, Apartment, Flat, Independent House, Commercial
    title: Optional[str] = None
    price: float
    price_unit: str = "Lakhs"
    area: float
    area_unit: str
    location: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    postal_code: Optional[str] = None
    latitude: float
    longitude: float
    negotiable: bool = False
    description: Optional[str] = None
    images: List[str] = []

class Property(BaseModel):
    id: str
    user_id: str
    property_type: str
    title: Optional[str] = None
    price: float
    price_unit: str
    area: float
    area_unit: str
    location: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: str
    postal_code: Optional[str] = None
    latitude: float
    longitude: float
    negotiable: bool
    description: Optional[str] = None
    images: List[str]
    documents: List[dict] = []
    status: str = "active"
    views: int = 0
    created_at: str

class LeadCreate(BaseModel):
    property_id: str
    buyer_name: str
    buyer_phone: str
    message: Optional[str] = None

class Lead(BaseModel):
    id: str
    property_id: str
    seller_id: str
    buyer_name: str
    buyer_phone: str
    message: Optional[str] = None
    status: str = "new"  # new, contacted, hot, warm, cold, closed
    created_at: str

class FollowUpCreate(BaseModel):
    lead_id: Optional[str] = None
    contact_name: str
    contact_phone: str
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None

class FollowUp(BaseModel):
    id: str
    user_id: str
    lead_id: Optional[str] = None
    contact_name: str
    contact_phone: str
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None
    status: str = "pending"
    created_at: str

class RequirementCreate(BaseModel):
    property_type: str
    budget_min: float
    budget_max: float
    budget_unit: str = "Lakhs"
    area_min: Optional[float] = None
    area_max: Optional[float] = None
    area_unit: Optional[str] = None
    location_preference: str
    description: Optional[str] = None

class Requirement(BaseModel):
    id: str
    user_id: str
    property_type: str
    budget_min: float
    budget_max: float
    budget_unit: str
    area_min: Optional[float] = None
    area_max: Optional[float] = None
    area_unit: Optional[str] = None
    location_preference: str
    description: Optional[str] = None
    status: str = "active"
    created_at: str

class ChatMessage(BaseModel):
    step: int
    question: str
    answer: Optional[str] = None

class ConversationSession(BaseModel):
    id: str
    user_id: str
    messages: List[dict]
    property_data: dict
    status: str = "in_progress"
    created_at: str

# ================== HELPERS ==================

def generate_id():
    return str(uuid.uuid4())

def get_timestamp():
    return datetime.now(timezone.utc).isoformat()

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def create_token(user_id: str, phone: str):
    payload = {
        "user_id": user_id,
        "phone": phone,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Store OTPs temporarily (in production use Redis)
otp_store = {}

# ================== AUTH ROUTES ==================

@api_router.post("/auth/send-otp")
async def send_otp(data: UserCreate):
    otp = generate_otp()
    otp_store[data.phone] = {"otp": otp, "expires": datetime.now(timezone.utc) + timedelta(minutes=5)}
    
    # In production, send OTP via SMS provider (MSG91/Twilio)
    # For demo, return OTP in response
    return {"message": "OTP sent successfully", "demo_otp": otp}

@api_router.post("/auth/verify-otp")
async def verify_otp(data: UserLogin):
    stored = otp_store.get(data.phone)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if datetime.now(timezone.utc) > stored["expires"]:
        del otp_store[data.phone]
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if stored["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    del otp_store[data.phone]
    
    # Check if user exists
    user = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    
    if not user:
        # Create new user
        user_doc = {
            "id": generate_id(),
            "phone": data.phone,
            "name": None,
            "email": None,
            "profile_image": None,
            "latitude": None,
            "longitude": None,
            "subscription_type": "free",
            "created_at": get_timestamp()
        }
        await db.users.insert_one(user_doc)
        # Fetch back without _id to avoid ObjectId serialization
        user = await db.users.find_one({"id": user_doc["id"]}, {"_id": 0})
    
    token = create_token(user["id"], user["phone"])
    return {"token": token, "user": user}

@api_router.get("/auth/me", response_model=User)
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.put("/auth/profile")
async def update_profile(
    name: Optional[str] = None,
    email: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    user: dict = Depends(get_current_user)
):
    update_data = {}
    if name:
        update_data["name"] = name
    if email:
        update_data["email"] = email
    if latitude:
        update_data["latitude"] = latitude
    if longitude:
        update_data["longitude"] = longitude
    
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return updated_user

# ================== PROPERTY ROUTES ==================

@api_router.post("/properties", response_model=Property)
async def create_property(data: PropertyCreate, user: dict = Depends(get_current_user)):
    property_doc = {
        "id": generate_id(),
        "user_id": user["id"],
        "property_type": data.property_type,
        "title": data.title or f"{data.property_type} in {data.location}",
        "price": data.price,
        "price_unit": data.price_unit,
        "area": data.area,
        "area_unit": data.area_unit,
        "location": data.location,
        "city": data.city,
        "state": data.state,
        "country": data.country,
        "postal_code": data.postal_code,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "negotiable": data.negotiable,
        "description": data.description,
        "images": data.images,
        "documents": [],
        "status": "active",
        "views": 0,
        "created_at": get_timestamp()
    }
    await db.properties.insert_one(property_doc)
    return property_doc

@api_router.get("/properties", response_model=List[Property])
async def get_properties(
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    city: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None,
    limit: int = 50
):
    query = {"status": "active"}
    
    if property_type:
        query["property_type"] = property_type
    if min_price:
        query["price"] = {"$gte": min_price}
    if max_price:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    properties = await db.properties.find(query, {"_id": 0}).limit(limit).to_list(limit)
    
    # Distance filtering if coordinates provided
    if latitude and longitude and radius_km:
        from math import radians, cos, sin, asin, sqrt
        
        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            return 6371 * c  # Earth radius in km
        
        filtered = []
        for prop in properties:
            dist = haversine(longitude, latitude, prop["longitude"], prop["latitude"])
            if dist <= radius_km:
                prop["distance_km"] = round(dist, 2)
                filtered.append(prop)
        properties = sorted(filtered, key=lambda x: x.get("distance_km", 999))
    
    return properties

@api_router.get("/properties/my", response_model=List[Property])
async def get_my_properties(user: dict = Depends(get_current_user)):
    properties = await db.properties.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return properties

@api_router.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: str):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Increment views
    await db.properties.update_one({"id": property_id}, {"$inc": {"views": 1}})
    return prop

@api_router.put("/properties/{property_id}")
async def update_property(property_id: str, data: PropertyCreate, user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    update_data = data.model_dump()
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    return {"message": "Property updated successfully"}

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, user: dict = Depends(get_current_user)):
    result = await db.properties.delete_one({"id": property_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    return {"message": "Property deleted successfully"}

# ================== CONVERSATION POST ROUTES ==================

CHAT_QUESTIONS = [
    {"step": 0, "question": "Hello! Want to sell Land or Plot?", "field": "property_type", "options": ["Land", "Plot"]},
    {"step": 1, "question": "What is the total price?", "field": "price", "input_type": "number", "suffix_options": ["Lakhs", "Crore"]},
    {"step": 2, "question": "Enter property size", "field": "area", "input_type": "number", "suffix_options_land": ["Acres", "Guntas", "Hectare", "Cents"], "suffix_options_plot": ["Sq. Ft.", "Sq. Yards", "Sq. Meter"]},
    {"step": 3, "question": "Is it negotiable?", "field": "negotiable", "options": ["Yes", "No"]},
    {"step": 4, "question": "Choose location on map", "field": "location", "input_type": "map"}
]

@api_router.post("/conversation/start")
async def start_conversation(user: dict = Depends(get_current_user)):
    session = {
        "id": generate_id(),
        "user_id": user["id"],
        "messages": [],
        "property_data": {},
        "status": "in_progress",
        "created_at": get_timestamp()
    }
    await db.conversations.insert_one(session)
    
    return {
        "session_id": session["id"],
        "current_step": 0,
        "question": CHAT_QUESTIONS[0]
    }

class ConversationAnswer(BaseModel):
    answer: str
    step: int

@api_router.post("/conversation/{session_id}/answer")
async def answer_conversation(session_id: str, data: ConversationAnswer, user: dict = Depends(get_current_user)):
    answer = data.answer
    step = data.step
    session = await db.conversations.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Store answer
    field = CHAT_QUESTIONS[step]["field"]
    session["property_data"][field] = answer
    session["messages"].append({"step": step, "answer": answer, "timestamp": get_timestamp()})
    
    next_step = step + 1
    
    if next_step >= len(CHAT_QUESTIONS):
        session["status"] = "completed"
        await db.conversations.update_one({"id": session_id}, {"$set": session})
        return {"status": "completed", "property_data": session["property_data"]}
    
    await db.conversations.update_one({"id": session_id}, {"$set": session})
    
    question = CHAT_QUESTIONS[next_step].copy()
    # Adjust area options based on property type
    if next_step == 2:
        prop_type = session["property_data"].get("property_type", "Land")
        if prop_type == "Land":
            question["suffix_options"] = question.pop("suffix_options_land", [])
        else:
            question["suffix_options"] = question.pop("suffix_options_plot", [])
    
    return {
        "session_id": session_id,
        "current_step": next_step,
        "question": question
    }

class LocationData(BaseModel):
    latitude: float
    longitude: float
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None

@api_router.post("/conversation/{session_id}/location")
async def set_conversation_location(
    session_id: str,
    data: LocationData,
    user: dict = Depends(get_current_user)
):
    session = await db.conversations.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session["property_data"]["latitude"] = data.latitude
    session["property_data"]["longitude"] = data.longitude
    session["property_data"]["location"] = data.address
    session["property_data"]["city"] = data.city
    session["property_data"]["state"] = data.state
    session["property_data"]["postal_code"] = data.postal_code
    session["status"] = "location_set"
    
    await db.conversations.update_one({"id": session_id}, {"$set": session})
    
    return {"status": "location_set", "property_data": session["property_data"]}

@api_router.post("/conversation/{session_id}/finalize")
async def finalize_conversation(session_id: str, user: dict = Depends(get_current_user)):
    session = await db.conversations.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    data = session["property_data"]
    
    # Parse data
    price_parts = data.get("price", "0 Lakhs").split()
    price = float(price_parts[0]) if price_parts else 0
    price_unit = price_parts[1] if len(price_parts) > 1 else "Lakhs"
    
    area_parts = data.get("area", "0 Sq. Ft.").split()
    area = float(area_parts[0]) if area_parts else 0
    area_unit = " ".join(area_parts[1:]) if len(area_parts) > 1 else "Sq. Ft."
    
    property_doc = {
        "id": generate_id(),
        "user_id": user["id"],
        "property_type": data.get("property_type", "Land"),
        "title": f"{data.get('property_type', 'Property')} in {data.get('location', 'Unknown')}",
        "price": price,
        "price_unit": price_unit,
        "area": area,
        "area_unit": area_unit,
        "location": data.get("location", ""),
        "city": data.get("city"),
        "state": data.get("state"),
        "country": "India",
        "postal_code": data.get("postal_code"),
        "latitude": data.get("latitude", 0),
        "longitude": data.get("longitude", 0),
        "negotiable": data.get("negotiable", "No") == "Yes",
        "description": None,
        "images": [],
        "documents": [],
        "status": "active",
        "views": 0,
        "created_at": get_timestamp()
    }
    
    await db.properties.insert_one(property_doc)
    session["status"] = "finalized"
    session["property_id"] = property_doc["id"]
    await db.conversations.update_one({"id": session_id}, {"$set": session})
    
    return {"message": "Property created successfully", "property": property_doc}

# ================== LEADS ROUTES ==================

@api_router.post("/leads", response_model=Lead)
async def create_lead(data: LeadCreate):
    prop = await db.properties.find_one({"id": data.property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    lead = {
        "id": generate_id(),
        "property_id": data.property_id,
        "seller_id": prop["user_id"],
        "buyer_name": data.buyer_name,
        "buyer_phone": data.buyer_phone,
        "message": data.message,
        "status": "new",
        "created_at": get_timestamp()
    }
    await db.leads.insert_one(lead)
    return lead

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(user: dict = Depends(get_current_user)):
    leads = await db.leads.find({"seller_id": user["id"]}, {"_id": 0}).to_list(100)
    return leads

@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, user: dict = Depends(get_current_user)):
    result = await db.leads.update_one(
        {"id": lead_id, "seller_id": user["id"]},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Status updated"}

# ================== FOLLOW-UPS ROUTES ==================

@api_router.post("/followups", response_model=FollowUp)
async def create_followup(data: FollowUpCreate, user: dict = Depends(get_current_user)):
    followup = {
        "id": generate_id(),
        "user_id": user["id"],
        "lead_id": data.lead_id,
        "contact_name": data.contact_name,
        "contact_phone": data.contact_phone,
        "notes": data.notes,
        "next_follow_up": data.next_follow_up,
        "status": "pending",
        "created_at": get_timestamp()
    }
    await db.followups.insert_one(followup)
    return followup

@api_router.get("/followups", response_model=List[FollowUp])
async def get_followups(user: dict = Depends(get_current_user)):
    followups = await db.followups.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return followups

@api_router.put("/followups/{followup_id}")
async def update_followup(
    followup_id: str,
    notes: Optional[str] = None,
    status: Optional[str] = None,
    next_follow_up: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    update_data = {}
    if notes:
        update_data["notes"] = notes
    if status:
        update_data["status"] = status
    if next_follow_up:
        update_data["next_follow_up"] = next_follow_up
    
    result = await db.followups.update_one(
        {"id": followup_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return {"message": "Follow-up updated"}

# ================== FAVORITES ROUTES ==================

@api_router.post("/favorites/{property_id}")
async def add_favorite(property_id: str, user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "property_id": property_id})
    if existing:
        return {"message": "Already in favorites"}
    
    await db.favorites.insert_one({
        "id": generate_id(),
        "user_id": user["id"],
        "property_id": property_id,
        "created_at": get_timestamp()
    })
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{property_id}")
async def remove_favorite(property_id: str, user: dict = Depends(get_current_user)):
    await db.favorites.delete_one({"user_id": user["id"], "property_id": property_id})
    return {"message": "Removed from favorites"}

@api_router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    property_ids = [f["property_id"] for f in favorites]
    properties = await db.properties.find({"id": {"$in": property_ids}}, {"_id": 0}).to_list(100)
    return properties

# ================== REQUIREMENTS ROUTES ==================

@api_router.post("/requirements", response_model=Requirement)
async def create_requirement(data: RequirementCreate, user: dict = Depends(get_current_user)):
    requirement = {
        "id": generate_id(),
        "user_id": user["id"],
        "property_type": data.property_type,
        "budget_min": data.budget_min,
        "budget_max": data.budget_max,
        "budget_unit": data.budget_unit,
        "area_min": data.area_min,
        "area_max": data.area_max,
        "area_unit": data.area_unit,
        "location_preference": data.location_preference,
        "description": data.description,
        "status": "active",
        "created_at": get_timestamp()
    }
    await db.requirements.insert_one(requirement)
    return requirement

@api_router.get("/requirements", response_model=List[Requirement])
async def get_requirements(user: dict = Depends(get_current_user)):
    requirements = await db.requirements.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return requirements

@api_router.get("/requirements/all", response_model=List[Requirement])
async def get_all_requirements():
    requirements = await db.requirements.find({"status": "active"}, {"_id": 0}).to_list(100)
    return requirements

# ================== DOCUMENTS ROUTES ==================

DOCUMENT_TYPES = [
    {"id": "sale_deed", "name": "Sale Deed", "icon": "file-text"},
    {"id": "ec", "name": "Encumbrance Certificate", "icon": "shield"},
    {"id": "pattadar_passbook", "name": "Pattadar Passbook", "icon": "book"},
    {"id": "mutation", "name": "Mutation Certificate", "icon": "file-check"},
    {"id": "layout_plan", "name": "Layout Plan", "icon": "map"},
    {"id": "approval", "name": "Approval Documents", "icon": "check-circle"},
    {"id": "tax_receipt", "name": "Tax Receipts", "icon": "receipt"},
    {"id": "other", "name": "Other Documents", "icon": "file"},
]

@api_router.get("/document-types")
async def get_document_types():
    return DOCUMENT_TYPES

@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # Validate file type
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    # Max file size: 10MB
    max_size = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Generate unique filename
    file_id = generate_id()
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Store file metadata in DB
    file_doc = {
        "id": file_id,
        "user_id": user["id"],
        "original_name": file.filename,
        "stored_name": filename,
        "file_type": file_ext,
        "size": len(contents),
        "created_at": get_timestamp()
    }
    await db.files.insert_one(file_doc)
    
    return {
        "id": file_id,
        "filename": file.filename,
        "url": f"/api/files/{file_id}",
        "size": len(contents)
    }

@api_router.get("/files/{file_id}")
async def get_file(file_id: str):
    file_doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = UPLOAD_DIR / file_doc["stored_name"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=file_path,
        filename=file_doc["original_name"],
        media_type="application/octet-stream"
    )

@api_router.post("/properties/{property_id}/documents")
async def add_document(
    property_id: str,
    doc_type: str = Form(...),
    doc_name: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    prop = await db.properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    # Upload file
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    contents = await file.read()
    max_size = 10 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    file_id = generate_id()
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Store file metadata
    file_doc = {
        "id": file_id,
        "user_id": user["id"],
        "property_id": property_id,
        "original_name": file.filename,
        "stored_name": filename,
        "file_type": file_ext,
        "size": len(contents),
        "created_at": get_timestamp()
    }
    await db.files.insert_one(file_doc)
    
    # Add document reference to property
    doc = {
        "id": generate_id(),
        "file_id": file_id,
        "type": doc_type,
        "name": doc_name,
        "original_filename": file.filename,
        "url": f"/api/files/{file_id}",
        "size": len(contents),
        "uploaded_at": get_timestamp()
    }
    
    await db.properties.update_one(
        {"id": property_id},
        {"$push": {"documents": doc}}
    )
    return {"message": "Document added", "document": doc}

@api_router.delete("/properties/{property_id}/documents/{doc_id}")
async def delete_document(
    property_id: str,
    doc_id: str,
    user: dict = Depends(get_current_user)
):
    prop = await db.properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    # Find and remove document from property
    doc_to_delete = None
    for doc in prop.get("documents", []):
        if doc.get("id") == doc_id:
            doc_to_delete = doc
            break
    
    if not doc_to_delete:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from disk if exists
    if doc_to_delete.get("file_id"):
        file_doc = await db.files.find_one({"id": doc_to_delete["file_id"]})
        if file_doc:
            file_path = UPLOAD_DIR / file_doc["stored_name"]
            if file_path.exists():
                file_path.unlink()
            await db.files.delete_one({"id": doc_to_delete["file_id"]})
    
    # Remove from property documents
    await db.properties.update_one(
        {"id": property_id},
        {"$pull": {"documents": {"id": doc_id}}}
    )
    
    return {"message": "Document deleted successfully"}

@api_router.get("/properties/{property_id}/documents")
async def get_property_documents(property_id: str):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return prop.get("documents", [])

# ================== VOICE TRANSCRIPTION ROUTES ==================

@api_router.post("/voice/transcribe")
async def transcribe_voice(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Transcribe voice recording to text using OpenAI Whisper"""
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Voice service unavailable")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=503, detail="Voice service not configured")
    
    # Validate file type
    allowed_types = {'.mp3', '.wav', '.webm', '.m4a', '.mp4', '.mpeg', '.mpga'}
    file_ext = Path(audio.filename).suffix.lower()
    if file_ext not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Audio format not supported. Use: {', '.join(allowed_types)}")
    
    # Read and save to temp file
    contents = await audio.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")
    
    try:
        # Write to temp file
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        # Transcribe
        stt = OpenAISpeechToText(api_key=api_key)
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en",
                prompt="This is a real estate property description including property type, price, area, location details."
            )
        
        # Cleanup
        os.unlink(tmp_path)
        
        return {
            "text": response.text,
            "success": True
        }
    except Exception as e:
        logging.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# ================== AI AREA INTELLIGENCE ROUTES ==================

@api_router.post("/ai/area-intelligence")
async def get_area_intelligence(
    latitude: float = Form(...),
    longitude: float = Form(...),
    location: str = Form(...),
    property_type: str = Form(None),
    user: dict = Depends(get_current_user)
):
    """Get AI-powered area intelligence for a location"""
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"area-intel-{user['id']}-{generate_id()}",
            system_message="""You are a real estate area intelligence expert for India. 
            Provide helpful, practical insights about property locations.
            Be concise but informative. Use bullet points where appropriate.
            Focus on: growth potential, nearby amenities, connectivity, investment outlook.
            If you don't have specific data, provide general guidance based on the area type."""
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Analyze this property location in India:
Location: {location}
Coordinates: {latitude}, {longitude}
Property Type: {property_type or 'General'}

Provide a brief area intelligence report with:
1. **Area Overview** (2-3 sentences)
2. **Growth Potential** (High/Medium/Low with reason)
3. **Key Amenities Nearby** (schools, hospitals, markets, transport)
4. **Investment Outlook** (1-2 sentences)
5. **Price Trend** (estimated appreciation potential)

Keep response concise and practical for a real estate buyer/seller."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "intelligence": response,
            "location": location,
            "success": True
        }
    except Exception as e:
        logging.error(f"AI Intelligence error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

# ================== IMAGE UPLOAD ROUTES ==================

@api_router.post("/properties/{property_id}/images")
async def upload_property_image(
    property_id: str,
    image: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload image to property gallery"""
    prop = await db.properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    # Validate image type
    allowed_types = {'.jpg', '.jpeg', '.png', '.webp'}
    file_ext = Path(image.filename).suffix.lower()
    if file_ext not in allowed_types:
        raise HTTPException(status_code=400, detail="Image type not allowed. Use: JPG, PNG, WEBP")
    
    # Read image
    contents = await image.read()
    max_size = 10 * 1024 * 1024  # 10MB
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")
    
    # Generate unique filename
    file_id = generate_id()
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Store metadata
    image_url = f"/api/files/{file_id}"
    
    file_doc = {
        "id": file_id,
        "user_id": user["id"],
        "property_id": property_id,
        "original_name": image.filename,
        "stored_name": filename,
        "file_type": file_ext,
        "size": len(contents),
        "created_at": get_timestamp()
    }
    await db.files.insert_one(file_doc)
    
    # Add to property images array
    await db.properties.update_one(
        {"id": property_id},
        {"$push": {"images": image_url}}
    )
    
    return {
        "url": image_url,
        "id": file_id,
        "success": True
    }

@api_router.delete("/properties/{property_id}/images/{image_id}")
async def delete_property_image(
    property_id: str,
    image_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete image from property gallery"""
    prop = await db.properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    # Find and remove image
    image_url = f"/api/files/{image_id}"
    
    # Delete file from disk
    file_doc = await db.files.find_one({"id": image_id})
    if file_doc:
        file_path = UPLOAD_DIR / file_doc["stored_name"]
        if file_path.exists():
            file_path.unlink()
        await db.files.delete_one({"id": image_id})
    
    # Remove from property images
    await db.properties.update_one(
        {"id": property_id},
        {"$pull": {"images": image_url}}
    )
    
    return {"message": "Image deleted successfully"}

# ================== STATS ROUTES ==================

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    properties_count = await db.properties.count_documents({"user_id": user["id"]})
    leads_count = await db.leads.count_documents({"seller_id": user["id"]})
    followups_count = await db.followups.count_documents({"user_id": user["id"]})
    favorites_count = await db.favorites.count_documents({"user_id": user["id"]})
    
    return {
        "properties": properties_count,
        "leads": leads_count,
        "followups": followups_count,
        "favorites": favorites_count
    }

# ================== ROOT ==================

@api_router.get("/")
async def root():
    return {"message": "Incomelands 2.0 API", "version": "2.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
