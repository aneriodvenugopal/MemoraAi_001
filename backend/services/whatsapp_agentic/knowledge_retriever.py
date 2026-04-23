"""
Knowledge Retriever for RAG-based AI responses
Retrieves relevant context from MongoDB for LLM responses
"""

from typing import Optional, Dict, Any, List
from datetime import datetime


class KnowledgeRetriever:
    """
    Retrieves project knowledge for AI responses
    Implements RAG (Retrieval Augmented Generation) pattern
    """
    
    def __init__(self, db):
        self.db = db
    
    async def get_project_knowledge(
        self, 
        tenant_id: str, 
        project_id: Optional[str] = None,
        query_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive project knowledge for AI context
        """
        knowledge = {
            "projects": [],
            "layouts": [],
            "available_plots": [],
            "pricing": [],
            "amenities": [],
            "location_highlights": [],
            "media": []
        }
        
        # Build project query
        project_query = {"tenant_id": tenant_id, "deleted_at": None}
        if project_id:
            project_query["id"] = project_id
        
        # Get projects
        projects = await self.db.projects.find(
            project_query,
            {"_id": 0}
        ).to_list(10)
        
        for project in projects:
            proj_data = {
                "id": project.get("id"),
                "name": project.get("name"),
                "description": project.get("description", ""),
                "location": project.get("location", ""),
                "city": project.get("city", ""),
                "project_type": project.get("project_type", ""),
                "total_units": project.get("total_units", 0),
                "status": project.get("status", ""),
                "rera_number": project.get("rera_number", ""),
                "amenities": project.get("amenities", []),
                "features": project.get("features", []),
                "brochure_url": project.get("brochure_url"),
                "images": project.get("images", [])[:3]  # Limit images
            }
            knowledge["projects"].append(proj_data)
            
            # Get layouts for this project
            layouts = await self.db.layouts.find(
                {
                    "tenant_id": tenant_id,
                    "project_id": project.get("id"),
                    "deleted_at": None
                },
                {"_id": 0}
            ).to_list(5)
            
            for layout in layouts:
                knowledge["layouts"].append({
                    "id": layout.get("id"),
                    "name": layout.get("name"),
                    "project_id": layout.get("project_id"),
                    "total_plots": layout.get("total_plots", 0),
                    "amenities": layout.get("amenities", [])
                })
        
        # Get available plots
        await self._get_available_plots(tenant_id, project_id, knowledge)
        
        # Get pricing info
        await self._get_pricing_info(tenant_id, project_id, knowledge)
        
        return knowledge
    
    async def _get_available_plots(
        self, 
        tenant_id: str, 
        project_id: Optional[str],
        knowledge: Dict
    ):
        """Get plots/properties with all statuses"""
        query = {
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if project_id:
            query["project_id"] = project_id
        
        plots = await self.db.properties.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(30).to_list(30)
        
        for plot in plots:
            knowledge["available_plots"].append({
                "id": plot.get("id"),
                "plot_number": plot.get("plot_number") or plot.get("property_number"),
                "area": plot.get("area_sqft") or plot.get("total_area"),
                "area_unit": plot.get("area_unit", "sqft"),
                "facing": plot.get("facing", ""),
                "price": plot.get("total_price") or plot.get("price"),
                "price_per_unit": plot.get("price_per_sqft"),
                "dimensions": plot.get("dimensions", ""),
                "status": plot.get("status"),
                "project_id": plot.get("project_id"),
                "layout_id": plot.get("layout_id"),
                "location": plot.get("location") or plot.get("location_text") or "",
                "city": plot.get("city", ""),
                "state": plot.get("state", ""),
                "latitude": plot.get("latitude"),
                "longitude": plot.get("longitude")
            })
    
    async def _get_pricing_info(
        self, 
        tenant_id: str, 
        project_id: Optional[str],
        knowledge: Dict
    ):
        """Get pricing information"""
        query = {"tenant_id": tenant_id}
        if project_id:
            query["project_id"] = project_id
        
        # Get from project_pricing collection if exists
        pricing = await self.db.project_pricing.find(
            query,
            {"_id": 0}
        ).to_list(10)
        
        for price in pricing:
            knowledge["pricing"].append({
                "project_id": price.get("project_id"),
                "base_price_per_sqft": price.get("base_price_per_sqft"),
                "premium_charges": price.get("premium_charges", {}),
                "payment_plans": price.get("payment_plans", [])
            })
    
    async def get_lead_context(
        self, 
        tenant_id: str, 
        lead_id: str
    ) -> Dict[str, Any]:
        """Get lead's history and preferences for personalized responses"""
        
        lead = await self.db.leads.find_one(
            {"tenant_id": tenant_id, "id": lead_id},
            {"_id": 0}
        )
        
        if not lead:
            return {}
        
        context = {
            "lead": {
                "name": lead.get("buyer_name", ""),
                "phone": lead.get("buyer_phone", ""),
                "email": lead.get("buyer_email", ""),
                "budget": lead.get("budget"),
                "preferred_location": lead.get("preferred_location", ""),
                "property_type": lead.get("property_type", ""),
                "status": lead.get("status", "new"),
                "source": lead.get("source", ""),
                "notes": lead.get("notes", "")
            },
            "interactions": [],
            "site_visits": [],
            "interested_projects": []
        }
        
        # Get previous interactions
        messages = await self.db.whatsapp_messages.find(
            {"tenant_id": tenant_id, "lead_id": lead_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(10).to_list(10)
        
        context["interactions"] = [
            {
                "role": msg.get("role"),
                "content": msg.get("content", "")[:200],  # Truncate
                "timestamp": msg.get("timestamp")
            }
            for msg in reversed(messages)
        ]
        
        # Get site visits
        visits = await self.db.site_visits.find(
            {"tenant_id": tenant_id, "lead_id": lead_id},
            {"_id": 0}
        ).to_list(5)
        
        context["site_visits"] = [
            {
                "project_id": v.get("project_id"),
                "status": v.get("status"),
                "scheduled_date": v.get("scheduled_date"),
                "outcome": v.get("outcome"),
                "feedback": v.get("feedback")
            }
            for v in visits
        ]
        
        return context
    
    async def search_plots_by_criteria(
        self,
        tenant_id: str,
        budget_min: Optional[float] = None,
        budget_max: Optional[float] = None,
        area_min: Optional[float] = None,
        area_max: Optional[float] = None,
        facing: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search plots matching customer criteria"""
        
        query = {
            "tenant_id": tenant_id,
            "status": {"$in": ["available", "Available", "AVAILABLE"]},
            "deleted_at": None
        }
        
        if project_id:
            query["project_id"] = project_id
        
        if budget_min or budget_max:
            price_query = {}
            if budget_min:
                price_query["$gte"] = budget_min
            if budget_max:
                price_query["$lte"] = budget_max
            query["$or"] = [
                {"total_price": price_query},
                {"price": price_query}
            ]
        
        if area_min or area_max:
            area_query = {}
            if area_min:
                area_query["$gte"] = area_min
            if area_max:
                area_query["$lte"] = area_max
            query["$or"] = query.get("$or", []) + [
                {"area_sqft": area_query},
                {"total_area": area_query}
            ]
        
        if facing:
            query["facing"] = {"$regex": facing, "$options": "i"}
        
        plots = await self.db.properties.find(
            query,
            {"_id": 0}
        ).limit(10).to_list(10)
        
        return plots
    
    def format_knowledge_for_llm(self, knowledge: Dict[str, Any]) -> str:
        """Format knowledge into a structured prompt context"""
        # Always use production URL for shared links
        base_url = "https://realapex.in"
        
        context_parts = []
        
        # Projects
        if knowledge.get("projects"):
            context_parts.append("## Available Projects:")
            for proj in knowledge["projects"]:
                project_id = proj.get('id', '')
                project_url = f"{base_url}/projects/{project_id}"
                public_layout_url = f"{base_url}/public/projects/{project_id}/layout"
                
                context_parts.append(f"""
Project: {proj['name']}
- Location: {proj.get('location', 'N/A')}, {proj.get('city', '')}
- Type: {proj.get('project_type', 'N/A')}
- Status: {proj.get('status', 'N/A')}
- Total Units: {proj.get('total_units', 'N/A')}
- RERA: {proj.get('rera_number', 'N/A')}
- Layout Link: {public_layout_url}
- Project Link: {project_url}
""")
        
        # Available Plots with status
        if knowledge.get("available_plots"):
            # Group by status
            status_counts = {}
            for plot in knowledge["available_plots"]:
                s = plot.get('status', 'unknown')
                status_counts[s] = status_counts.get(s, 0) + 1
            
            status_summary = ", ".join([f"{s}: {c}" for s, c in status_counts.items()])
            context_parts.append(f"\n## Plot Status Summary: {status_summary}")
            context_parts.append("\n## Available Plots:")
            for plot in knowledge["available_plots"][:10]:
                price = plot.get('price')
                price_str = f"₹{price:,.0f}" if price else "Contact for price"
                area = plot.get('area')
                area_str = f"{area} {plot.get('area_unit', 'sqft')}" if area else "N/A"
                location = plot.get('location', '')
                city = plot.get('city', '')
                location_str = f"{location}, {city}".strip(', ') if location or city else "N/A"
                lat = plot.get('latitude')
                lng = plot.get('longitude')
                maps_link = f"https://maps.google.com/?q={lat},{lng}" if lat and lng else ""
                
                context_parts.append(f"""
Plot #{plot.get('plot_number', 'N/A')}
- Area: {area_str}, Facing: {plot.get('facing', 'N/A')}
- Price: {price_str}
- Status: {plot.get('status', 'Available')}
- Location: {location_str}
{f'- Maps: {maps_link}' if maps_link else ''}
""")
        
        # Pricing
        if knowledge.get("pricing"):
            context_parts.append("\n## Pricing Information:")
            for price in knowledge["pricing"]:
                if price.get("base_price_per_sqft"):
                    context_parts.append(f"- Base price: ₹{price['base_price_per_sqft']:,.0f}/sqft")
        
        return "\n".join(context_parts) if context_parts else "No project information available."
    
    def format_lead_context_for_llm(self, lead_context: Dict[str, Any]) -> str:
        """Format lead context for LLM prompt"""
        
        if not lead_context.get("lead"):
            return ""
        
        lead = lead_context["lead"]
        parts = ["## Customer Information:"]
        
        if lead.get("name"):
            parts.append(f"- Name: {lead['name']}")
        if lead.get("budget"):
            parts.append(f"- Budget: ₹{lead['budget']:,.0f}")
        if lead.get("preferred_location"):
            parts.append(f"- Preferred Location: {lead['preferred_location']}")
        if lead.get("property_type"):
            parts.append(f"- Property Type: {lead['property_type']}")
        
        # Recent interactions
        if lead_context.get("interactions"):
            parts.append("\n## Recent Conversation:")
            for msg in lead_context["interactions"][-5:]:
                role = "Customer" if msg["role"] == "user" else "Agent"
                parts.append(f"{role}: {msg['content']}")
        
        # Site visits
        if lead_context.get("site_visits"):
            parts.append("\n## Site Visit History:")
            for visit in lead_context["site_visits"]:
                parts.append(f"- Status: {visit.get('status')}, Outcome: {visit.get('outcome', 'N/A')}")
        
        return "\n".join(parts)
