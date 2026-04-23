from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import math

from models.marketplace import (
    AgentProfile, AgentProfileCreate,
    BuyerRequirement, BuyerRequirementCreate,
    MarketplaceLead, MarketplaceLeadCreate, MarketplaceLeadUpdate,
    AgentCommission, AgentCommissionCreate, AgentCommissionUpdate,
    PropertyContactUnlock, PropertyContactUnlockCreate
)

load_dotenv()

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
if not MONGO_URL:
    raise Exception("MONGO_URL environment variable not set")

client = AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get('DB_NAME', 'test_database')]

# ============================================
# Helper Functions
# ============================================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

async def get_property_count(project_id: str, status_filter: Optional[str] = None) -> int:
    """Get property count for a project"""
    query = {"project_id": project_id, "deleted_at": None}
    if status_filter:
        # Get status category ID
        status_cat = await db.master_categories.find_one({"slug": status_filter}, {"_id": 0})
        if status_cat:
            query["status_id"] = status_cat["id"]
    return await db.properties.count_documents(query)

async def get_project_price_range(project_id: str) -> dict:
    """Get min and max price for project properties"""
    pipeline = [
        {"$match": {"project_id": project_id, "deleted_at": None}},
        {"$group": {
            "_id": None,
            "min_price": {"$min": "$price"},
            "max_price": {"$max": "$price"}
        }}
    ]
    result = await db.properties.aggregate(pipeline).to_list(1)
    if result:
        return {"min": result[0].get("min_price", 0), "max": result[0].get("max_price", 0)}
    return {"min": 0, "max": 0}

# ============================================
# Agent Management APIs
# ============================================

@router.post("/agents/register")
async def register_agent(agent_data: AgentProfileCreate):
    """Register a new IncomeLands agent in ExlainERP marketplace"""
    # Check if agent already exists
    existing = await db.marketplace_agents.find_one({"phone": agent_data.phone}, {"_id": 0})
    if existing:
        return {"success": True, "message": "Agent already registered", "agent": existing}
    
    # Create agent profile
    agent = AgentProfile(**agent_data.dict())
    await db.marketplace_agents.insert_one(agent.dict())
    
    return {"success": True, "message": "Agent registered successfully", "agent": agent.dict()}

@router.get("/agents/{agent_id}")
async def get_agent_profile(agent_id: str):
    """Get agent profile with performance metrics"""
    agent = await db.marketplace_agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get recent leads
    recent_leads = await db.marketplace_leads.find(
        {"agent_id": agent_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Get commission summary
    commission_pipeline = [
        {"$match": {"agent_id": agent_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$agent_net_amount"}
        }}
    ]
    commission_summary = await db.agent_commissions.aggregate(commission_pipeline).to_list(None)
    
    return {
        "success": True,
        "agent": agent,
        "recent_leads": recent_leads,
        "commission_summary": commission_summary
    }

@router.get("/agents/phone/{phone}")
async def get_agent_by_phone(phone: str):
    """Get agent by phone number (for login/lookup)"""
    agent = await db.marketplace_agents.find_one({"phone": phone}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {"success": True, "agent": agent}

# ============================================
# Projects & Properties APIs (for IncomeLands Map View)
# ============================================

@router.get("/projects")
async def get_marketplace_projects(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(50.0),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    project_type: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    limit: int = Query(100, le=500),
    skip: int = Query(0)
):
    """
    Get all active projects for IncomeLands agents
    Supports geo-location based filtering and search
    """
    # Build query
    query = {
        "deleted_at": None,
        "is_active": True,
        "status": "active"
    }
    
    # Location filters
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if project_type:
        query["project_type"] = project_type
    
    # Get projects
    projects = await db.projects.find(query).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with property counts and price range
    enriched_projects = []
    for project in projects:
        # Get property statistics
        total_properties = await get_property_count(project["id"])
        available_properties = await get_property_count(project["id"], "available")
        price_range = await get_project_price_range(project["id"])
        
        # Get tenant/developer info
        tenant = await db.tenants.find_one({"id": project["tenant_id"]}, {"_id": 0})
        
        # Calculate distance if coordinates provided
        distance_km = None
        if latitude and longitude and project.get("latitude") and project.get("longitude"):
            distance_km = calculate_distance(latitude, longitude, project["latitude"], project["longitude"])
            # Filter by radius
            if radius_km and distance_km > radius_km:
                continue
        
        # Filter by price if specified
        if min_price and price_range["max"] < min_price:
            continue
        if max_price and price_range["min"] > max_price:
            continue
        
        enriched_project = {
            **project,
            "developer_name": tenant.get("company_name") if tenant else "Unknown",
            "developer_phone": tenant.get("phone") if tenant else None,
            "total_properties": total_properties,
            "available_properties": available_properties,
            "price_range": price_range,
            "distance_km": round(distance_km, 2) if distance_km else None
        }
        enriched_projects.append(enriched_project)
    
    # Sort by distance if coordinates provided
    if latitude and longitude:
        enriched_projects.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else float('inf'))
    
    return {
        "success": True,
        "count": len(enriched_projects),
        "projects": enriched_projects
    }

@router.get("/projects/{project_id}")
async def get_marketplace_project_details(project_id: str):
    """Get detailed project information for IncomeLands agents"""
    project = await db.projects.find_one({"id": project_id, "deleted_at": None}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get tenant info
    tenant = await db.tenants.find_one({"id": project["tenant_id"]}, {"_id": 0})
    
    # Get property statistics
    total_properties = await get_property_count(project_id)
    available_properties = await get_property_count(project_id, "available")
    booked_properties = await get_property_count(project_id, "booked")
    sold_properties = await get_property_count(project_id, "sold")
    
    # Get price range
    price_range = await get_project_price_range(project_id)
    
    # Get available properties (sample - first 20)
    properties = await db.properties.find({
        "project_id": project_id,
        "deleted_at": None
    }).limit(20).to_list(20)
    
    # Get status category for display names
    status_categories = await db.master_categories.find({"type": "property_status"}).to_list(None)
    status_map = {cat["id"]: cat["name"] for cat in status_categories}
    
    # Get property type categories
    type_categories = await db.master_categories.find({"type": "property_type"}).to_list(None)
    type_map = {cat["id"]: cat["name"] for cat in type_categories}
    
    # Enrich properties
    for prop in properties:
        prop["status_name"] = status_map.get(prop.get("status_id"), "Unknown")
        prop["type_name"] = type_map.get(prop.get("property_type_id"), "Unknown")
    
    return {
        "success": True,
        "project": project,
        "developer": {
            "id": tenant.get("id") if tenant else None,
            "name": tenant.get("company_name") if tenant else "Unknown",
            "phone": "LOCKED",  # Agent needs to unlock to view
            "email": "LOCKED",
            "is_locked": True
        },
        "statistics": {
            "total_properties": total_properties,
            "available": available_properties,
            "booked": booked_properties,
            "sold": sold_properties,
            "price_range": price_range
        },
        "sample_properties": properties
    }

@router.get("/properties/search")
async def search_marketplace_properties(
    property_type: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_area: Optional[float] = Query(None),
    max_area: Optional[float] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(20.0),
    status: Optional[str] = Query("available"),
    limit: int = Query(100, le=500),
    skip: int = Query(0)
):
    """
    Search properties across all projects for IncomeLands agents
    Supports advanced filtering and geo-location
    """
    # Build property query
    property_query = {"deleted_at": None}
    
    # Status filter
    if status:
        status_cat = await db.master_categories.find_one({"slug": status, "type": "property_status"}, {"_id": 0})
        if status_cat:
            property_query["status_id"] = status_cat["id"]
    
    # Property type filter
    if property_type:
        type_cat = await db.master_categories.find_one({"slug": property_type, "type": "property_type"}, {"_id": 0})
        if type_cat:
            property_query["property_type_id"] = type_cat["id"]
    
    # Price filter
    if min_price:
        property_query["price"] = {"$gte": min_price}
    if max_price:
        if "price" in property_query:
            property_query["price"]["$lte"] = max_price
        else:
            property_query["price"] = {"$lte": max_price}
    
    # Area filter
    if min_area:
        property_query["area"] = {"$gte": min_area}
    if max_area:
        if "area" in property_query:
            property_query["area"]["$lte"] = max_area
        else:
            property_query["area"] = {"$lte": max_area}
    
    # Get properties
    properties = await db.properties.find(property_query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with project and developer info
    enriched_properties = []
    for prop in properties:
        # Get project
        project = await db.projects.find_one({"id": prop["project_id"]}, {"_id": 0})
        if not project:
            continue
        
        # Location filter
        if city and city.lower() not in (project.get("city", "").lower()):
            continue
        if state and state.lower() not in (project.get("state", "").lower()):
            continue
        
        # Distance filter
        distance_km = None
        if latitude and longitude and project.get("latitude") and project.get("longitude"):
            distance_km = calculate_distance(latitude, longitude, project["latitude"], project["longitude"])
            if radius_km and distance_km > radius_km:
                continue
        
        # Get tenant
        tenant = await db.tenants.find_one({"id": prop["tenant_id"]}, {"_id": 0})
        
        enriched_prop = {
            **prop,
            "project_name": project.get("name"),
            "project_location": project.get("location"),
            "project_city": project.get("city"),
            "developer_name": tenant.get("company_name") if tenant else "Unknown",
            "distance_km": round(distance_km, 2) if distance_km else None
        }
        enriched_properties.append(enriched_prop)
    
    # Sort by distance if coordinates provided
    if latitude and longitude:
        enriched_properties.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else float('inf'))
    
    return {
        "success": True,
        "count": len(enriched_properties),
        "properties": enriched_properties
    }

# ============================================
# Contact Unlock APIs (₹10 per unlock)
# ============================================

@router.post("/unlock-contact")
async def unlock_developer_contact(unlock_data: PropertyContactUnlockCreate):
    """
    Agent unlocks developer contact (₹10 fee)
    Returns actual phone and email of developer
    """
    # Verify agent exists
    agent = await db.marketplace_agents.find_one({"id": unlock_data.agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if already unlocked
    existing_unlock = await db.property_contact_unlocks.find_one({
        "agent_id": unlock_data.agent_id,
        "tenant_id": unlock_data.tenant_id,
        "project_id": unlock_data.project_id
    })
    
    if existing_unlock:
        # Already unlocked, return existing
        tenant = await db.tenants.find_one({"id": unlock_data.tenant_id}, {"_id": 0})
        return {
            "success": True,
            "message": "Already unlocked",
            "already_unlocked": True,
            "developer_phone": tenant.get("phone"),
            "developer_email": tenant.get("email")
        }
    
    # Get tenant/developer info
    tenant = await db.tenants.find_one({"id": unlock_data.tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Developer not found")
    
    # Create unlock record
    unlock = PropertyContactUnlock(
        **unlock_data.dict(),
        developer_phone=tenant.get("phone"),
        developer_email=tenant.get("email")
    )
    await db.property_contact_unlocks.insert_one(unlock.dict())
    
    # Update agent statistics (total spend)
    await db.marketplace_agents.update_one(
        {"id": unlock_data.agent_id},
        {"$inc": {"total_contact_unlocks": 1}}
    )
    
    # TODO: Deduct credits or process payment via IncomeLands
    
    return {
        "success": True,
        "message": "Contact unlocked successfully",
        "unlock_fee": unlock.unlock_fee,
        "developer_phone": unlock.developer_phone,
        "developer_email": unlock.developer_email,
        "project_manager_phone": unlock.project_manager_phone
    }

# ============================================
# Lead Submission APIs (Agent to Developer)
# ============================================

@router.post("/leads/submit")
async def submit_marketplace_lead(lead_data: MarketplaceLeadCreate):
    """
    IncomeLands agent submits a lead to ExlainERP developer
    This creates a lead in marketplace and optionally in ExlainERP leads table
    """
    # Verify agent
    agent = await db.marketplace_agents.find_one({"id": lead_data.agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Verify project exists
    project = await db.projects.find_one({"id": lead_data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create marketplace lead
    lead = MarketplaceLead(**lead_data.dict())
    await db.marketplace_leads.insert_one(lead.dict())
    
    # Also create in ExlainERP leads table for developer to see
    # Get lead status category (new)
    lead_status = await db.master_categories.find_one({"slug": "new", "type": "lead_status"}, {"_id": 0})
    lead_source = await db.master_categories.find_one({"slug": "incomelands", "type": "lead_source"}, {"_id": 0})
    
    # Create ExlainERP lead
    from models.lead import Lead
    retoerp_lead = Lead(
        tenant_id=lead_data.tenant_id,
        project_id=lead_data.project_id,
        name=lead_data.buyer_name,
        phone=lead_data.buyer_phone,
        email=lead_data.buyer_email,
        source_id=lead_source["id"] if lead_source else None,
        status_id=lead_status["id"] if lead_status else None,
        budget_min=lead_data.budget,
        budget_max=lead_data.budget,
        notes=f"Lead from IncomeLands Agent: {lead_data.agent_name} ({lead_data.agent_phone})\n{lead_data.notes or ''}"
    )
    await db.leads.insert_one(retoerp_lead.dict())
    
    # Update marketplace lead with ExlainERP lead ID
    await db.marketplace_leads.update_one(
        {"id": lead.id},
        {"$set": {"retoerp_lead_id": retoerp_lead.id}}
    )
    
    # Update agent statistics
    await db.marketplace_agents.update_one(
        {"id": lead_data.agent_id},
        {"$inc": {"total_leads_submitted": 1}}
    )
    
    return {
        "success": True,
        "message": "Lead submitted successfully",
        "marketplace_lead_id": lead.id,
        "retoerp_lead_id": retoerp_lead.id
    }

@router.get("/leads/agent/{agent_id}")
async def get_agent_leads(
    agent_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    skip: int = Query(0)
):
    """Get all leads submitted by an agent"""
    query = {"agent_id": agent_id}
    if status:
        query["status"] = status
    
    leads = await db.marketplace_leads.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with project names
    for lead in leads:
        project = await db.projects.find_one({"id": lead["project_id"]}, {"_id": 0})
        if project:
            lead["project_name"] = project.get("name")
    
    total_count = await db.marketplace_leads.count_documents(query)
    
    return {
        "success": True,
        "count": len(leads),
        "total": total_count,
        "leads": leads
    }

@router.patch("/leads/{lead_id}")
async def update_lead_status(lead_id: str, update_data: MarketplaceLeadUpdate):
    """Update marketplace lead status (by developer or system)"""
    lead = await db.marketplace_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    if update_data.contacted_by_developer:
        update_dict["contacted_at"] = datetime.now(timezone.utc)
    
    await db.marketplace_leads.update_one(
        {"id": lead_id},
        {"$set": update_dict}
    )
    
    return {"success": True, "message": "Lead updated successfully"}

# ============================================
# Buyer Requirements APIs
# ============================================

@router.post("/requirements")
async def create_buyer_requirement(requirement_data: BuyerRequirementCreate):
    """
    Create a buyer requirement (from IncomeLands)
    Can be posted by agent or direct buyer
    """
    requirement = BuyerRequirement(**requirement_data.dict())
    
    # Set expiry date (30 days from now)
    requirement.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.buyer_requirements.insert_one(requirement.dict())
    
    # TODO: Trigger AI matching engine to find properties
    
    return {
        "success": True,
        "message": "Requirement created successfully",
        "requirement_id": requirement.id
    }

@router.get("/requirements")
async def get_buyer_requirements(
    property_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_budget: Optional[float] = Query(None),
    max_budget: Optional[float] = Query(None),
    status: str = Query("active"),
    limit: int = Query(50),
    skip: int = Query(0)
):
    """
    Get buyer requirements (for agents to see what buyers are looking for)
    Agents can contact buyers directly
    """
    query = {"status": status, "is_active": True}
    
    if property_type:
        query["property_type"] = property_type
    if city:
        query["preferred_locations"] = {"$regex": city, "$options": "i"}
    if min_budget:
        query["budget_max"] = {"$gte": min_budget}
    if max_budget:
        query["budget_min"] = {"$lte": max_budget}
    
    requirements = await db.buyer_requirements.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total_count = await db.buyer_requirements.count_documents(query)
    
    return {
        "success": True,
        "count": len(requirements),
        "total": total_count,
        "requirements": requirements
    }

@router.get("/requirements/{requirement_id}/matches")
async def get_requirement_matches(requirement_id: str, limit: int = Query(20)):
    """
    Get matched properties for a buyer requirement
    Uses AI matching engine
    """
    requirement = await db.buyer_requirements.find_one({"id": requirement_id}, {"_id": 0})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # Build property query based on requirement
    property_query = {"deleted_at": None}
    
    # Property type
    type_cat = await db.master_categories.find_one({
        "slug": requirement["property_type"],
        "type": "property_type"
    }, {"_id": 0})
    if type_cat:
        property_query["property_type_id"] = type_cat["id"]
    
    # Price range
    property_query["price"] = {
        "$gte": requirement["budget_min"],
        "$lte": requirement["budget_max"]
    }
    
    # Area range if specified
    if requirement.get("min_area"):
        property_query["area"] = {"$gte": requirement["min_area"]}
    if requirement.get("max_area"):
        if "area" in property_query:
            property_query["area"]["$lte"] = requirement["max_area"]
        else:
            property_query["area"] = {"$lte": requirement["max_area"]}
    
    # Get available properties
    status_cat = await db.master_categories.find_one({"slug": "available"}, {"_id": 0})
    if status_cat:
        property_query["status_id"] = status_cat["id"]
    
    properties = await db.properties.find(property_query, {"_id": 0}).limit(limit).to_list(limit)
    
    # Enrich and score matches
    matched_properties = []
    for prop in properties:
        project = await db.projects.find_one({"id": prop["project_id"]}, {"_id": 0})
        if not project:
            continue
        
        # Calculate match score (0-100)
        score = 50  # Base score
        
        # Location match
        if requirement.get("preferred_locations"):
            for location in requirement["preferred_locations"]:
                if location.lower() in project.get("city", "").lower() or \
                   location.lower() in project.get("location", "").lower():
                    score += 20
                    break
        
        # Budget match (closer to mid-range = higher score)
        budget_mid = (requirement["budget_min"] + requirement["budget_max"]) / 2
        price_diff_percent = abs(prop["price"] - budget_mid) / budget_mid * 100
        if price_diff_percent < 10:
            score += 20
        elif price_diff_percent < 20:
            score += 10
        
        # Area match
        if requirement.get("min_area") and requirement.get("max_area"):
            area_mid = (requirement["min_area"] + requirement["max_area"]) / 2
            area_diff_percent = abs(prop["area"] - area_mid) / area_mid * 100
            if area_diff_percent < 10:
                score += 10
        
        # Distance match (if coordinates available)
        if requirement.get("latitude") and requirement.get("longitude") and \
           project.get("latitude") and project.get("longitude"):
            distance = calculate_distance(
                requirement["latitude"], requirement["longitude"],
                project["latitude"], project["longitude"]
            )
            if distance <= requirement.get("radius_km", 10):
                score += 10
        
        # Get tenant
        tenant = await db.tenants.find_one({"id": prop["tenant_id"]}, {"_id": 0})
        
        matched_properties.append({
            **prop,
            "project_name": project.get("name"),
            "project_location": project.get("location"),
            "developer_name": tenant.get("company_name") if tenant else "Unknown",
            "match_score": min(score, 100)  # Cap at 100
        })
    
    # Sort by match score
    matched_properties.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "success": True,
        "requirement": requirement,
        "count": len(matched_properties),
        "matches": matched_properties
    }

# ============================================
# Commission APIs
# ============================================

@router.post("/commissions/calculate")
async def calculate_agent_commission(commission_data: AgentCommissionCreate):
    """
    Calculate and create commission record when lead converts to booking
    Called by ExlainERP when booking is created
    """
    # Get marketplace lead
    lead = await db.marketplace_leads.find_one({"id": commission_data.marketplace_lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Marketplace lead not found")
    
    # Get booking details
    booking = await db.bookings.find_one({"id": commission_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get property to determine value
    property = await db.properties.find_one({"id": booking["property_id"]}, {"_id": 0})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Commission calculation
    # Standard: 1% of property value to agent
    # Platform fee: 10% of commission (0.1% of property value)
    commission_percentage = 1.0
    platform_fee_percentage = 10.0  # 10% of commission
    
    property_value = property["price"]
    commission_amount = property_value * (commission_percentage / 100)
    platform_fee_amount = commission_amount * (platform_fee_percentage / 100)
    agent_net_amount = commission_amount - platform_fee_amount
    
    # Create commission record
    commission = AgentCommission(
        agent_id=lead["agent_id"],
        agent_name=lead["agent_name"],
        agent_phone=lead["agent_phone"],
        marketplace_lead_id=commission_data.marketplace_lead_id,
        tenant_id=lead["tenant_id"],
        project_id=lead["project_id"],
        property_id=booking["property_id"],
        booking_id=commission_data.booking_id,
        property_value=property_value,
        commission_percentage=commission_percentage,
        commission_amount=commission_amount,
        platform_fee_percentage=platform_fee_percentage,
        platform_fee_amount=platform_fee_amount,
        agent_net_amount=agent_net_amount,
        notes=commission_data.notes
    )
    
    await db.agent_commissions.insert_one(commission.dict())
    
    # Update marketplace lead
    await db.marketplace_leads.update_one(
        {"id": commission_data.marketplace_lead_id},
        {
            "$set": {
                "is_converted": True,
                "booking_id": commission_data.booking_id,
                "converted_at": datetime.now(timezone.utc),
                "commission_amount": commission_amount,
                "commission_status": "calculated",
                "status": "converted"
            }
        }
    )
    
    # Update agent stats
    await db.marketplace_agents.update_one(
        {"id": lead["agent_id"]},
        {
            "$inc": {
                "converted_leads": 1,
                "total_commission_earned": agent_net_amount
            }
        }
    )
    
    return {
        "success": True,
        "message": "Commission calculated successfully",
        "commission": commission.dict()
    }

@router.get("/commissions/agent/{agent_id}")
async def get_agent_commissions(
    agent_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    skip: int = Query(0)
):
    """Get all commissions for an agent"""
    query = {"agent_id": agent_id}
    if status:
        query["status"] = status
    
    commissions = await db.agent_commissions.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Calculate totals
    total_pending = await db.agent_commissions.aggregate([
        {"$match": {"agent_id": agent_id, "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$agent_net_amount"}}}
    ]).to_list(1)
    
    total_approved = await db.agent_commissions.aggregate([
        {"$match": {"agent_id": agent_id, "status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$agent_net_amount"}}}
    ]).to_list(1)
    
    total_paid = await db.agent_commissions.aggregate([
        {"$match": {"agent_id": agent_id, "status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$agent_net_amount"}}}
    ]).to_list(1)
    
    return {
        "success": True,
        "count": len(commissions),
        "commissions": commissions,
        "summary": {
            "total_pending": total_pending[0]["total"] if total_pending else 0,
            "total_approved": total_approved[0]["total"] if total_approved else 0,
            "total_paid": total_paid[0]["total"] if total_paid else 0
        }
    }

@router.patch("/commissions/{commission_id}")
async def update_commission_status(commission_id: str, update_data: AgentCommissionUpdate):
    """Update commission status (approval, payment)"""
    commission = await db.agent_commissions.find_one({"id": commission_id}, {"_id": 0})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    # Handle status-specific updates
    if update_data.approved_by_developer:
        update_dict["approved_by_developer_at"] = datetime.now(timezone.utc)
    
    if update_data.approved_by_platform:
        update_dict["approved_by_platform_at"] = datetime.now(timezone.utc)
        # If both approvals done, set status to approved
        if commission.get("approved_by_developer"):
            update_dict["status"] = "approved"
    
    if update_data.status == "paid" and update_data.payment_date:
        update_dict["payment_date"] = update_data.payment_date
    
    await db.agent_commissions.update_one(
        {"id": commission_id},
        {"$set": update_dict}
    )
    
    # Update marketplace lead commission status
    await db.marketplace_leads.update_one(
        {"id": commission["marketplace_lead_id"]},
        {"$set": {"commission_status": update_data.status}}
    )
    
    return {"success": True, "message": "Commission updated successfully"}

# ============================================
# Statistics & Analytics APIs
# ============================================

@router.get("/stats/overview")
async def get_marketplace_stats():
    """Get overall marketplace statistics"""
    # Total agents
    total_agents = await db.marketplace_agents.count_documents({"is_active": True})
    
    # Total leads submitted
    total_leads = await db.marketplace_leads.count_documents({})
    
    # Conversion rate
    converted_leads = await db.marketplace_leads.count_documents({"is_converted": True})
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    # Total commissions
    commission_pipeline = [
        {"$group": {
            "_id": None,
            "total_commission": {"$sum": "$commission_amount"},
            "total_agent_payout": {"$sum": "$agent_net_amount"},
            "total_platform_fee": {"$sum": "$platform_fee_amount"}
        }}
    ]
    commission_stats = await db.agent_commissions.aggregate(commission_pipeline).to_list(1)
    
    # Total contact unlocks
    total_unlocks = await db.property_contact_unlocks.count_documents({})
    unlock_revenue = total_unlocks * 10  # ₹10 per unlock
    
    # Top performing agents
    top_agents = await db.marketplace_agents.find({}, {"_id": 0}).sort("total_commission_earned", -1).limit(5).to_list(5)
    
    return {
        "success": True,
        "stats": {
            "total_agents": total_agents,
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "conversion_rate": round(conversion_rate, 2),
            "total_commission": commission_stats[0]["total_commission"] if commission_stats else 0,
            "total_agent_payout": commission_stats[0]["total_agent_payout"] if commission_stats else 0,
            "total_platform_fee": commission_stats[0]["total_platform_fee"] if commission_stats else 0,
            "total_contact_unlocks": total_unlocks,
            "unlock_revenue": unlock_revenue
        },
        "top_agents": top_agents
    }

@router.get("/stats/developer/{tenant_id}")
async def get_developer_marketplace_stats(tenant_id: str):
    """Get marketplace statistics for a specific developer/tenant"""
    # Leads received
    total_leads = await db.marketplace_leads.count_documents({"tenant_id": tenant_id})
    converted_leads = await db.marketplace_leads.count_documents({
        "tenant_id": tenant_id,
        "is_converted": True
    })
    
    # Commissions paid
    commission_pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$commission_amount"}
        }}
    ]
    commission_by_status = await db.agent_commissions.aggregate(commission_pipeline).to_list(None)
    
    # Recent leads
    recent_leads = await db.marketplace_leads.find({
        "tenant_id": tenant_id
    }).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "success": True,
        "stats": {
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "conversion_rate": round((converted_leads / total_leads * 100) if total_leads > 0 else 0, 2),
            "commission_by_status": commission_by_status
        },
        "recent_leads": recent_leads
    }
