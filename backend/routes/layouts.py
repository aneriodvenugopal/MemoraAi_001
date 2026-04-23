from fastapi import APIRouter, HTTPException, Request
from models.layout import ProjectLayout, LayoutCreate, LayoutUpdate, PlotStatusUpdate
from datetime import datetime, timezone
import uuid
from middleware.auth import get_current_user

router = APIRouter(prefix="/layouts", tags=["layouts"])

def get_db(request: Request):
    return request.app.state.db

@router.get("/public/projects/{project_id}/layout")
async def get_public_layout(project_id: str, request: Request):
    """Get layout for public viewing - NO AUTH REQUIRED"""
    db = get_db(request)
    
    # Get the layout
    layout = await db.project_layouts.find_one({
        'project_id': project_id,
        'deleted_at': None
    }, {'_id': 0})
    
    # Get project details - include all public-relevant fields including location data
    project = await db.projects.find_one(
        {'id': project_id, 'deleted_at': None},
        {
            '_id': 0, 
            'id': 1, 
            'name': 1, 
            'location': 1, 
            'city': 1, 
            'state': 1, 
            'description': 1,
            'latitude': 1,
            'longitude': 1,
            'google_maps_url': 1,
            'landmarks': 1,
            'property_images': 1,
            'images': 1,
            'gallery': 1,
            'property_videos': 1,
            'videos': 1,
            'video_url': 1,
            'youtube_url': 1,
            'amenities': 1,
            'features': 1
        }
    )
    
    if not layout or not project:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Enrich plot data with property details from properties collection
    if layout.get('plots'):
        enriched_plots = []
        for plot in layout['plots']:
            # Try to find matching property by plot_id or display_name
            property_data = await db.properties.find_one({
                'project_id': project_id,
                '$or': [
                    {'layout_plot_id': plot.get('id')},
                    {'property_number': plot.get('display_name')},
                    {'plot_number': plot.get('display_name')}
                ],
                'deleted_at': None
            }, {'_id': 0})
            
            if property_data:
                # Merge property data into plot - property data takes precedence for media
                enriched_plot = {**plot}
                # Add media fields from property if they exist
                if property_data.get('property_images') or property_data.get('images'):
                    enriched_plot['property_images'] = property_data.get('property_images') or property_data.get('images', [])
                if property_data.get('property_videos') or property_data.get('videos'):
                    enriched_plot['property_videos'] = property_data.get('property_videos') or property_data.get('videos', [])
                if property_data.get('video_url'):
                    enriched_plot['video_url'] = property_data.get('video_url')
                if property_data.get('youtube_url'):
                    enriched_plot['youtube_url'] = property_data.get('youtube_url')
                # Add location data if present
                if property_data.get('latitude'):
                    enriched_plot['latitude'] = property_data.get('latitude')
                if property_data.get('longitude'):
                    enriched_plot['longitude'] = property_data.get('longitude')
                if property_data.get('google_maps_url'):
                    enriched_plot['google_maps_url'] = property_data.get('google_maps_url')
                # Update status from property if available
                if property_data.get('status'):
                    enriched_plot['status'] = property_data.get('status')
                # Add other useful fields
                if property_data.get('amenities'):
                    enriched_plot['amenities'] = property_data.get('amenities')
                if property_data.get('facing'):
                    enriched_plot['facing'] = property_data.get('facing')
                if property_data.get('area'):
                    enriched_plot['area'] = property_data.get('area')
                if property_data.get('price'):
                    enriched_plot['price'] = property_data.get('price')
                    
                enriched_plots.append(enriched_plot)
            else:
                enriched_plots.append(plot)
        
        layout['plots'] = enriched_plots
    
    return {
        'success': True,
        'layout': layout,
        'project': project
    }


@router.post("/projects/{project_id}/layout")
async def create_project_layout(
    project_id: str,
    layout_data: LayoutCreate,
    request: Request
):
    """Create or update layout for a project"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if project exists - super_admin can access all, others only their tenant
    if user.get('role') == 'super_admin':
        project = await db.projects.find_one({
            'id': project_id,
            'deleted_at': None
        })
    else:
        project = await db.projects.find_one({
            'id': project_id,
            'tenant_id': user['tenant_id'],
            'deleted_at': None
        })
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use project's tenant_id for the layout
    tenant_id = project.get('tenant_id') or user.get('tenant_id')
    
    # Check if layout already exists
    existing_layout = await db.project_layouts.find_one({
        'project_id': project_id,
        'deleted_at': None
    })
    
    if existing_layout:
        # Update existing layout
        update_data = {
            'layout_name': layout_data.layout_name,
            'svg_content': layout_data.svg_content,
            'svg_url': layout_data.svg_url,
            'plots': [plot.dict() for plot in layout_data.plots] if layout_data.plots else [],
            'metadata': layout_data.metadata,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.project_layouts.update_one(
            {'id': existing_layout['id']},
            {'$set': update_data}
        )
        
        return {"success": True, "message": "Layout updated successfully", "layout_id": existing_layout['id']}
    else:
        # Create new layout
        layout_id = str(uuid.uuid4())
        layout_doc = {
            'id': layout_id,
            'project_id': project_id,
            'tenant_id': tenant_id,
            'layout_name': layout_data.layout_name,
            'svg_content': layout_data.svg_content,
            'svg_url': layout_data.svg_url,
            'plots': [plot.dict() for plot in layout_data.plots] if layout_data.plots else [],
            'metadata': layout_data.metadata,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'deleted_at': None
        }
        
        await db.project_layouts.insert_one(layout_doc)
        
        return {"success": True, "message": "Layout created successfully", "layout_id": layout_id}

@router.get("/projects/{project_id}/layout")
async def get_project_layout(project_id: str, request: Request):
    """Get layout for a project (authenticated)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Super admin can access all layouts, others only their tenant
    if user.get('role') == 'super_admin':
        layout = await db.project_layouts.find_one({
            'project_id': project_id,
            'deleted_at': None
        }, {'_id': 0})
    else:
        layout = await db.project_layouts.find_one({
            'project_id': project_id,
            'tenant_id': user['tenant_id'],
            'deleted_at': None
        }, {'_id': 0})
    
    # Get project details
    project = await db.projects.find_one(
        {'id': project_id, 'deleted_at': None},
        {'_id': 0}
    )
    
    # Return success response with layout (can be None if not found)
    return {
        'success': True,
        'layout': layout,
        'project': project
    }

@router.patch("/projects/{project_id}/layout/plots/{plot_id}")
async def update_plot_status(
    project_id: str,
    plot_id: str,
    status_update: PlotStatusUpdate,
    request: Request
):
    """Update status of a specific plot"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get layout
    layout = await db.project_layouts.find_one({
        'project_id': project_id,
        'tenant_id': user['tenant_id'],
        'deleted_at': None
    })
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Find and update the plot
    plots = layout['plots']
    plot_found = False
    
    for plot in plots:
        if plot['id'] == plot_id:
            plot['status'] = status_update.status
            if status_update.property_id:
                plot['property_id'] = status_update.property_id
            if status_update.customer_name:
                plot['customer_name'] = status_update.customer_name
            if status_update.booking_date:
                plot['booking_date'] = status_update.booking_date
            plot_found = True
            break
    
    if not plot_found:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    # Update layout
    await db.project_layouts.update_one(
        {'id': layout['id']},
        {
            '$set': {
                'plots': plots,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Plot status updated successfully"}

@router.put("/{layout_id}/plots/coordinates")
async def update_plot_coordinates(
    layout_id: str,
    plots_data: dict,
    request: Request
):
    """Update coordinates/boundaries for multiple plots"""
    db = get_db(request)
    
    try:
        # Get layout
        layout = await db.master_layouts.find_one({
            'id': layout_id,
            'deleted_at': None
        })
        
        if not layout:
            raise HTTPException(status_code=404, detail="Layout not found")
        
        # Get updated plots from request
        updated_plots = plots_data.get('plots', [])
        
        if not updated_plots:
            raise HTTPException(status_code=400, detail="No plots data provided")
        
        # Update layout with new plot coordinates
        await db.master_layouts.update_one(
            {'id': layout_id},
            {
                '$set': {
                    'plots': updated_plots,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Plot coordinates updated successfully",
            "plots_updated": len(updated_plots)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update plots: {str(e)}")

@router.delete("/projects/{project_id}/layout")
async def delete_project_layout(project_id: str, request: Request):
    """Soft delete a project layout"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.project_layouts.update_one(
        {
            'project_id': project_id,
            'tenant_id': user['tenant_id'],
            'deleted_at': None
        },
        {
            '$set': {
                'deleted_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    return {"message": "Layout deleted successfully"}

@router.get("/projects/{project_id}/layout/summary")
async def get_layout_summary(project_id: str, request: Request):
    """Get summary statistics for a project layout"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    layout = await db.project_layouts.find_one({
        'project_id': project_id,
        'tenant_id': user['tenant_id'],
        'deleted_at': None
    })
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    plots = layout['plots']
    total_plots = len(plots)
    
    status_counts = {
        'available': 0,
        'booked': 0,
        'blocked': 0,
        'sold': 0
    }
    
    total_value = 0
    total_area = 0
    
    for plot in plots:
        status = plot.get('status', 'available')
        if status in status_counts:
            status_counts[status] += 1
        total_value += plot.get('price', 0)
        total_area += plot.get('area', 0)
    
    return {
        'total_plots': total_plots,
        'status_counts': status_counts,
        'total_value': total_value,
        'total_area': total_area,
        'average_price': total_value / total_plots if total_plots > 0 else 0,
        'average_area': total_area / total_plots if total_plots > 0 else 0
    }

@router.post("/projects/{project_id}/layout/quick-create")
async def quick_create_layout(
    project_id: str,
    layout_data: LayoutCreate,
    request: Request
):
    """Quick create layout from SVG upload and manual plot marking"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if project exists
    project = await db.projects.find_one({
        'id': project_id,
        'tenant_id': user['tenant_id'],
        'deleted_at': None
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete existing layout if any
    await db.project_layouts.delete_many({
        'project_id': project_id,
        'tenant_id': user['tenant_id']
    })
    
    # Create new layout
    layout_id = str(uuid.uuid4())
    layout_doc = {
        'id': layout_id,
        'project_id': project_id,
        'tenant_id': user['tenant_id'],
        'layout_name': layout_data.layout_name,
        'svg_content': layout_data.svg_content,
        'svg_url': layout_data.svg_url,
        'plots': [plot.dict() for plot in layout_data.plots],
        'metadata': layout_data.metadata,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'deleted_at': None
    }
    
    await db.project_layouts.insert_one(layout_doc)
    
    return {
        "message": "Layout created successfully",
        "layout_id": layout_id,
        "total_plots": len(layout_data.plots)
    }


@router.post("/projects/{project_id}/layout/sync-properties")
async def sync_layout_to_properties(project_id: str, request: Request):
    """Sync plots from layout to properties collection"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get the layout for this project
    if user.get('role') == 'super_admin':
        layout = await db.project_layouts.find_one({
            'project_id': project_id,
            'deleted_at': None
        })
    else:
        layout = await db.project_layouts.find_one({
            'project_id': project_id,
            'tenant_id': user['tenant_id'],
            'deleted_at': None
        })
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    plots = layout.get('plots', [])
    if not plots:
        return {"success": True, "message": "No plots to sync", "synced": 0}
    
    # Get project details for tenant_id
    project = await db.projects.find_one({'id': project_id, 'deleted_at': None})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tenant_id = project.get('tenant_id') or user.get('tenant_id')
    
    # Get default property type and status
    default_type = await db.property_types.find_one({'slug': 'plot'}, {'_id': 0})
    default_status = await db.property_statuses.find_one({'slug': 'available'}, {'_id': 0})
    
    synced_count = 0
    updated_count = 0
    
    for plot in plots:
        # Check if property already exists for this plot
        existing_property = await db.properties.find_one({
            'project_id': project_id,
            'layout_plot_id': plot.get('id'),
            'deleted_at': None
        })
        
        if existing_property:
            # Update existing property
            update_data = {
                'property_number': plot.get('display_name', f"Plot {plot.get('id')[:8]}"),
                'area': float(plot.get('area', 0)),
                'price': float(plot.get('price', 0)),
                'block': plot.get('block', 'A'),
                'layout_coordinates': plot.get('coordinates', []),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Map plot status to property status
            plot_status = plot.get('status', 'available')
            if plot_status == 'available':
                status = await db.property_statuses.find_one({'slug': 'available'}, {'_id': 0})
            elif plot_status == 'booked':
                status = await db.property_statuses.find_one({'slug': 'blocked'}, {'_id': 0})
            elif plot_status == 'sold':
                status = await db.property_statuses.find_one({'slug': 'sold'}, {'_id': 0})
            else:
                status = default_status
            
            if status:
                update_data['status_id'] = status.get('id')
            
            await db.properties.update_one(
                {'id': existing_property['id']},
                {'$set': update_data}
            )
            updated_count += 1
        else:
            # Create new property from plot
            property_id = str(uuid.uuid4())
            
            # Map plot status to property status
            plot_status = plot.get('status', 'available')
            if plot_status == 'available':
                status = await db.property_statuses.find_one({'slug': 'available'}, {'_id': 0})
            elif plot_status == 'booked':
                status = await db.property_statuses.find_one({'slug': 'blocked'}, {'_id': 0})
            elif plot_status == 'sold':
                status = await db.property_statuses.find_one({'slug': 'sold'}, {'_id': 0})
            else:
                status = default_status
            
            property_doc = {
                'id': property_id,
                'project_id': project_id,
                'tenant_id': tenant_id,
                'property_number': plot.get('display_name', f"Plot {plot.get('id')[:8]}"),
                'property_type_id': default_type.get('id') if default_type else None,
                'area': float(plot.get('area', 0)),
                'price': float(plot.get('price', 0)),
                'status_id': status.get('id') if status else None,
                'facing': None,
                'block': plot.get('block', 'A'),
                'floor': None,
                'layout_plot_id': plot.get('id'),  # Link to layout plot
                'layout_coordinates': plot.get('coordinates', []),
                'amenities': plot.get('amenities', []),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            }
            
            await db.properties.insert_one(property_doc)
            synced_count += 1
    
    return {
        "success": True,
        "message": f"Synced {synced_count} new properties, updated {updated_count} existing",
        "synced": synced_count,
        "updated": updated_count,
        "total_plots": len(plots)
    }

