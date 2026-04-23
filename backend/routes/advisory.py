"""
AI Advisory System Routes
DUAL SYSTEM:
- Authenticated users (tenant/staff login) → AI-powered (Emergent LLM)
- Public website users → Template-based (Free, no cost)
"""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
import uuid
from datetime import datetime
from models.advisory import AdvisorySession, AdvisoryRequest, AdvisoryLeadCapture

router = APIRouter(prefix="/advisory", tags=["advisory"])

# Advisory Categories
ADVISORY_CATEGORIES = [
    {
        "id": "budget",
        "name": "Budget Advisory",
        "slug": "budget",
        "icon": "💰",
        "description": "Find the best properties within your budget",
        "color": "#10B981",
        "input_fields": ["budget", "location", "property_type"]
    },
    {
        "id": "location",
        "name": "Location Highlights",
        "slug": "location",
        "icon": "📍",
        "description": "Discover location advantages and growth potential",
        "color": "#3B82F6",
        "input_fields": ["location", "work_location", "priorities"]
    },
    {
        "id": "numerology",
        "name": "Numerology Advisory",
        "slug": "numerology",
        "icon": "🔢",
        "description": "Property selection based on numerology",
        "color": "#8B5CF6",
        "input_fields": ["dob", "lucky_numbers", "direction"]
    },
    {
        "id": "best_project",
        "name": "Best Project Advisory",
        "slug": "best_project",
        "icon": "⭐",
        "description": "Find the perfect project for your needs",
        "color": "#F59E0B",
        "input_fields": ["requirements", "timeline", "priorities"]
    },
    {
        "id": "investment",
        "name": "Future Investment Advisory",
        "slug": "investment",
        "icon": "📈",
        "description": "Investment potential and ROI analysis",
        "color": "#EF4444",
        "input_fields": ["investment_amount", "timeline", "roi_expectations"]
    }
]

@router.get("/categories")
async def get_advisory_categories():
    """Get all advisory categories"""
    return {"categories": ADVISORY_CATEGORIES}

@router.post("/get-advice", response_model=AdvisorySession)
async def get_advisory(request: Request, advisory_request: AdvisoryRequest):
    """
    Get AI advisory based on category and user inputs
    """
    try:
        db = request.app.state.db
        
        # Validate category
        if advisory_request.category not in [c["id"] for c in ADVISORY_CATEGORIES]:
            raise HTTPException(status_code=400, detail="Invalid advisory category")
        
        # Get projects for recommendations
        query = {"status": "active"}
        if advisory_request.tenant_id:
            query["tenant_id"] = advisory_request.tenant_id
        
        projects = await db.projects.find(query).limit(10).to_list(length=10)
        
        # DUAL ADVISORY SYSTEM:
        # - Logged-in users (tenants/staff) → AI-powered (Emergent LLM)
        # - Public users → Template-based (Free, no API cost)
        
        # Check if user is authenticated
        auth_header = request.headers.get('authorization', '')
        is_authenticated = bool(auth_header and auth_header.startswith('Bearer '))
        
        if is_authenticated:
            # PAID: Logged-in tenant/staff gets AI-powered advisory
            from services.hybrid_advisory_service import hybrid_advisory_service
            ai_response = await hybrid_advisory_service.get_advisory(
                advisory_request.category,
                advisory_request.user_inputs,
                projects
            )
            advisory_type = "ai_powered"
        else:
            # FREE: Public website users get template-based advisory
            from services.free_advisory_service import free_advisory_service
            ai_response = await free_advisory_service.get_advisory(
                advisory_request.category,
                advisory_request.user_inputs,
                projects
            )
            # Add contact prompt for free users (subtle, no AI mention)
            ai_response += "\n\n---\n\n📞 **Need More Detailed Advisory?**\n\nFor specialized, in-depth analysis tailored to your specific situation, please contact our property consultants or login to your ExlainERP account.\n"
            advisory_type = "template_based"
        
        # Extract recommended project names from response (simple matching)
        recommended_projects = []
        for project in projects:
            if project.get('name', '').lower() in ai_response.lower():
                recommended_projects.append(project['id'])
        
        # Create session
        session = {
            "id": str(uuid.uuid4()),
            "category": advisory_request.category,
            "user_inputs": advisory_request.user_inputs,
            "ai_response": ai_response,
            "recommended_projects": recommended_projects,
            "tenant_id": advisory_request.tenant_id,
            "lead_captured": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Save session
        await db.advisory_sessions.insert_one(session)
        
        return AdvisorySession(**session)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/capture-lead")
async def capture_advisory_lead(request: Request, lead_data: AdvisoryLeadCapture):
    """
    Capture lead from advisory session
    """
    try:
        db = request.app.state.db
        
        # Find session
        session = await db.advisory_sessions.find_one({"id": lead_data.session_id})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session with lead info
        await db.advisory_sessions.update_one(
            {"id": lead_data.session_id},
            {
                "$set": {
                    "user_name": lead_data.name,
                    "user_email": lead_data.email,
                    "user_phone": lead_data.phone,
                    "lead_captured": True
                }
            }
        )
        
        # Create lead in main leads collection
        lead = {
            "id": str(uuid.uuid4()),
            "name": lead_data.name,
            "email": lead_data.email,
            "phone": lead_data.phone,
            "source": f"AI Advisory - {session['category']}",
            "status": "new",
            "quality": "hot",  # AI advisory leads are high quality
            "notes": f"Interested via {session['category']} advisory",
            "tenant_id": session.get('tenant_id'),
            "project_id": lead_data.interested_project_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await db.leads.insert_one(lead)
        
        return {"success": True, "message": "Thank you! We'll contact you soon."}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_advisory_stats(request: Request, tenant_id: Optional[str] = None):
    """
    Get advisory statistics
    """
    try:
        db = request.app.state.db
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        # Total sessions
        total_sessions = await db.advisory_sessions.count_documents(query)
        
        # Sessions by category
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$category",
                "count": {"$sum": 1},
                "leads_captured": {
                    "$sum": {"$cond": ["$lead_captured", 1, 0]}
                }
            }}
        ]
        
        category_stats = await db.advisory_sessions.aggregate(pipeline).to_list(length=None)
        
        # Total leads
        lead_query = {**query, "lead_captured": True}
        total_leads = await db.advisory_sessions.count_documents(lead_query)
        
        return {
            "total_sessions": total_sessions,
            "total_leads": total_leads,
            "conversion_rate": round((total_leads / total_sessions * 100) if total_sessions > 0 else 0, 2),
            "by_category": category_stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_advisory_sessions(
    request: Request,
    tenant_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50
):
    """
    Get advisory sessions (Admin only)
    """
    try:
        db = request.app.state.db
        
        query = {}
        if tenant_id:
            query["tenant_id"] = tenant_id
        if category:
            query["category"] = category
        
        sessions = await db.advisory_sessions.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        return {"sessions": sessions}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
