"""
AgentApex Backend Router
Property management mobile app APIs - integrated from incomelands-app repo
Prefix: /api/agentapex
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import random
import string
import os
import logging
from pathlib import Path
import tempfile

# Create router with prefix
router = APIRouter(prefix="/agentapex", tags=["AgentApex"])
security = HTTPBearer(auto_error=False)

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'agentapex-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Upload directory
UPLOAD_DIR = Path("/app/backend/uploads/agentapex")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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
    designation: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    subscription_type: str = "free"
    created_at: str

class PropertyCreate(BaseModel):
    property_type: str
    title: Optional[str] = None
    price: float = 0
    price_unit: str = "Lakhs"
    area: float = 0
    area_unit: str = "Sq.Yds"
    location: str = ""
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    negotiable: bool = False
    description: Optional[str] = None
    images: List[str] = []
    notes: Optional[List[dict]] = None
    youtube_videos: Optional[List[str]] = None

class PropertyUpdate(BaseModel):
    """Model for partial property updates - all fields optional"""
    property_type: Optional[str] = None
    title: Optional[str] = None
    price: Optional[float] = None
    price_unit: Optional[str] = None
    area: Optional[float] = None
    area_unit: Optional[str] = None
    location: Optional[str] = None
    location_text: Optional[str] = None
    place_id: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    negotiable: Optional[bool] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    notes: Optional[List[dict]] = None
    youtube_videos: Optional[List[str]] = None

class Property(BaseModel):
    id: str
    user_id: str
    property_id: Optional[str] = None
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    negotiable: bool
    description: Optional[str] = None
    images: List[str] = []
    documents: List[dict] = []
    cover_image_index: int = 0
    status: str = "active"
    views: int = 0
    created_at: str
    notes: Optional[List[dict]] = None
    youtube_videos: Optional[List[str]] = None

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
    status: str = "new"
    created_at: str

class FollowUpCreate(BaseModel):
    lead_id: Optional[str] = None
    contact_name: str
    contact_phone: str
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None
    location: Optional[str] = None

class FollowUp(BaseModel):
    id: str
    user_id: str
    lead_id: Optional[str] = None
    contact_name: str
    contact_phone: str
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None
    status: str = "pending"
    location: Optional[str] = None
    updated_at: Optional[str] = None
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None

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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "active"
    created_at: str

class ConversationAnswer(BaseModel):
    answer: str
    step: int

class LocationData(BaseModel):
    latitude: float
    longitude: float
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None

# ================== HELPERS ==================

def generate_id():
    return str(uuid.uuid4())

def get_timestamp():
    return datetime.now(timezone.utc).isoformat()

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

# Property type code mapping for Property ID
PROPERTY_TYPE_CODES = {
    "Plot": "P", "Land": "P",
    "Villa": "V",
    "Apartment": "A", "Flat": "A",
    "Commercial": "C", "Shop": "C", "Office": "C",
    "Farm": "F", "Farm Land": "F", "Farmland": "F", "Agricultural": "F",
    "House": "H", "Independent House": "H",
}

async def generate_property_id(db, property_type: str) -> str:
    """Generate unique property ID like AX-P-10001"""
    type_code = PROPERTY_TYPE_CODES.get(property_type, "P")
    counter = await db.agentapex_counters.find_one_and_update(
        {"_id": "property_id_counter"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    seq = counter.get("seq", 10001)
    if seq < 10001:
        await db.agentapex_counters.update_one(
            {"_id": "property_id_counter"},
            {"$set": {"seq": 10001}}
        )
        seq = 10001
    return f"AX-{type_code}-{seq}"

def create_token(user_id: str, phone: str):
    payload = {
        "user_id": user_id,
        "phone": phone,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        db = request.app.state.db
        user = await db.agentapex_users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Store OTPs temporarily
otp_store = {}

# Chat questions for conversation flow
CHAT_QUESTIONS = [
    {"step": 0, "question": "Hello! Want to sell Land or Plot?", "field": "property_type", "options": ["Land", "Plot"]},
    {"step": 1, "question": "What is the total price?", "field": "price", "input_type": "number", "suffix_options": ["Lakhs", "Crore"]},
    {"step": 2, "question": "Enter property size", "field": "area", "input_type": "number", "suffix_options_land": ["Acres", "Guntas", "Hectare", "Cents"], "suffix_options_plot": ["Sq. Ft.", "Sq. Yards", "Sq. Meter"]},
    {"step": 3, "question": "Is it negotiable?", "field": "negotiable", "options": ["Yes", "No"]},
    {"step": 4, "question": "Choose location on map", "field": "location", "input_type": "map"}
]

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

# ================== AUTH ROUTES ==================

@router.post("/auth/send-otp")
async def send_otp(data: UserCreate):
    otp = generate_otp()
    otp_store[data.phone] = {"otp": otp, "expires": datetime.now(timezone.utc) + timedelta(minutes=5)}
    # In production, send OTP via SMS provider
    return {"message": "OTP sent successfully", "demo_otp": otp}

@router.post("/auth/verify-otp")
async def verify_otp(request: Request, data: UserLogin):
    stored = otp_store.get(data.phone)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if datetime.now(timezone.utc) > stored["expires"]:
        del otp_store[data.phone]
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if stored["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    del otp_store[data.phone]
    
    db = request.app.state.db
    user = await db.agentapex_users.find_one({"phone": data.phone}, {"_id": 0})
    
    if not user:
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
        await db.agentapex_users.insert_one(user_doc)
        user = await db.agentapex_users.find_one({"id": user_doc["id"]}, {"_id": 0})
    
    token = create_token(user["id"], user["phone"])
    return {"token": token, "user": user}

@router.get("/auth/me", response_model=User)
async def get_me(user: dict = Depends(get_current_user)):
    return user

@router.put("/auth/profile")
async def update_profile(
    request: Request,
    name: Optional[str] = None,
    email: Optional[str] = None,
    designation: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    user: dict = Depends(get_current_user)
):
    db = request.app.state.db
    update_data = {}
    if name:
        update_data["name"] = name
    if email:
        update_data["email"] = email
    if designation is not None:
        update_data["designation"] = designation
    if latitude:
        update_data["latitude"] = latitude
    if longitude:
        update_data["longitude"] = longitude
    
    if update_data:
        await db.agentapex_users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.agentapex_users.find_one({"id": user["id"]}, {"_id": 0})
    return updated_user

@router.post("/auth/profile-image")
async def upload_profile_image(
    request: Request,
    image: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload profile photo using Object Storage"""
    db = request.app.state.db
    
    allowed_types = {'.jpg', '.jpeg', '.png', '.webp'}
    file_ext = Path(image.filename).suffix.lower()
    if file_ext not in allowed_types:
        raise HTTPException(status_code=400, detail="Image type not allowed. Use: JPG, PNG, WEBP")
    
    contents = await image.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit")
    
    file_id = generate_id()
    filename = f"{file_id}{file_ext}"
    
    # Save locally first
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Save to object storage for persistence
    try:
        from services.object_storage import put_object
        content_type = f"image/{file_ext.strip('.')}"
        if file_ext == '.jpg':
            content_type = "image/jpeg"
        put_object(f"agentapex/profiles/{filename}", contents, content_type)
    except Exception as e:
        logging.warning(f"Object storage upload failed: {e}")
    
    # Save file record
    file_doc = {
        "id": file_id,
        "user_id": user["id"],
        "original_name": image.filename,
        "stored_name": filename,
        "file_type": file_ext,
        "size": len(contents),
        "created_at": get_timestamp()
    }
    await db.agentapex_files.insert_one(file_doc)
    
    image_url = f"/api/agentapex/files/{file_id}"
    
    # Update user profile
    await db.agentapex_users.update_one(
        {"id": user["id"]},
        {"$set": {"profile_image": image_url}}
    )
    
    return {"url": image_url, "success": True}

# ================== PROPERTY ROUTES ==================

@router.post("/properties", response_model=Property)
async def create_property(request: Request, data: PropertyCreate, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    prop_id = await generate_property_id(db, data.property_type)
    property_doc = {
        "id": generate_id(),
        "user_id": user["id"],
        "property_id": prop_id,
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
        "cover_image_index": 0,
        "status": "active",
        "views": 0,
        "created_at": get_timestamp()
    }
    await db.agentapex_properties.insert_one(property_doc)
    property_doc.pop("_id", None)
    
    # Notify users with matching interest areas
    try:
        await notify_interested_users(db, property_doc)
    except Exception as e:
        print(f"Error notifying users: {e}")
    
    return property_doc

@router.get("/properties", response_model=List[Property])
async def get_properties(
    request: Request,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    city: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None,
    limit: int = 50
):
    db = request.app.state.db
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
    
    properties = await db.agentapex_properties.find(query, {"_id": 0}).limit(limit).to_list(limit)
    
    if latitude and longitude and radius_km:
        from math import radians, cos, sin, asin, sqrt
        
        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            return 6371 * c
        
        filtered = []
        for prop in properties:
            # Skip properties without valid coordinates
            if prop.get("latitude") is None or prop.get("longitude") is None:
                continue
            if prop["latitude"] == 0 and prop["longitude"] == 0:
                continue
            dist = haversine(longitude, latitude, prop["longitude"], prop["latitude"])
            if dist <= radius_km:
                prop["distance_km"] = round(dist, 2)
                filtered.append(prop)
        properties = sorted(filtered, key=lambda x: x.get("distance_km", 999))
    
    return properties

@router.get("/properties/my", response_model=List[Property])
async def get_my_properties(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    properties = await db.agentapex_properties.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return properties

@router.get("/properties/search-by-id")
async def search_property_by_id(request: Request, property_id: str):
    """Search property by AX-P-10001 format ID"""
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    await db.agentapex_properties.update_one({"property_id": property_id}, {"$inc": {"views": 1}})
    
    # Get agent info
    agent = await db.agentapex_users.find_one({"id": prop["user_id"]}, {"_id": 0})
    
    return {
        "property": prop,
        "agent": {
            "name": agent.get("name", "Agent") if agent else "Agent",
            "designation": agent.get("designation", "AgentApex Property Advisor") if agent else "AgentApex Property Advisor",
            "profile_image": agent.get("profile_image") if agent else None
        }
    }

@router.get("/properties/{property_id}")
async def get_property(request: Request, property_id: str):
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    await db.agentapex_properties.update_one({"id": property_id}, {"$inc": {"views": 1}})
    return prop

@router.put("/properties/{property_id}")
async def update_property(request: Request, property_id: str, data: PropertyUpdate, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    # Only update fields that are provided (not None)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.agentapex_properties.update_one({"id": property_id}, {"$set": update_data})
    return {"message": "Property updated successfully"}

@router.put("/properties/{property_id}/cover-image")
async def set_cover_image(request: Request, property_id: str, index: int = 0, user: dict = Depends(get_current_user)):
    """Set cover image by index"""
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    images = prop.get("images", [])
    if index < 0 or index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")
    
    await db.agentapex_properties.update_one(
        {"id": property_id},
        {"$set": {"cover_image_index": index}}
    )
    return {"message": "Cover image set", "cover_image_index": index}

@router.put("/properties/{property_id}/reorder-images")
async def reorder_images(request: Request, property_id: str, user: dict = Depends(get_current_user)):
    """Reorder property images"""
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    body = await request.json()
    new_order = body.get("images", [])
    
    await db.agentapex_properties.update_one(
        {"id": property_id},
        {"$set": {"images": new_order, "cover_image_index": 0}}
    )
    return {"message": "Images reordered", "images": new_order}

@router.delete("/properties/{property_id}/images/{image_index}")
async def delete_property_image(request: Request, property_id: str, image_index: int, user: dict = Depends(get_current_user)):
    """Delete a single image from property"""
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    images = prop.get("images", [])
    if image_index < 0 or image_index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")
    
    images.pop(image_index)
    cover_idx = prop.get("cover_image_index", 0)
    if cover_idx >= len(images):
        cover_idx = 0
    
    await db.agentapex_properties.update_one(
        {"id": property_id},
        {"$set": {"images": images, "cover_image_index": cover_idx}}
    )
    return {"message": "Image deleted", "images": images}

@router.delete("/properties/{property_id}")
async def delete_property(request: Request, property_id: str, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    result = await db.agentapex_properties.delete_one({"id": property_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    return {"message": "Property deleted successfully"}

# ================== CONVERSATION POST ROUTES ==================

@router.post("/conversation/start")
async def start_conversation(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    session = {
        "id": generate_id(),
        "user_id": user["id"],
        "messages": [],
        "property_data": {},
        "status": "in_progress",
        "created_at": get_timestamp()
    }
    await db.agentapex_conversations.insert_one(session)
    
    return {
        "session_id": session["id"],
        "current_step": 0,
        "question": CHAT_QUESTIONS[0]
    }

@router.post("/conversation/{session_id}/answer")
async def answer_conversation(request: Request, session_id: str, data: ConversationAnswer, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    answer = data.answer
    step = data.step
    session = await db.agentapex_conversations.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    field = CHAT_QUESTIONS[step]["field"]
    session["property_data"][field] = answer
    session["messages"].append({"step": step, "answer": answer, "timestamp": get_timestamp()})
    
    next_step = step + 1
    
    if next_step >= len(CHAT_QUESTIONS):
        session["status"] = "completed"
        await db.agentapex_conversations.update_one({"id": session_id}, {"$set": session})
        return {"status": "completed", "property_data": session["property_data"]}
    
    await db.agentapex_conversations.update_one({"id": session_id}, {"$set": session})
    
    question = CHAT_QUESTIONS[next_step].copy()
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

@router.post("/conversation/{session_id}/location")
async def set_conversation_location(request: Request, session_id: str, data: LocationData, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    session = await db.agentapex_conversations.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session["property_data"]["latitude"] = data.latitude
    session["property_data"]["longitude"] = data.longitude
    session["property_data"]["location"] = data.address
    session["property_data"]["city"] = data.city
    session["property_data"]["state"] = data.state
    session["property_data"]["postal_code"] = data.postal_code
    session["status"] = "location_set"
    
    await db.agentapex_conversations.update_one({"id": session_id}, {"$set": session})
    
    return {"status": "location_set", "property_data": session["property_data"]}

@router.post("/conversation/{session_id}/finalize")
async def finalize_conversation(request: Request, session_id: str, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    session = await db.agentapex_conversations.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    data = session["property_data"]
    
    price_parts = data.get("price", "0 Lakhs").split()
    price = float(price_parts[0]) if price_parts else 0
    price_unit = price_parts[1] if len(price_parts) > 1 else "Lakhs"
    
    area_parts = data.get("area", "0 Sq. Ft.").split()
    area = float(area_parts[0]) if area_parts else 0
    area_unit = " ".join(area_parts[1:]) if len(area_parts) > 1 else "Sq. Ft."
    
    prop_id = await generate_property_id(db, data.get("property_type", "Land"))
    property_doc = {
        "id": generate_id(),
        "user_id": user["id"],
        "property_id": prop_id,
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
        "cover_image_index": 0,
        "status": "active",
        "views": 0,
        "created_at": get_timestamp()
    }
    
    await db.agentapex_properties.insert_one(property_doc)
    property_doc.pop("_id", None)
    session["status"] = "finalized"
    session["property_id"] = property_doc["id"]
    await db.agentapex_conversations.update_one({"id": session_id}, {"$set": session})
    
    return {"message": "Property created successfully", "property": property_doc}

# ================== LEADS ROUTES ==================

@router.post("/leads")
async def create_lead(request: Request, data: LeadCreate):
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": data.property_id}, {"_id": 0})
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
        "lead_source": "enquiry",
        "created_at": get_timestamp()
    }
    await db.agentapex_leads.insert_one(lead)
    # Remove _id before returning
    lead.pop("_id", None)
    return lead

@router.get("/leads")
async def get_leads(request: Request, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    query = {"seller_id": user["id"]}
    if status:
        query["status"] = status
    
    leads = await db.agentapex_leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Enrich with property info
    property_ids = list(set(lead.get("property_id") for lead in leads if lead.get("property_id")))
    properties = {}
    if property_ids:
        props = await db.agentapex_properties.find({"id": {"$in": property_ids}}, {"_id": 0}).to_list(len(property_ids))
        properties = {p["id"]: p for p in props}
    
    for lead in leads:
        prop = properties.get(lead.get("property_id"), {})
        lead["property_type"] = prop.get("property_type", "")
        lead["property_location"] = prop.get("location", "")
        lead["property_price"] = prop.get("price", 0)
        lead["property_price_unit"] = prop.get("price_unit", "Lakhs")
    
    return leads

@router.put("/leads/{lead_id}/status")
async def update_lead_status(request: Request, lead_id: str, status: str, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    result = await db.agentapex_leads.update_one(
        {"id": lead_id, "seller_id": user["id"]},
        {"$set": {"status": status, "updated_at": get_timestamp()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Status updated"}

@router.get("/leads/stats")
async def get_lead_stats(request: Request, user: dict = Depends(get_current_user)):
    """Get lead pipeline stats"""
    db = request.app.state.db
    pipeline = [
        {"$match": {"seller_id": user["id"]}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = await db.agentapex_leads.aggregate(pipeline).to_list(20)
    stats = {r["_id"]: r["count"] for r in results}
    return {
        "total": sum(stats.values()),
        "new": stats.get("new", 0),
        "contacted": stats.get("contacted", 0),
        "hot": stats.get("hot", 0),
        "warm": stats.get("warm", 0),
        "cold": stats.get("cold", 0),
        "closed": stats.get("closed", 0)
    }

# ================== SHARE DATA ROUTES ==================

@router.post("/migrate/property-ids")
async def migrate_property_ids(request: Request):
    """One-time migration: assign property_id to existing properties that don't have one"""
    db = request.app.state.db
    props = await db.agentapex_properties.find(
        {"$or": [{"property_id": {"$exists": False}}, {"property_id": None}]},
        {"_id": 0, "id": 1, "property_type": 1}
    ).to_list(1000)
    
    count = 0
    for prop in props:
        prop_id = await generate_property_id(db, prop.get("property_type", "Land"))
        await db.agentapex_properties.update_one(
            {"id": prop["id"]},
            {"$set": {"property_id": prop_id}}
        )
        count += 1
    
    return {"message": f"Migrated {count} properties", "count": count}

@router.get("/properties/{property_id}/share-data")
async def get_share_data(request: Request, property_id: str, user: dict = Depends(get_current_user)):
    """Get property + agent info for generating share cards"""
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    agent = await db.agentapex_users.find_one({"id": user["id"]}, {"_id": 0})
    
    return {
        "property": {
            "id": prop["id"],
            "property_id": prop.get("property_id", ""),
            "type": prop.get("property_type", ""),
            "price": prop.get("price", 0),
            "price_unit": prop.get("price_unit", "Lakhs"),
            "area": prop.get("area", 0),
            "area_unit": prop.get("area_unit", ""),
            "location": prop.get("location", ""),
            "negotiable": prop.get("negotiable", False),
            "images": prop.get("images", []),
            "cover_image_index": prop.get("cover_image_index", 0),
            "description": prop.get("description", "")
        },
        "agent": {
            "name": agent.get("name", "Agent"),
            "phone": agent.get("phone", ""),
            "profile_image": agent.get("profile_image"),
            "designation": agent.get("designation", "AgentApex Property Advisor")
        }
    }

# ================== FOLLOW-UPS ROUTES ==================

@router.post("/followups", response_model=FollowUp)
async def create_followup(request: Request, data: FollowUpCreate, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    followup = {
        "id": generate_id(),
        "user_id": user["id"],
        "lead_id": data.lead_id,
        "contact_name": data.contact_name,
        "contact_phone": data.contact_phone,
        "notes": data.notes,
        "next_follow_up": data.next_follow_up,
        "location": data.location,
        "status": "pending",
        "hidden": False,
        "updated_at": None,
        "created_at": get_timestamp()
    }
    await db.agentapex_followups.insert_one(followup)
    return followup

@router.post("/followups/bulk")
async def bulk_create_followups(request: Request, user: dict = Depends(get_current_user)):
    """Add multiple contacts to followup list at once"""
    db = request.app.state.db
    body = await request.json()
    contacts = body.get("contacts", [])
    
    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts provided")
    
    created = []
    for c in contacts:
        if not c.get("contact_name") or not c.get("contact_phone"):
            continue
        # Check if already exists
        existing = await db.agentapex_followups.find_one({
            "user_id": user["id"],
            "contact_phone": c["contact_phone"],
            "hidden": {"$ne": True}
        })
        if existing:
            continue
        
        followup = {
            "id": generate_id(),
            "user_id": user["id"],
            "lead_id": c.get("lead_id"),
            "contact_name": c["contact_name"],
            "contact_phone": c["contact_phone"],
            "notes": c.get("notes", ""),
            "next_follow_up": c.get("next_follow_up"),
            "location": c.get("location", ""),
            "status": "pending",
            "hidden": False,
            "updated_at": None,
            "created_at": get_timestamp()
        }
        await db.agentapex_followups.insert_one(followup)
        created.append(followup)
    
    return {"message": f"{len(created)} contact(s) added", "contacts": [{k: v for k, v in c.items() if k != '_id'} for c in created]}

@router.get("/followups")
async def get_followups(
    request: Request,
    search: Optional[str] = None,
    hidden: Optional[bool] = False,
    user: dict = Depends(get_current_user)
):
    db = request.app.state.db
    query = {"user_id": user["id"]}
    
    if hidden:
        query["hidden"] = True
    else:
        query["$or"] = [{"hidden": False}, {"hidden": {"$exists": False}}]
    
    if search:
        query["$or"] = [
            {"contact_name": {"$regex": search, "$options": "i"}},
            {"contact_phone": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}}
        ]
        # Remove the hidden filter from $or if search is active - show both
        if hidden:
            query.pop("hidden", None)
        else:
            query.pop("$or", None)
            query["$and"] = [
                {"$or": [{"hidden": False}, {"hidden": {"$exists": False}}]},
                {"$or": [
                    {"contact_name": {"$regex": search, "$options": "i"}},
                    {"contact_phone": {"$regex": search, "$options": "i"}},
                    {"location": {"$regex": search, "$options": "i"}}
                ]}
            ]
    
    followups = await db.agentapex_followups.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return followups

@router.put("/followups/{followup_id}")
async def update_followup(
    request: Request,
    followup_id: str,
    notes: Optional[str] = None,
    status: Optional[str] = None,
    next_follow_up: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = request.app.state.db
    update_data = {"updated_at": get_timestamp()}
    if notes is not None:
        update_data["notes"] = notes
    if status:
        update_data["status"] = status
    if next_follow_up is not None:
        update_data["next_follow_up"] = next_follow_up
    
    result = await db.agentapex_followups.update_one(
        {"id": followup_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return {"message": "Follow-up updated"}

@router.put("/followups/{followup_id}/toggle-hidden")
async def toggle_followup_hidden(
    request: Request,
    followup_id: str,
    user: dict = Depends(get_current_user)
):
    """Move contact between Active and Hidden tabs"""
    db = request.app.state.db
    followup = await db.agentapex_followups.find_one({"id": followup_id, "user_id": user["id"]})
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    new_hidden = not followup.get("hidden", False)
    await db.agentapex_followups.update_one(
        {"id": followup_id},
        {"$set": {"hidden": new_hidden, "updated_at": get_timestamp()}}
    )
    return {"message": "Moved to Hidden" if new_hidden else "Moved to Active", "hidden": new_hidden}

@router.delete("/followups/{followup_id}")
async def delete_followup(
    request: Request,
    followup_id: str,
    user: dict = Depends(get_current_user)
):
    db = request.app.state.db
    result = await db.agentapex_followups.delete_one({"id": followup_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return {"message": "Follow-up deleted"}

# ================== FAVORITES ROUTES ==================

@router.post("/favorites/{property_id}")
async def add_favorite(request: Request, property_id: str, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    existing = await db.agentapex_favorites.find_one({"user_id": user["id"], "property_id": property_id})
    if existing:
        return {"message": "Already in favorites"}
    
    await db.agentapex_favorites.insert_one({
        "id": generate_id(),
        "user_id": user["id"],
        "property_id": property_id,
        "created_at": get_timestamp()
    })
    return {"message": "Added to favorites"}

@router.delete("/favorites/{property_id}")
async def remove_favorite(request: Request, property_id: str, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    await db.agentapex_favorites.delete_one({"user_id": user["id"], "property_id": property_id})
    return {"message": "Removed from favorites"}

@router.get("/favorites")
async def get_favorites(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    favorites = await db.agentapex_favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    property_ids = [f["property_id"] for f in favorites]
    properties = await db.agentapex_properties.find({"id": {"$in": property_ids}}, {"_id": 0}).to_list(100)
    return properties

# ================== REQUIREMENTS ROUTES ==================

@router.post("/requirements", response_model=Requirement)
async def create_requirement(request: Request, data: RequirementCreate, user: dict = Depends(get_current_user)):
    db = request.app.state.db
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
        "latitude": data.latitude,
        "longitude": data.longitude,
        "status": "active",
        "created_at": get_timestamp()
    }
    await db.agentapex_requirements.insert_one(requirement)
    return requirement

@router.get("/requirements", response_model=List[Requirement])
async def get_requirements(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    requirements = await db.agentapex_requirements.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return requirements

@router.get("/requirements/all", response_model=List[Requirement])
async def get_all_requirements(request: Request):
    db = request.app.state.db
    requirements = await db.agentapex_requirements.find({"status": "active"}, {"_id": 0}).to_list(100)
    return requirements

# ================== DOCUMENTS ROUTES ==================

@router.get("/document-types")
async def get_document_types():
    return DOCUMENT_TYPES

@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    db = request.app.state.db
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    max_size = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    file_id = generate_id()
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    file_doc = {
        "id": file_id,
        "user_id": user["id"],
        "original_name": file.filename,
        "stored_name": filename,
        "file_type": file_ext,
        "size": len(contents),
        "created_at": get_timestamp()
    }
    await db.agentapex_files.insert_one(file_doc)
    
    return {
        "id": file_id,
        "filename": file.filename,
        "url": f"/api/agentapex/files/{file_id}",
        "size": len(contents)
    }

@router.get("/files/{file_id}")
async def get_file(request: Request, file_id: str):
    db = request.app.state.db
    file_doc = await db.agentapex_files.find_one({"id": file_id}, {"_id": 0})
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

@router.post("/properties/{property_id}/documents")
async def add_document(
    request: Request,
    property_id: str,
    files: List[UploadFile] = File(...),
    document_type: str = Form("general"),
    user: dict = Depends(get_current_user)
):
    """Upload multiple documents to a property"""
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    max_size = 10 * 1024 * 1024  # 10MB per file
    uploaded_docs = []
    
    for file in files:
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            continue  # Skip invalid files
        
        contents = await file.read()
        if len(contents) > max_size:
            continue  # Skip files that are too large
        
        file_id = generate_id()
        filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
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
        await db.agentapex_files.insert_one(file_doc)
        
        doc = {
            "id": generate_id(),
            "file_id": file_id,
            "type": document_type,
            "name": file.filename,
            "original_filename": file.filename,
            "url": f"/api/agentapex/files/{file_id}",
            "size": len(contents),
            "uploaded_at": get_timestamp()
        }
        
        await db.agentapex_properties.update_one(
            {"id": property_id},
            {"$push": {"documents": doc}}
        )
        uploaded_docs.append(doc)
    
    if not uploaded_docs:
        raise HTTPException(status_code=400, detail="No valid documents to upload")
    
    return {"message": f"{len(uploaded_docs)} document(s) added", "documents": uploaded_docs}

@router.delete("/properties/{property_id}/documents/{doc_id}")
async def delete_document(request: Request, property_id: str, doc_id: str, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    doc_to_delete = None
    for doc in prop.get("documents", []):
        if doc.get("id") == doc_id:
            doc_to_delete = doc
            break
    
    if not doc_to_delete:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc_to_delete.get("file_id"):
        file_doc = await db.agentapex_files.find_one({"id": doc_to_delete["file_id"]})
        if file_doc:
            file_path = UPLOAD_DIR / file_doc["stored_name"]
            if file_path.exists():
                file_path.unlink()
            await db.agentapex_files.delete_one({"id": doc_to_delete["file_id"]})
    
    await db.agentapex_properties.update_one(
        {"id": property_id},
        {"$pull": {"documents": {"id": doc_id}}}
    )
    
    return {"message": "Document deleted successfully"}

@router.get("/properties/{property_id}/documents")
async def get_property_documents(request: Request, property_id: str):
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return prop.get("documents", [])

# ================== IMAGE UPLOAD ROUTES ==================

@router.post("/properties/{property_id}/images")
async def upload_property_images(request: Request, property_id: str, files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    """Upload multiple images to a property"""
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    allowed_types = {'.jpg', '.jpeg', '.png', '.webp'}
    max_size = 10 * 1024 * 1024
    uploaded_urls = []
    
    for image in files:
        file_ext = Path(image.filename).suffix.lower()
        if file_ext not in allowed_types:
            continue
        
        contents = await image.read()
        if len(contents) > max_size:
            continue
        
        file_id = generate_id()
        filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Also save to object storage
        try:
            from services.object_storage import put_object
            content_type = f"image/{file_ext.strip('.')}"
            if file_ext == '.jpg':
                content_type = "image/jpeg"
            put_object(f"agentapex/properties/{filename}", contents, content_type)
        except Exception as e:
            logging.warning(f"Object storage upload failed: {e}")
        
        image_url = f"/api/agentapex/files/{file_id}"
        
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
        await db.agentapex_files.insert_one(file_doc)
        
        await db.agentapex_properties.update_one(
            {"id": property_id},
            {"$push": {"images": image_url}}
        )
        uploaded_urls.append(image_url)
    
    if not uploaded_urls:
        raise HTTPException(status_code=400, detail="No valid images to upload")
    
    return {
        "urls": uploaded_urls,
        "count": len(uploaded_urls),
        "success": True
    }

@router.delete("/properties/{property_id}/images/{image_id}")
async def delete_property_image(request: Request, property_id: str, image_id: str, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    prop = await db.agentapex_properties.find_one({"id": property_id, "user_id": user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or unauthorized")
    
    image_url = f"/api/agentapex/files/{image_id}"
    
    file_doc = await db.agentapex_files.find_one({"id": image_id})
    if file_doc:
        file_path = UPLOAD_DIR / file_doc["stored_name"]
        if file_path.exists():
            file_path.unlink()
        await db.agentapex_files.delete_one({"id": image_id})
    
    await db.agentapex_properties.update_one(
        {"id": property_id},
        {"$pull": {"images": image_url}}
    )
    
    return {"message": "Image deleted successfully"}

# ================== VOICE & AI ROUTES ==================

@router.post("/voice/transcribe")
async def transcribe_voice(request: Request, audio: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Transcribe voice recording to text using OpenAI Whisper"""
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
    except ImportError:
        raise HTTPException(status_code=503, detail="Voice service unavailable")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=503, detail="Voice service not configured")
    
    allowed_types = {'.mp3', '.wav', '.webm', '.m4a', '.mp4', '.mpeg', '.mpga'}
    file_ext = Path(audio.filename).suffix.lower()
    if file_ext not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Audio format not supported. Use: {', '.join(allowed_types)}")
    
    contents = await audio.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")
    
    try:
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        stt = OpenAISpeechToText(api_key=api_key)
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en",
                prompt="This is a real estate property description including property type, price, area, location details."
            )
        
        os.unlink(tmp_path)
        
        return {
            "text": response.text,
            "success": True
        }
    except Exception as e:
        logging.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post("/ai/area-intelligence")
async def get_area_intelligence(
    request: Request,
    latitude: float = Form(...),
    longitude: float = Form(...),
    location: str = Form(...),
    property_type: str = Form(None),
    user: dict = Depends(get_current_user)
):
    """Get FREE area intelligence using OpenStreetMap and public data"""
    import httpx
    
    intelligence_parts = []
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Get nearby amenities from OpenStreetMap Overpass API
            overpass_url = "https://overpass-api.de/api/interpreter"
            
            # Query for nearby amenities within 2km
            overpass_query = f"""
            [out:json][timeout:10];
            (
              node["amenity"](around:2000,{latitude},{longitude});
              node["shop"](around:2000,{latitude},{longitude});
              node["highway"="bus_stop"](around:1000,{latitude},{longitude});
              node["railway"="station"](around:3000,{latitude},{longitude});
            );
            out body 100;
            """
            
            amenities = {"schools": 0, "hospitals": 0, "banks": 0, "restaurants": 0, 
                        "shops": 0, "bus_stops": 0, "railway": 0, "atm": 0}
            
            try:
                overpass_res = await client.post(overpass_url, data={"data": overpass_query})
                if overpass_res.status_code == 200:
                    data = overpass_res.json()
                    for element in data.get("elements", []):
                        tags = element.get("tags", {})
                        amenity = tags.get("amenity", "")
                        shop = tags.get("shop", "")
                        highway = tags.get("highway", "")
                        railway = tags.get("railway", "")
                        
                        if amenity in ["school", "college", "university"]:
                            amenities["schools"] += 1
                        elif amenity in ["hospital", "clinic", "doctors"]:
                            amenities["hospitals"] += 1
                        elif amenity in ["bank"]:
                            amenities["banks"] += 1
                        elif amenity == "atm":
                            amenities["atm"] += 1
                        elif amenity in ["restaurant", "cafe", "fast_food"]:
                            amenities["restaurants"] += 1
                        elif shop:
                            amenities["shops"] += 1
                        elif highway == "bus_stop":
                            amenities["bus_stops"] += 1
                        elif railway == "station":
                            amenities["railway"] += 1
            except Exception as e:
                logging.warning(f"Overpass API error: {e}")
            
            # 2. Get reverse geocode info from Nominatim
            nominatim_url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={latitude}&lon={longitude}&zoom=16"
            area_info = {}
            try:
                nom_res = await client.get(nominatim_url, headers={"User-Agent": "AgentApex/1.0"})
                if nom_res.status_code == 200:
                    nom_data = nom_res.json()
                    area_info = nom_data.get("address", {})
            except Exception as e:
                logging.warning(f"Nominatim error: {e}")
            
            # Build intelligence report
            area_name = area_info.get("suburb") or area_info.get("neighbourhood") or location.split(",")[0]
            city = area_info.get("city") or area_info.get("town") or area_info.get("state_district") or ""
            
            # Area Overview
            overview = f"📍 **{area_name}** is located in {city}. "
            if amenities["schools"] > 3 or amenities["hospitals"] > 2:
                overview += "This is a well-developed residential area with good social infrastructure. "
            elif amenities["shops"] > 10:
                overview += "This area has good commercial activity with various shops and services nearby. "
            else:
                overview += "This is a developing area with potential for growth. "
            intelligence_parts.append(overview)
            
            # Key Amenities
            amenity_text = "🏪 **Nearby Amenities (within 2km):**\n"
            if amenities["schools"] > 0:
                amenity_text += f"• Schools/Colleges: {amenities['schools']}\n"
            if amenities["hospitals"] > 0:
                amenity_text += f"• Hospitals/Clinics: {amenities['hospitals']}\n"
            if amenities["banks"] > 0 or amenities["atm"] > 0:
                amenity_text += f"• Banks/ATMs: {amenities['banks'] + amenities['atm']}\n"
            if amenities["restaurants"] > 0:
                amenity_text += f"• Restaurants/Cafes: {amenities['restaurants']}\n"
            if amenities["shops"] > 0:
                amenity_text += f"• Shops: {amenities['shops']}\n"
            if amenities["schools"] == 0 and amenities["hospitals"] == 0 and amenities["shops"] == 0:
                amenity_text += "• Limited amenities - developing area\n"
            intelligence_parts.append(amenity_text)
            
            # Connectivity
            connectivity = "🚌 **Connectivity:**\n"
            if amenities["bus_stops"] > 0:
                connectivity += f"• Bus Stops nearby: {amenities['bus_stops']}\n"
            if amenities["railway"] > 0:
                connectivity += "• Railway Station within 3km: Yes\n"
            else:
                connectivity += "• Railway Station: Check for metro/local train connectivity\n"
            if amenities["bus_stops"] == 0:
                connectivity += "• Public transport may be limited\n"
            intelligence_parts.append(connectivity)
            
            # Growth Assessment
            total_amenities = sum(amenities.values())
            if total_amenities > 20:
                growth = "📈 **Growth Potential:** HIGH - Well-developed area with excellent infrastructure"
            elif total_amenities > 10:
                growth = "📈 **Growth Potential:** MEDIUM - Good infrastructure, steady appreciation expected"
            else:
                growth = "📈 **Growth Potential:** HIGH (Emerging) - Developing area with good appreciation potential for early investors"
            intelligence_parts.append(growth)
            
            # Investment tip based on property type
            if property_type:
                tip = f"\n💡 **Tip for {property_type}:** "
                if property_type.lower() in ["land", "plot"]:
                    tip += "Check for approved layout, clear title, and upcoming infrastructure projects in the area."
                elif property_type.lower() in ["apartment", "flat"]:
                    tip += "Verify builder reputation, RERA registration, and check for water/power supply reliability."
                else:
                    tip += "Research recent sale prices in the locality and verify all documents before purchase."
                intelligence_parts.append(tip)
            
            return {
                "intelligence": "\n\n".join(intelligence_parts),
                "location": location,
                "amenities_count": total_amenities,
                "success": True,
                "source": "OpenStreetMap (Free)"
            }
            
    except Exception as e:
        logging.error(f"Area Intelligence error: {e}")
        # Fallback response
        return {
            "intelligence": f"""📍 **{location}**

🏪 **Note:** Unable to fetch detailed amenity data at this moment.

💡 **General Tips:**
• Visit the location physically to assess infrastructure
• Check for nearby schools, hospitals, and markets
• Verify road connectivity and public transport
• Research recent property prices in the area
• Ensure clear title and approved layout for land/plots""",
            "location": location,
            "success": True,
            "source": "Fallback"
        }

# ================== STATS ROUTES ==================

@router.get("/stats")
async def get_stats(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    properties_count = await db.agentapex_properties.count_documents({"user_id": user["id"]})
    leads_count = await db.agentapex_leads.count_documents({"seller_id": user["id"]})
    followups_count = await db.agentapex_followups.count_documents({"user_id": user["id"]})
    favorites_count = await db.agentapex_favorites.count_documents({"user_id": user["id"]})
    
    return {
        "properties": properties_count,
        "leads": leads_count,
        "followups": followups_count,
        "favorites": favorites_count
    }

# ================== ROOT ==================

@router.get("/")
async def root():
    return {"message": "AgentApex API", "version": "2.0.0"}

# ================== ADMIN ROUTES ==================

@router.get("/admin/users")
async def admin_get_users(request: Request):
    """Admin: Get all AgentApex users"""
    db = request.app.state.db
    users = await db.agentapex_users.find({}, {"_id": 0}).to_list(1000)
    return users

@router.get("/admin/leads")
async def admin_get_leads(request: Request):
    """Admin: Get all AgentApex leads"""
    db = request.app.state.db
    leads = await db.agentapex_leads.find({}, {"_id": 0}).to_list(1000)
    return leads

@router.get("/admin/stats")
async def admin_get_stats(request: Request):
    """Admin: Get AgentApex statistics"""
    db = request.app.state.db
    
    users_count = await db.agentapex_users.count_documents({})
    properties_count = await db.agentapex_properties.count_documents({})
    leads_count = await db.agentapex_leads.count_documents({})
    requirements_count = await db.agentapex_requirements.count_documents({})
    
    return {
        "total_users": users_count,
        "total_properties": properties_count,
        "total_leads": leads_count,
        "total_requirements": requirements_count
    }


# ================== CONTACT REVEAL PAYMENT ROUTES ==================

class ContactRevealSettings(BaseModel):
    contact_view_price: float = 10.0  # Default ₹10
    enabled: bool = True

@router.get("/settings/contact-reveal")
async def get_contact_reveal_settings(request: Request):
    """Get contact reveal pricing settings"""
    db = request.app.state.db
    settings = await db.agentapex_settings.find_one({"key": "contact_reveal"}, {"_id": 0})
    if not settings:
        return {"contact_view_price": 10.0, "enabled": True}
    return settings.get("value", {"contact_view_price": 10.0, "enabled": True})

@router.put("/admin/settings/contact-reveal")
async def update_contact_reveal_settings(
    request: Request,
    price: float,
    enabled: bool = True
):
    """Admin: Update contact reveal pricing"""
    db = request.app.state.db
    await db.agentapex_settings.update_one(
        {"key": "contact_reveal"},
        {"$set": {"key": "contact_reveal", "value": {"contact_view_price": price, "enabled": enabled}}},
        upsert=True
    )
    return {"message": "Settings updated", "contact_view_price": price, "enabled": enabled}

@router.post("/contact-reveal/create-order")
async def create_contact_reveal_order(
    request: Request,
    property_id: str,
    user: dict = Depends(get_current_user)
):
    """Create Razorpay order for contact reveal"""
    import razorpay
    
    db = request.app.state.db
    
    # Check if already revealed
    existing = await db.agentapex_contact_reveals.find_one({
        "user_id": user["id"],
        "property_id": property_id,
        "status": "paid"
    })
    if existing:
        # Already paid, return owner details
        prop = await db.agentapex_properties.find_one({"id": property_id}, {"_id": 0})
        if prop:
            owner = await db.agentapex_users.find_one({"id": prop["user_id"]}, {"_id": 0})
            return {
                "already_paid": True,
                "owner_name": owner.get("name", "Property Owner"),
                "owner_phone": owner.get("phone")
            }
    
    # Get pricing
    settings = await db.agentapex_settings.find_one({"key": "contact_reveal"}, {"_id": 0})
    price = settings.get("value", {}).get("contact_view_price", 10.0) if settings else 10.0
    
    # Create Razorpay order
    try:
        client = razorpay.Client(
            auth=(
                os.environ.get("RAZORPAY_KEY_ID", ""),
                os.environ.get("RAZORPAY_KEY_SECRET", "")
            )
        )
        
        order = client.order.create({
            "amount": int(price * 100),  # Amount in paise
            "currency": "INR",
            "notes": {
                "property_id": property_id,
                "user_id": user["id"],
                "type": "contact_reveal"
            }
        })
        
        # Store pending order
        await db.agentapex_contact_reveals.insert_one({
            "id": generate_id(),
            "user_id": user["id"],
            "property_id": property_id,
            "order_id": order["id"],
            "amount": price,
            "status": "pending",
            "created_at": get_timestamp()
        })
        
        return {
            "order_id": order["id"],
            "amount": price,
            "currency": "INR",
            "key_id": os.environ.get("RAZORPAY_KEY_ID", "")
        }
    except Exception as e:
        print(f"Razorpay error: {e}")
        raise HTTPException(status_code=500, detail="Payment service error")

@router.post("/contact-reveal/verify")
async def verify_contact_reveal_payment(
    request: Request,
    order_id: str,
    payment_id: str,
    signature: str,
    user: dict = Depends(get_current_user)
):
    """Verify Razorpay payment and reveal contact"""
    import razorpay
    import hmac
    import hashlib
    
    db = request.app.state.db
    
    # Verify signature
    try:
        client = razorpay.Client(
            auth=(
                os.environ.get("RAZORPAY_KEY_ID", ""),
                os.environ.get("RAZORPAY_KEY_SECRET", "")
            )
        )
        
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature
        })
        
        # Update reveal status
        reveal = await db.agentapex_contact_reveals.find_one_and_update(
            {"order_id": order_id, "user_id": user["id"]},
            {"$set": {"status": "paid", "payment_id": payment_id, "paid_at": get_timestamp()}},
            return_document=True
        )
        
        if reveal:
            # Get owner details
            prop = await db.agentapex_properties.find_one({"id": reveal["property_id"]}, {"_id": 0})
            if prop:
                owner = await db.agentapex_users.find_one({"id": prop["user_id"]}, {"_id": 0})
                return {
                    "success": True,
                    "owner_name": owner.get("name", "Property Owner"),
                    "owner_phone": owner.get("phone")
                }
        
        raise HTTPException(status_code=400, detail="Payment verification failed")
    except Exception as e:
        print(f"Payment verification error: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed")

@router.get("/contact-reveal/check/{property_id}")
async def check_contact_reveal(
    request: Request,
    property_id: str,
    user: dict = Depends(get_current_user)
):
    """Check if user has already revealed contact for a property"""
    db = request.app.state.db
    
    reveal = await db.agentapex_contact_reveals.find_one({
        "user_id": user["id"],
        "property_id": property_id,
        "status": "paid"
    })
    
    if reveal:
        prop = await db.agentapex_properties.find_one({"id": property_id}, {"_id": 0})
        if prop:
            owner = await db.agentapex_users.find_one({"id": prop["user_id"]}, {"_id": 0})
            return {
                "revealed": True,
                "owner_name": owner.get("name", "Property Owner"),
                "owner_phone": owner.get("phone")
            }
    
    # Get pricing
    settings = await db.agentapex_settings.find_one({"key": "contact_reveal"}, {"_id": 0})
    price = settings.get("value", {}).get("contact_view_price", 10.0) if settings else 10.0
    
    return {
        "revealed": False,
        "price": price
    }


# ================== INTEREST AREAS (SAVED LOCATIONS) ROUTES ==================

class InterestAreaCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius_km: float = 5.0
    property_types: List[str] = ["Land", "Plot"]
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    notifications_enabled: bool = True

class InterestArea(BaseModel):
    id: str
    user_id: str
    name: str
    latitude: float
    longitude: float
    radius_km: float
    property_types: List[str]
    min_price: Optional[float]
    max_price: Optional[float]
    notifications_enabled: bool
    created_at: str

@router.post("/interest-areas", response_model=InterestArea)
async def create_interest_area(
    request: Request,
    data: InterestAreaCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new interest area for property alerts"""
    db = request.app.state.db
    
    # Check limit (max 10 interest areas per user)
    count = await db.agentapex_interest_areas.count_documents({"user_id": user["id"]})
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 interest areas allowed")
    
    area = {
        "id": generate_id(),
        "user_id": user["id"],
        "name": data.name,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "radius_km": data.radius_km,
        "property_types": data.property_types,
        "min_price": data.min_price,
        "max_price": data.max_price,
        "notifications_enabled": data.notifications_enabled,
        "created_at": get_timestamp()
    }
    await db.agentapex_interest_areas.insert_one(area)
    return area

@router.get("/interest-areas", response_model=List[InterestArea])
async def get_interest_areas(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get all interest areas for current user"""
    db = request.app.state.db
    areas = await db.agentapex_interest_areas.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return areas

@router.put("/interest-areas/{area_id}")
async def update_interest_area(
    request: Request,
    area_id: str,
    notifications_enabled: Optional[bool] = None,
    radius_km: Optional[float] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    user: dict = Depends(get_current_user)
):
    """Update an interest area"""
    db = request.app.state.db
    update_data = {}
    if notifications_enabled is not None:
        update_data["notifications_enabled"] = notifications_enabled
    if radius_km is not None:
        update_data["radius_km"] = radius_km
    if min_price is not None:
        update_data["min_price"] = min_price
    if max_price is not None:
        update_data["max_price"] = max_price
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.agentapex_interest_areas.update_one(
        {"id": area_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Interest area not found")
    return {"message": "Interest area updated"}

@router.delete("/interest-areas/{area_id}")
async def delete_interest_area(
    request: Request,
    area_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an interest area"""
    db = request.app.state.db
    result = await db.agentapex_interest_areas.delete_one(
        {"id": area_id, "user_id": user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interest area not found")
    return {"message": "Interest area deleted"}

# ================== NOTIFICATIONS ROUTES ==================

class Notification(BaseModel):
    id: str
    user_id: str
    type: str  # new_property, price_drop, interest_match
    title: str
    message: str
    property_id: Optional[str] = None
    read: bool = False
    created_at: str

@router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    request: Request,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Get user notifications"""
    db = request.app.state.db
    notifications = await db.agentapex_notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return notifications

@router.get("/notifications/unread-count")
async def get_unread_count(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get unread notification count"""
    db = request.app.state.db
    count = await db.agentapex_notifications.count_documents({
        "user_id": user["id"],
        "read": False
    })
    return {"unread_count": count}

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    request: Request,
    notification_id: str,
    user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    db = request.app.state.db
    await db.agentapex_notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    db = request.app.state.db
    await db.agentapex_notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# Helper function to create notifications for users when new property is added
async def notify_interested_users(db, property_data: dict):
    """Send notifications to users who have matching interest areas"""
    import math
    
    prop_lat = property_data.get("latitude")
    prop_lng = property_data.get("longitude")
    prop_type = property_data.get("property_type")
    prop_price = property_data.get("price", 0)
    
    if not prop_lat or not prop_lng:
        return
    
    # Find all interest areas (excluding property owner)
    interest_areas = await db.agentapex_interest_areas.find({
        "user_id": {"$ne": property_data.get("user_id")},
        "notifications_enabled": True
    }, {"_id": 0}).to_list(1000)
    
    for area in interest_areas:
        # Check if property is within radius
        lat1, lon1 = math.radians(prop_lat), math.radians(prop_lng)
        lat2, lon2 = math.radians(area["latitude"]), math.radians(area["longitude"])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        distance_km = 6371 * c
        
        if distance_km > area["radius_km"]:
            continue
        
        # Check property type
        if prop_type and area.get("property_types") and prop_type not in area["property_types"]:
            continue
        
        # Check price range
        if area.get("min_price") and prop_price < area["min_price"]:
            continue
        if area.get("max_price") and prop_price > area["max_price"]:
            continue
        
        # Create notification
        notification = {
            "id": generate_id(),
            "user_id": area["user_id"],
            "type": "new_property",
            "title": f"New {prop_type} in {area['name']}",
            "message": f"₹{prop_price} {property_data.get('price_unit', 'Lakhs')} - {property_data.get('area', '')} {property_data.get('area_unit', '')}",
            "property_id": property_data.get("id"),
            "read": False,
            "created_at": get_timestamp()
        }
        await db.agentapex_notifications.insert_one(notification)



# ================== WALLET SYSTEM ==================

@router.get("/wallet")
async def get_wallet(request: Request, user: dict = Depends(get_current_user)):
    """Get user's wallet info - starts with 200 points"""
    db = request.app.state.db
    
    wallet = await db.agentapex_wallets.find_one({"user_id": user["id"]})
    if not wallet:
        # Create wallet with 200 points for new user
        wallet = {
            "id": generate_id(),
            "user_id": user["id"],
            "points": 200,
            "total_earned": 200,
            "total_spent": 0,
            "created_at": get_timestamp(),
            "updated_at": get_timestamp()
        }
        await db.agentapex_wallets.insert_one(wallet)
    
    return {
        "points": wallet.get("points", 200),
        "total_earned": wallet.get("total_earned", 200),
        "total_spent": wallet.get("total_spent", 0)
    }

@router.get("/wallet/contacts")
async def get_viewed_contacts(request: Request, user: dict = Depends(get_current_user)):
    """Get list of contacts user has paid to view"""
    db = request.app.state.db
    
    contacts = await db.agentapex_viewed_contacts.find(
        {"viewer_id": user["id"]}
    ).sort("viewed_at", -1).to_list(100)
    
    return [{
        "id": c.get("id"),
        "owner_id": c.get("owner_id"),
        "owner_name": c.get("owner_name"),
        "owner_phone": c.get("owner_phone"),
        "property_type": c.get("property_type"),
        "requirement_type": c.get("requirement_type"),
        "item_id": c.get("item_id"),
        "viewed_at": c.get("viewed_at")
    } for c in contacts]

@router.post("/wallet/view-contact")
async def view_contact(
    request: Request,
    item_id: str = Form(...),
    item_type: str = Form(...),  # "property" or "requirement"
    user: dict = Depends(get_current_user)
):
    """Spend 10 points to view contact details. Free after 20 views or if already viewed."""
    db = request.app.state.db
    
    # Check if already viewed
    existing = await db.agentapex_viewed_contacts.find_one({
        "viewer_id": user["id"],
        "item_id": item_id
    })
    
    if existing:
        return {
            "success": True,
            "already_viewed": True,
            "contact": {
                "name": existing.get("owner_name"),
                "phone": existing.get("owner_phone")
            }
        }
    
    # Get wallet
    wallet = await db.agentapex_wallets.find_one({"user_id": user["id"]})
    if not wallet:
        wallet = {
            "id": generate_id(),
            "user_id": user["id"],
            "points": 200,
            "total_earned": 200,
            "total_spent": 0,
            "created_at": get_timestamp()
        }
        await db.agentapex_wallets.insert_one(wallet)
    
    # Count viewed contacts
    viewed_count = await db.agentapex_viewed_contacts.count_documents({"viewer_id": user["id"]})
    
    # First 20 contacts are free (using wallet points), after that need payment
    if viewed_count >= 20 and wallet.get("points", 0) < 10:
        return {
            "success": False,
            "needs_payment": True,
            "message": "You've used your free contacts. Add more points to continue.",
            "viewed_count": viewed_count,
            "points": wallet.get("points", 0)
        }
    
    # Get contact details
    if item_type == "property":
        item = await db.agentapex_properties.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Property not found")
        owner = await db.agentapex_users.find_one({"id": item["user_id"]})
    else:  # requirement
        item = await db.agentapex_requirements.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Requirement not found")
        owner = await db.agentapex_users.find_one({"id": item["user_id"]})
    
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    # Deduct points
    new_points = wallet.get("points", 200) - 10
    await db.agentapex_wallets.update_one(
        {"user_id": user["id"]},
        {"$set": {"points": new_points, "total_spent": wallet.get("total_spent", 0) + 10, "updated_at": get_timestamp()}}
    )
    
    # Save viewed contact
    viewed_contact = {
        "id": generate_id(),
        "viewer_id": user["id"],
        "owner_id": owner["id"],
        "owner_name": owner.get("name", "User"),
        "owner_phone": owner["phone"],
        "item_id": item_id,
        "item_type": item_type,
        "property_type": item.get("property_type"),
        "requirement_type": item.get("property_type"),
        "viewed_at": get_timestamp()
    }
    await db.agentapex_viewed_contacts.insert_one(viewed_contact)
    
    return {
        "success": True,
        "contact": {
            "name": owner.get("name", "User"),
            "phone": owner["phone"]
        },
        "points_remaining": new_points,
        "points_spent": 10,
        "viewed_count": viewed_count + 1
    }
