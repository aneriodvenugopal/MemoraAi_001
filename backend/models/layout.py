from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class Coordinate(BaseModel):
    x: float
    y: float

class LayoutPlot(BaseModel):
    id: str
    display_name: str
    block: Optional[str] = None
    coordinates: List[Coordinate]
    price: float
    area: float
    status: str  # available, booked, blocked, sold
    amenities: List[str] = []
    property_id: Optional[str] = None  # Link to actual property
    customer_name: Optional[str] = None  # If booked/sold
    booking_date: Optional[str] = None

# Master Layout - Reusable layout templates
class MasterLayout(BaseModel):
    id: str
    tenant_id: Optional[str] = None  # None for Super Admin templates
    layout_name: str
    layout_type: str  # venture, apartment, open_land, farm_land, other
    svg_content: Optional[str] = None  # Full SVG code
    svg_url: Optional[str] = None  # Or URL to SVG file
    svg_file_path: Optional[str] = None  # Server file path
    plots: List[LayoutPlot]
    metadata: Dict = {}
    is_template: bool = False  # True for Super Admin global templates
    created_by: str  # User ID
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None

# Project Layout - Links project to a master layout
class ProjectLayout(BaseModel):
    id: str
    project_id: str
    layout_id: str  # Reference to MasterLayout
    tenant_id: str
    custom_plots: Optional[List[LayoutPlot]] = None  # Override plots if needed
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None

# Create Master Layout
class MasterLayoutCreate(BaseModel):
    layout_name: str
    layout_type: str  # venture, apartment, open_land, farm_land, other
    svg_content: Optional[str] = None
    svg_url: Optional[str] = None
    plots: List[LayoutPlot] = []
    metadata: Dict = {}
    is_template: bool = False

# Update Master Layout
class MasterLayoutUpdate(BaseModel):
    layout_name: Optional[str] = None
    layout_type: Optional[str] = None
    svg_content: Optional[str] = None
    svg_url: Optional[str] = None
    plots: Optional[List[LayoutPlot]] = None
    metadata: Optional[Dict] = None

# Legacy - for backward compatibility
class LayoutCreate(BaseModel):
    layout_name: str
    svg_content: Optional[str] = None
    svg_url: Optional[str] = None
    plots: Optional[List[LayoutPlot]] = []
    metadata: Dict = {}

class LayoutUpdate(BaseModel):
    layout_name: Optional[str] = None
    svg_content: Optional[str] = None
    svg_url: Optional[str] = None
    plots: Optional[List[LayoutPlot]] = None
    metadata: Optional[Dict] = None

class PlotStatusUpdate(BaseModel):
    status: str
    property_id: Optional[str] = None
    customer_name: Optional[str] = None
    booking_date: Optional[str] = None

# Assign layout to project
class ProjectLayoutAssign(BaseModel):
    layout_id: str
    custom_plots: Optional[List[LayoutPlot]] = None
