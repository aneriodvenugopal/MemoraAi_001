from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from datetime import datetime
import os
import math

from models.incomelands_property import (
    IncomeLandsProperty,
    PropertyCreateRequest,
    PropertyUpdateRequest,
    PropertySearchQuery,
    ContactUnlockRequest
)
from middleware.auth import get_current_user

router = APIRouter(prefix="/incomelands", tags=["IncomeLands Properties"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c

    return distance

@router.post("/properties", status_code=status.HTTP_201_CREATED)
async def create_property(property_data: dict):
    """Create a new property listing"""
    import uuid
    from datetime import datetime, timezone
    
    # Generate property ID
    property_id = str(uuid.uuid4())
    
    # Prepare property document
    property_doc = {
        "id": property_id,
        "type": property_data.get("type"),
        "cost": property_data.get("cost"),
        "size": property_data.get("size"),
        "negotiable": property_data.get("negotiable", False),
        "facing": property_data.get("facing"),
        "bhk": property_data.get("bhk"),
        "location": property_data.get("location"),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert into database
    result = await db.incomelands_properties.insert_one(property_doc)
    
    return {
        "success": True,
        "message": "Property created successfully",
        "property_id": property_id
    }

@router.get("/properties")
async def get_properties(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    distance: Optional[float] = None,
    property_type: Optional[str] = None
):
    """Get all properties with optional filters"""
    
    query = {"status": "active"}
    
    if property_type:
        query["type"] = property_type
    
    properties = await db.incomelands_properties.find(query).to_list(length=1000)
    
    # Filter by distance if location provided
    if latitude and longitude and distance:
        filtered_properties = []
        for prop in properties:
            if prop.get("location", {}).get("latitude") and prop.get("location", {}).get("longitude"):
                dist = calculate_distance(
                    latitude, longitude,
                    prop["location"]["latitude"],
                    prop["location"]["longitude"]
                )
                if dist <= distance:
                    prop["_distance"] = dist
                    filtered_properties.append(prop)
        properties = filtered_properties
    
    # Remove MongoDB _id
    for prop in properties:
        prop.pop("_id", None)
    
    return {
        "success": True,
        "count": len(properties),
        "properties": properties
    }

@router.get("/properties/{property_id}")
async def get_property(property_id: str):
    """Get a single property by ID"""
    
    property_doc = await db.incomelands_properties.find_one({"id": property_id})
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    property_doc.pop("_id", None)
    
    return {
        "success": True,
        "property": property_doc
    }

@router.get("/my-properties")
async def get_my_properties(user_id: str):
    """Get all properties for a specific user"""
    
    properties = await db.incomelands_properties.find({"agent_id": user_id}).to_list(length=1000)
    
    for prop in properties:
        prop.pop("_id", None)
    
    return {
        "success": True,
        "count": len(properties),
        "properties": properties
    }

@router.get("/properties/my/list")
async def get_my_properties_list(current_user: dict = Depends(get_current_user)):
    """Get all properties for the current authenticated user"""
    
    # Get user_id from current_user
    user_id = current_user.get("id") or current_user.get("user_id")
    
    properties = await db.incomelands_properties.find({"agent_id": user_id}).to_list(length=1000)
    
    for prop in properties:
        prop.pop("_id", None)
    
    return {
        "success": True,
        "count": len(properties),
        "properties": properties
    }


@router.put("/properties/{property_id}")
async def update_property(property_id: str, property_data: dict):
    """Update a property"""
    from datetime import datetime, timezone
    
    # Check if property exists
    existing = await db.incomelands_properties.find_one({"id": property_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Update fields
    update_data = {**property_data}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Perform update
    result = await db.incomelands_properties.update_one(
        {"id": property_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Property updated successfully"
    }

@router.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    """Delete a property (soft delete by setting status to inactive)"""
    from datetime import datetime, timezone
    
    result = await db.incomelands_properties.update_one(
        {"id": property_id},
        {"$set": {
            "status": "deleted",
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {
        "success": True,
        "message": "Property deleted successfully"
    }

@router.post("/properties/search")
async def search_properties(search_data: dict):
    """Search properties based on filters"""
    
    filter_query = {"status": "active"}
    
    # Get search parameters
    property_type = search_data.get("property_type")
    transaction_type = search_data.get("transaction_type")
    min_price = search_data.get("min_price")
    max_price = search_data.get("max_price")
    latitude = search_data.get("latitude")
    longitude = search_data.get("longitude")
    radius_km = search_data.get("radius_km", 10)
    limit = search_data.get("limit", 50)
    
    if property_type:
        filter_query["type"] = property_type
    
    if transaction_type:
        filter_query["transaction_type"] = transaction_type
    
    if min_price or max_price:
        filter_query["cost.amount"] = {}
        if min_price:
            filter_query["cost.amount"]["$gte"] = min_price
        if max_price:
            filter_query["cost.amount"]["$lte"] = max_price
    
    # Get all matching properties
    properties = await db.incomelands_properties.find(filter_query).to_list(length=None)
    
    # Filter by distance if lat/lng provided
    if latitude and longitude:
        properties_with_distance = []
        for prop in properties:
            if "location" in prop and "latitude" in prop["location"]:
                distance = calculate_distance(
                    latitude,
                    longitude,
                    prop["location"]["latitude"],
                    prop["location"]["longitude"]
                )
                
                if distance <= radius_km:
                    prop["distance_km"] = round(distance, 2)
                    properties_with_distance.append(prop)
        
        properties = sorted(properties_with_distance, key=lambda x: x["distance_km"])
    
    # Remove MongoDB _id field
    for prop in properties:
        prop.pop("_id", None)
    
    # Pagination
    total = len(properties)
    properties = properties[:limit]
    
    return {
        "success": True,
        "total": total,
        "count": len(properties),
        "properties": properties
    }

@router.post("/properties/{property_id}/unlock-contact")
async def unlock_contact(
    property_id: str,
    unlock_request: ContactUnlockRequest,
    current_user: dict = Depends(get_current_user)
):
    """Unlock agent contact using credits"""
    
    property_doc = await db.incomelands_properties.find_one({"id": property_id})
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Free for ExlainERP properties
    if property_doc.get("is_retoerp_property", False):
        await db.incomelands_properties.update_one(
            {"id": property_id},
            {"$push": {"contact_unlocks": {"user_id": current_user["id"], "amount": 0, "timestamp": datetime.utcnow()}}}
        )
        return {"success": True, "agent_phone": property_doc.get("agent_phone")}
    
    # Check if already unlocked
    has_unlocked = any(u["user_id"] == current_user["id"] for u in property_doc.get("contact_unlocks", []))
    if has_unlocked:
        return {"success": True, "agent_phone": property_doc.get("agent_phone")}
    
    # Check credits
    user = await db.users.find_one({"id": current_user["id"]})
    free_credits = user.get("free_credits", 0)
    paid_credits = user.get("paid_credits", 0)
    total = free_credits + paid_credits
    
    if total < unlock_request.amount:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    
    # Deduct credits
    if free_credits >= unlock_request.amount:
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"free_credits": -unlock_request.amount}})
    else:
        remaining = unlock_request.amount - free_credits
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"free_credits": 0}, "$inc": {"paid_credits": -remaining}}
        )
    
    # Add unlock record
    await db.incomelands_properties.update_one(
        {"id": property_id},
        {"$push": {"contact_unlocks": {"user_id": current_user["id"], "amount": unlock_request.amount, "timestamp": datetime.utcnow()}}}
    )
    
    return {
        "success": True,
        "agent_phone": property_doc.get("agent_phone"),
        "remaining_credits": total - unlock_request.amount
    }

@router.get("/credits/balance")
async def get_credit_balance(current_user: dict = Depends(get_current_user)):
    """Get credit balance"""
    
    user = await db.users.find_one({"id": current_user["id"]})
    free_credits = user.get("free_credits", 20)  # Default 20 free credits
    paid_credits = user.get("paid_credits", 0)
    
    return {
        "success": True,
        "free_credits": free_credits,
        "paid_credits": paid_credits,
        "total_credits": free_credits + paid_credits
    }
