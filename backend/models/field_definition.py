from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class ValidationRules(BaseModel):
    """Validation rules for field"""
    required: bool = False
    min: Optional[float] = None
    max: Optional[float] = None
    pattern: Optional[str] = None  # Regex pattern
    searchable: bool = True
    filterable: bool = True
    show_in_list: bool = True
    show_in_detail: bool = True

class FieldConfig(BaseModel):
    """Configuration for field types"""
    unit: Optional[str] = None  # sq.ft, acres, etc.
    options: List[str] = []  # For select/multiselect
    step: Optional[float] = None  # For number inputs
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    default_value: Optional[Any] = None
    validation_rules: ValidationRules = Field(default_factory=ValidationRules)

class FieldDefinition(BaseModel):
    """Master field definition for tenant"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None  # NULL = System default fields
    project_type: str  # venture, apartment, villa, farmland, plots, gated_community
    
    # Field details
    field_key: str  # plot_size, facing, bhk_type, etc.
    field_label: str  # "Plot Size", "Facing", "BHK Type"
    field_type: str  # number, string, select, multiselect, boolean, date, textarea, url
    
    # Configuration
    config: FieldConfig
    
    # Categorization
    category: str  # dimensions, amenities, legal, location, pricing, features
    display_order: int = 0
    
    # Field metadata
    is_system_field: bool = False  # System fields can't be deleted
    is_active: bool = True
    version: int = 1
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    deprecated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class FieldDefinitionCreate(BaseModel):
    """Create field definition"""
    project_type: str
    field_key: str
    field_label: str
    field_type: str
    config: FieldConfig
    category: str = "general"
    display_order: int = 0

class FieldDefinitionUpdate(BaseModel):
    """Update field definition"""
    field_label: Optional[str] = None
    config: Optional[FieldConfig] = None
    category: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class ProjectFieldSchema(BaseModel):
    """Field schema for a specific project"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    project_type: str
    
    # Active fields for this project
    fields: List[Dict[str, Any]] = []  # List of field references
    
    # Quick access lists
    searchable_fields: List[str] = []
    required_fields: List[str] = []
    
    version: int = 1
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
