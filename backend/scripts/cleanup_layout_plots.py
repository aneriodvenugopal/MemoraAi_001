"""
Script to clean up invalid plot names from existing layouts
Removes plots with titles, headers, road names, and tiny areas
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import re

load_dotenv()

MONGO_URL = os.getenv('MONGO_URL')

def is_valid_plot_label(text: str) -> bool:
    """Check if text is a valid plot label"""
    if not text or len(text) > 20:
        return False
    
    # Valid patterns
    if re.match(r'^[A-Z]+-?\d+$', text, re.IGNORECASE):
        return True
    if re.match(r'^\d+$', text):
        return True
    if re.match(r'^(Plot|P)\s*-?\d+$', text, re.IGNORECASE):
        return True
    if re.match(r'^[A-Z]\d+$', text, re.IGNORECASE):
        return True
    
    # Reject keywords
    reject_keywords = [
        'road', 'phase', 'plots', 'layout', 'existing', 'wide',
        'feet', 'sqft', 'area', 'total', 'project', 'colony',
        'nagar', 'avenue', 'estate', 'garden', 'park', 'enclave',
        'sai', 'sri', 'siva', 'velukaval'
    ]
    
    text_lower = text.lower()
    for keyword in reject_keywords:
        if keyword in text_lower:
            return False
    
    return False

async def cleanup_layouts():
    """Clean up all layouts with invalid plot names"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.retoerp
    
    try:
        # Find all layouts
        layouts = await db.layouts.find({'deleted_at': None}).to_list(length=None)
        
        print(f"\n🔍 Found {len(layouts)} layouts to check\n")
        
        total_removed = 0
        total_kept = 0
        
        for layout in layouts:
            layout_name = layout.get('layout_name', 'Unknown')
            original_plots = layout.get('plots', [])
            
            if not original_plots:
                continue
            
            # Filter plots
            valid_plots = []
            removed_plots = []
            
            for plot in original_plots:
                display_name = plot.get('display_name', '')
                area = plot.get('area', 0)
                
                # Check if valid
                is_valid = True
                reason = ""
                
                # Check area
                if area < 100:
                    is_valid = False
                    reason = f"tiny area ({area} sq.ft)"
                
                # Check label
                elif not is_valid_plot_label(display_name):
                    is_valid = False
                    reason = f"invalid label '{display_name}'"
                
                if is_valid:
                    valid_plots.append(plot)
                    total_kept += 1
                else:
                    removed_plots.append({'name': display_name, 'area': area, 'reason': reason})
                    total_removed += 1
            
            # Update if plots were removed
            if removed_plots:
                print(f"📋 Layout: {layout_name}")
                print(f"   Original plots: {len(original_plots)}")
                print(f"   Valid plots: {len(valid_plots)}")
                print(f"   Removed:")
                for rp in removed_plots:
                    print(f"      ❌ {rp['name']} - {rp['reason']}")
                
                # Update in database
                await db.layouts.update_one(
                    {'_id': layout['_id']},
                    {'$set': {'plots': valid_plots}}
                )
                print(f"   ✅ Updated in database\n")
        
        print(f"\n{'='*60}")
        print(f"✅ CLEANUP COMPLETE")
        print(f"   Total plots kept: {total_kept}")
        print(f"   Total plots removed: {total_removed}")
        print(f"{'='*60}\n")
        
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_layouts())
