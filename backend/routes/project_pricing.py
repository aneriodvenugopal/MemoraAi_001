"""
Project Pricing Configuration API Routes
Manage unit pricing, additional charges, and booking amounts at project level
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional, List
from datetime import datetime, timezone

from models.project_pricing import (
    ProjectPricingConfig, ProjectPricingConfigCreate, ProjectPricingConfigUpdate,
    PropertyPricingOverride, PriceBreakdown, AdditionalCharge,
    UNIT_TYPES, ADDITIONAL_CHARGE_PRESETS
)
from middleware.auth import get_current_user

router = APIRouter(prefix="/project-pricing", tags=["project-pricing"])


def get_db(request: Request):
    return request.app.state.db


# ==================== Utility Functions ====================

async def calculate_price_breakdown(
    db, property_id: str, project_pricing: dict, property_doc: dict, override: dict = None
) -> PriceBreakdown:
    """Calculate complete price breakdown for a property"""
    
    area = property_doc.get("area", 0)
    
    # Get base price (check for override)
    if override and override.get("override_base_price") and override.get("custom_base_price_per_unit"):
        base_price_per_unit = override["custom_base_price_per_unit"]
    else:
        base_price_per_unit = project_pricing.get("base_price_per_unit", 0)
    
    # Calculate base cost
    base_cost = area * base_price_per_unit
    adjusted_base_cost = base_cost
    
    # Apply price adjustment (premium/discount)
    price_adjustment_amount = 0
    if override:
        adj_type = override.get("price_adjustment_type", "none")
        adj_value = override.get("price_adjustment_value", 0)
        
        if adj_type == "premium" and adj_value > 0:
            price_adjustment_amount = (base_cost * adj_value) / 100
            adjusted_base_cost = base_cost + price_adjustment_amount
        elif adj_type == "discount" and adj_value > 0:
            price_adjustment_amount = (base_cost * adj_value) / 100
            adjusted_base_cost = base_cost - price_adjustment_amount
    
    # Get additional charges
    if override and override.get("override_additional_charges"):
        additional_charges_config = override.get("custom_additional_charges", [])
    else:
        additional_charges_config = project_pricing.get("additional_charges", [])
    
    # Calculate additional charges
    additional_charges = []
    total_additional = 0
    
    for charge in additional_charges_config:
        charge_label = charge.get("label", "Charge")
        charge_type = charge.get("charge_type", "fixed")
        charge_value = charge.get("value", 0)
        
        if charge_type == "percentage":
            amount = (adjusted_base_cost * charge_value) / 100
        else:
            amount = charge_value
        
        additional_charges.append({
            "label": charge_label,
            "type": charge_type,
            "value": charge_value,
            "amount": round(amount, 2)
        })
        total_additional += amount
    
    # Calculate GST if applicable
    gst_percentage = project_pricing.get("gst_percentage", 0) if project_pricing.get("apply_gst") else 0
    gst_amount = 0
    if gst_percentage > 0 and not project_pricing.get("gst_included_in_price"):
        gst_amount = (adjusted_base_cost * gst_percentage) / 100
    
    # Total property cost
    total_property_cost = adjusted_base_cost + total_additional + gst_amount
    
    # Calculate booking amount
    if override and override.get("override_booking_amount"):
        booking_type = override.get("custom_booking_amount_type", "fixed")
        booking_value = override.get("custom_booking_amount_value", 5000)
    else:
        booking_type = project_pricing.get("booking_amount_type", "fixed")
        booking_value = project_pricing.get("booking_amount_value", 5000)
    
    if booking_type == "percentage":
        calculated_booking = (total_property_cost * booking_value) / 100
        # Apply min/max limits
        min_booking = project_pricing.get("min_booking_amount")
        max_booking = project_pricing.get("max_booking_amount")
        if min_booking and calculated_booking < min_booking:
            calculated_booking = min_booking
        if max_booking and calculated_booking > max_booking:
            calculated_booking = max_booking
    else:
        calculated_booking = booking_value
    
    return PriceBreakdown(
        property_id=property_id,
        project_id=property_doc.get("project_id", ""),
        area=area,
        unit_type=project_pricing.get("unit_type", "sq.yard"),
        unit_label=project_pricing.get("unit_label", "Sq. Yard"),
        base_price_per_unit=base_price_per_unit,
        base_cost=round(base_cost, 2),
        has_price_adjustment=price_adjustment_amount != 0,
        price_adjustment_type=override.get("price_adjustment_type") if override else None,
        price_adjustment_value=override.get("price_adjustment_value", 0) if override else 0,
        price_adjustment_amount=round(price_adjustment_amount, 2),
        adjusted_base_cost=round(adjusted_base_cost, 2),
        additional_charges=additional_charges,
        total_additional_charges=round(total_additional, 2),
        gst_percentage=gst_percentage,
        gst_amount=round(gst_amount, 2),
        total_property_cost=round(total_property_cost, 2),
        booking_amount_type=booking_type,
        booking_amount_value=booking_value,
        calculated_booking_amount=round(calculated_booking, 2),
        balance_amount=round(total_property_cost - calculated_booking, 2)
    )


# ==================== Configuration Routes ====================

@router.get("/unit-types")
async def get_unit_types():
    """Get list of available unit types"""
    return {"unit_types": UNIT_TYPES}


@router.get("/charge-presets")
async def get_charge_presets():
    """Get preset additional charges for quick setup"""
    return {"presets": ADDITIONAL_CHARGE_PRESETS}


@router.get("/project/{project_id}")
async def get_project_pricing(
    project_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get pricing configuration for a project"""
    db = get_db(request)
    
    # Verify project exists and user has access
    project = await db.projects.find_one({
        "id": project_id,
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get pricing config
    pricing = await db.project_pricing_configs.find_one({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not pricing:
        # Return default config
        pricing = {
            "project_id": project_id,
            "tenant_id": current_user["tenant_id"],
            "unit_type": "sq.yard",
            "unit_label": "Sq. Yard",
            "base_price_per_unit": project.get("price_per_unit", 0),
            "booking_amount_type": "fixed",
            "booking_amount_value": 5000,
            "additional_charges": [],
            "apply_gst": False,
            "gst_percentage": 0,
            "allow_property_override": True,
            "is_default": True
        }
    
    return pricing


@router.post("/project/{project_id}")
async def create_or_update_project_pricing(
    project_id: str,
    config: ProjectPricingConfigCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create or update pricing configuration for a project"""
    db = get_db(request)
    
    # Verify project exists
    project = await db.projects.find_one({
        "id": project_id,
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if config exists
    existing = await db.project_pricing_configs.find_one({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Update existing
        update_data = config.model_dump(exclude_unset=True)
        update_data["updated_at"] = now
        update_data["updated_by"] = current_user.get("user_id") or current_user.get("id")
        
        await db.project_pricing_configs.update_one(
            {"project_id": project_id, "tenant_id": current_user["tenant_id"]},
            {"$set": update_data}
        )
        
        updated = await db.project_pricing_configs.find_one(
            {"project_id": project_id, "tenant_id": current_user["tenant_id"]},
            {"_id": 0}
        )
        return {"message": "Pricing configuration updated", "config": updated}
    else:
        # Create new - exclude project_id from config as we set it explicitly
        config_data = config.model_dump(exclude={"project_id"})
        new_config = ProjectPricingConfig(
            project_id=project_id,
            tenant_id=current_user["tenant_id"],
            **config_data
        )
        new_config_dict = new_config.model_dump()
        new_config_dict["created_by"] = current_user.get("user_id") or current_user.get("id")
        
        await db.project_pricing_configs.insert_one(new_config_dict)
        
        # Remove _id for response
        new_config_dict.pop("_id", None)
        return {"message": "Pricing configuration created", "config": new_config_dict}


@router.patch("/project/{project_id}")
async def update_project_pricing(
    project_id: str,
    config: ProjectPricingConfigUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Partially update pricing configuration"""
    db = get_db(request)
    
    existing = await db.project_pricing_configs.find_one({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Pricing configuration not found. Create one first.")
    
    update_data = config.model_dump(exclude_unset=True, exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = current_user.get("user_id") or current_user.get("id")
    
    await db.project_pricing_configs.update_one(
        {"project_id": project_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    updated = await db.project_pricing_configs.find_one(
        {"project_id": project_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    return {"message": "Pricing configuration updated", "config": updated}


# ==================== Additional Charges Management ====================

@router.post("/project/{project_id}/charges")
async def add_additional_charge(
    project_id: str,
    charge: AdditionalCharge,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Add an additional charge to project pricing"""
    db = get_db(request)
    
    existing = await db.project_pricing_configs.find_one({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if not existing:
        # Create default config first
        new_config = ProjectPricingConfig(
            project_id=project_id,
            tenant_id=current_user["tenant_id"],
            additional_charges=[charge]
        )
        await db.project_pricing_configs.insert_one(new_config.model_dump())
    else:
        await db.project_pricing_configs.update_one(
            {"project_id": project_id, "tenant_id": current_user["tenant_id"]},
            {
                "$push": {"additional_charges": charge.model_dump()},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    return {"message": "Additional charge added", "charge": charge}


@router.delete("/project/{project_id}/charges/{charge_id}")
async def remove_additional_charge(
    project_id: str,
    charge_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Remove an additional charge from project pricing"""
    db = get_db(request)
    
    result = await db.project_pricing_configs.update_one(
        {"project_id": project_id, "tenant_id": current_user["tenant_id"]},
        {
            "$pull": {"additional_charges": {"id": charge_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Charge not found")
    
    return {"message": "Additional charge removed"}


# ==================== Property Override Routes ====================

@router.get("/property/{property_id}/override")
async def get_property_override(
    property_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get pricing override for a specific property"""
    db = get_db(request)
    
    override = await db.property_pricing_overrides.find_one({
        "property_id": property_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    return override or {"property_id": property_id, "has_override": False}


@router.post("/property/{property_id}/override")
async def set_property_override(
    property_id: str,
    override_data: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Set or update pricing override for a property"""
    db = get_db(request)
    
    # Verify property exists
    property_doc = await db.properties.find_one({
        "id": property_id,
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }, {"_id": 0})
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if project allows override
    project_pricing = await db.project_pricing_configs.find_one({
        "project_id": property_doc.get("project_id"),
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if project_pricing and not project_pricing.get("allow_property_override", True):
        raise HTTPException(status_code=400, detail="Project does not allow property-level pricing override")
    
    now = datetime.now(timezone.utc).isoformat()
    
    override_doc = {
        "property_id": property_id,
        "project_id": property_doc.get("project_id"),
        "tenant_id": current_user["tenant_id"],
        **override_data,
        "updated_at": now
    }
    
    existing = await db.property_pricing_overrides.find_one({
        "property_id": property_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if existing:
        await db.property_pricing_overrides.update_one(
            {"property_id": property_id, "tenant_id": current_user["tenant_id"]},
            {"$set": override_doc}
        )
    else:
        override_doc["id"] = str(__import__("uuid").uuid4())
        override_doc["created_at"] = now
        await db.property_pricing_overrides.insert_one(override_doc)
    
    result = await db.property_pricing_overrides.find_one(
        {"property_id": property_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    
    return {"message": "Property pricing override saved", "override": result}


@router.delete("/property/{property_id}/override")
async def remove_property_override(
    property_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Remove pricing override for a property (use project defaults)"""
    db = get_db(request)
    
    result = await db.property_pricing_overrides.delete_one({
        "property_id": property_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No override found for this property")
    
    return {"message": "Property pricing override removed"}


# ==================== Price Calculation Routes ====================

@router.get("/property/{property_id}/breakdown")
async def get_property_price_breakdown(
    property_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Calculate and return complete price breakdown for a property"""
    db = get_db(request)
    
    # Get property
    property_doc = await db.properties.find_one({
        "id": property_id,
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }, {"_id": 0})
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get project pricing
    project_pricing = await db.project_pricing_configs.find_one({
        "project_id": property_doc.get("project_id"),
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not project_pricing:
        # Use defaults
        project_pricing = {
            "unit_type": "sq.yard",
            "unit_label": "Sq. Yard",
            "base_price_per_unit": 0,
            "booking_amount_type": "fixed",
            "booking_amount_value": 5000,
            "additional_charges": [],
            "apply_gst": False,
            "gst_percentage": 0
        }
    
    # Get property override
    override = await db.property_pricing_overrides.find_one({
        "property_id": property_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    # Calculate breakdown
    breakdown = await calculate_price_breakdown(db, property_id, project_pricing, property_doc, override)
    
    return breakdown


@router.post("/project/{project_id}/calculate-bulk")
async def calculate_bulk_pricing(
    project_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Calculate pricing for all properties in a project"""
    db = get_db(request)
    
    # Get project pricing
    project_pricing = await db.project_pricing_configs.find_one({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not project_pricing:
        raise HTTPException(status_code=404, detail="Project pricing configuration not found")
    
    # Get all properties in project
    properties = await db.properties.find({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }, {"_id": 0}).to_list(1000)
    
    # Get all overrides for this project
    overrides = await db.property_pricing_overrides.find({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0}).to_list(1000)
    
    override_map = {o["property_id"]: o for o in overrides}
    
    results = []
    for prop in properties:
        override = override_map.get(prop["id"])
        breakdown = await calculate_price_breakdown(db, prop["id"], project_pricing, prop, override)
        results.append({
            "property_id": prop["id"],
            "property_number": prop.get("property_number"),
            "area": prop.get("area"),
            "total_cost": breakdown.total_property_cost,
            "booking_amount": breakdown.calculated_booking_amount,
            "has_override": override is not None
        })
    
    return {
        "project_id": project_id,
        "total_properties": len(results),
        "properties": results
    }


@router.post("/project/{project_id}/apply-to-properties")
async def apply_pricing_to_properties(
    project_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Apply project pricing to all properties (update property prices)"""
    db = get_db(request)
    
    # Get project pricing
    project_pricing = await db.project_pricing_configs.find_one({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0})
    
    if not project_pricing:
        raise HTTPException(status_code=404, detail="Project pricing configuration not found")
    
    # Get all properties
    properties = await db.properties.find({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }, {"_id": 0}).to_list(1000)
    
    # Get overrides
    overrides = await db.property_pricing_overrides.find({
        "project_id": project_id,
        "tenant_id": current_user["tenant_id"]
    }, {"_id": 0}).to_list(1000)
    
    override_map = {o["property_id"]: o for o in overrides}
    
    updated_count = 0
    for prop in properties:
        override = override_map.get(prop["id"])
        breakdown = await calculate_price_breakdown(db, prop["id"], project_pricing, prop, override)
        
        # Update property with calculated price
        await db.properties.update_one(
            {"id": prop["id"]},
            {"$set": {
                "price": breakdown.total_property_cost,
                "base_price": breakdown.base_cost,
                "booking_amount": breakdown.calculated_booking_amount,
                "price_per_unit": breakdown.base_price_per_unit,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        updated_count += 1
    
    return {
        "message": f"Pricing applied to {updated_count} properties",
        "updated_count": updated_count
    }
