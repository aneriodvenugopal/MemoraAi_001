"""
Document Locker Models
- Simple document storage with physical location mapping
- NO AI, NO automation, NO smart features
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class PhysicalLocation(BaseModel):
    """Physical storage location master - where physical files are kept"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Location details
    name: str  # e.g., "OFFICE-STORAGE-1", "SITE-OFFICE-RACK-A"
    description: Optional[str] = None  # e.g., "Main office filing cabinet"
    
    # Sequence tracking
    last_order_number: int = 0  # Auto-incremented for each document
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class PhysicalLocationCreate(BaseModel):
    name: str
    description: Optional[str] = None


class Document(BaseModel):
    """Document metadata with physical location mapping"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: Optional[str] = None  # Optional project association
    
    # Customer details (MANDATORY)
    customer_name: str
    customer_mobile: str
    customer_email: Optional[EmailStr] = None  # Optional, can be added later
    
    # Document details
    document_name: str  # User-given name
    document_type: Optional[str] = None  # sale-deed, agreement, approval, etc.
    file_url: str  # Stored file URL
    file_type: str  # pdf, jpg, png, doc
    file_size: int = 0  # In bytes
    
    # Keywords for search (manually entered)
    keywords: List[str] = []  # e.g., ["sale-deed", "plot-123", "agreement"]
    
    # Physical Location Mapping (CRITICAL)
    physical_location_id: str  # Reference to PhysicalLocation
    physical_location_name: str  # Denormalized for display
    order_number: int  # Sequence within location
    physical_code: str  # e.g., "OFFICE-STORAGE-1-001" - written on physical file
    
    # Notes
    notes: Optional[str] = None
    
    # Audit
    uploaded_by: str  # User ID
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    is_active: bool = True
    deleted_at: Optional[datetime] = None


class DocumentCreate(BaseModel):
    project_id: Optional[str] = None
    customer_name: str
    customer_mobile: str
    customer_email: Optional[EmailStr] = None
    document_name: str
    document_type: Optional[str] = None
    file_url: str
    file_type: str
    file_size: int = 0
    keywords: List[str] = []
    physical_location_id: str
    notes: Optional[str] = None


class DocumentUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    document_name: Optional[str] = None
    document_type: Optional[str] = None
    keywords: Optional[List[str]] = None
    notes: Optional[str] = None


class DocumentSearch(BaseModel):
    """Search parameters"""
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    keyword: Optional[str] = None
    project_id: Optional[str] = None
