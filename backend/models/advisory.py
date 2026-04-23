"""
AI Advisory System Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AdvisoryCategory(BaseModel):
    id: str
    name: str
    slug: str
    icon: str
    description: str
    input_fields: List[str]  # Fields to ask user
    color: str

class AdvisorySession(BaseModel):
    id: str
    category: str  # budget, location, numerology, best_project, investment
    user_inputs: dict  # User provided data
    ai_response: str  # GPT-5 response
    recommended_projects: List[str] = []  # Project IDs
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    lead_captured: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class AdvisoryRequest(BaseModel):
    category: str
    user_inputs: dict
    tenant_id: Optional[str] = None

class AdvisoryLeadCapture(BaseModel):
    session_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    interested_project_id: Optional[str] = None
