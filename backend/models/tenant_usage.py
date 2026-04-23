from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
from datetime import datetime, timezone
import uuid

class TenantUsage(BaseModel):
    """Track tenant usage against their package limits"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Current usage counts
    projects_count: int = 0
    properties_count: int = 0
    users_count: int = 0
    
    # Communication usage (monthly reset)
    sms_used_this_month: int = 0
    email_used_this_month: int = 0
    whatsapp_used_this_month: int = 0
    
    # Storage usage
    storage_used_mb: float = 0.0
    
    # Period tracking
    current_period_start: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    current_period_end: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_reset_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Monthly history
    usage_history: Dict[str, Dict] = {}  # {"2025-01": {"sms": 500, "email": 1000}}
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UsageLimitCheck(BaseModel):
    """Result of usage limit check"""
    allowed: bool
    current_usage: int
    limit: int
    remaining: int
    limit_type: str  # "projects", "users", "sms", "email", etc.
    message: str

class UsageAlert(BaseModel):
    """Usage alert/notification"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    alert_type: str  # "warning", "limit_reached", "limit_exceeded"
    resource_type: str  # "projects", "sms", "email", "storage", etc.
    current_usage: int
    limit: int
    percentage_used: float
    message: str
    is_resolved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
