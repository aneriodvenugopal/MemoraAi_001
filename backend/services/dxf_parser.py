import ezdxf
from typing import List, Dict
import os
import logging

logger = logging.getLogger(__name__)

class DXFParser:
    """Parser for DXF/DWG files to extract plot boundaries and text labels"""
    
    @staticmethod
    def parse_file(file_path: str) -> Dict:
        """
        Parse DXF file and extract plot information
        
        Returns:
            dict: {
                'plots': List[dict],
                'metadata': dict
            }
        """
        try:
            # Read DXF file
            doc = ezdxf.readfile(file_path)
            msp = doc.modelspace()
            
            plots = []
            text_entities = []
            
            # Extract all text entities first
            for entity in msp.query('TEXT MTEXT'):
                try:
                    text_content = entity.dxf.text if hasattr(entity.dxf, 'text') else str(entity)
                    insert_point = entity.dxf.insert if hasattr(entity.dxf, 'insert') else (0, 0, 0)
                    text_entities.append({
                        'text': text_content.strip(),
                        'x': insert_point[0],
                        'y': insert_point[1]
                    })
                except Exception as e:
                    logger.warning(f"Failed to parse text entity: {e}")
            
            # Extract all closed polygons/polylines (plot boundaries)
            for entity in msp.query('LWPOLYLINE POLYLINE'):
                try:
                    # Get points
                    points = list(entity.get_points())
                    
                    if len(points) < 3:
                        continue
                    
                    # Convert to coordinates
                    coordinates = []
                    for point in points:
                        coordinates.append({
                            'x': round(float(point[0]), 2),
                            'y': round(float(point[1]), 2)
                        })
                    
                    # Calculate centroid for text matching
                    centroid_x = sum(c['x'] for c in coordinates) / len(coordinates)
                    centroid_y = sum(c['y'] for c in coordinates) / len(coordinates)
                    
                    # Find nearest text label
                    plot_number = DXFParser._find_nearest_text(centroid_x, centroid_y, text_entities)
                    
                    # Calculate area (simple polygon area)
                    area = DXFParser._calculate_polygon_area(coordinates)
                    
                    # Determine block from plot number (e.g., "A-1" -> block "A")
                    block = 'A'
                    if plot_number and '-' in plot_number:
                        block = plot_number.split('-')[0]
                    
                    plots.append({
                        'display_name': plot_number or f"Plot-{len(plots)+1}",
                        'block': block,
                        'coordinates': coordinates,
                        'area': abs(int(area)),
                        'confidence': 100
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to parse polygon: {e}")
            
            # Extract rectangles as well
            for entity in msp.query('INSERT'):
                try:
                    if entity.dxf.name.upper() in ['RECTANGLE', 'RECT', 'PLOT']:
                        insert = entity.dxf.insert
                        # Try to get block definition
                        block = doc.blocks.get(entity.dxf.name)
                        if block:
                            # Extract rectangle from block
                            pass  # Complex block parsing
                except Exception as e:
                    logger.warning(f"Failed to parse insert: {e}")
            
            metadata = {
                'total_plots': len(plots),
                'total_text_labels': len(text_entities),
                'file_type': 'dxf',
                'dxf_version': doc.dxfversion if hasattr(doc, 'dxfversion') else 'unknown'
            }
            
            return {
                'plots': plots,
                'metadata': metadata
            }
            
        except Exception as e:
            logger.error(f"Error parsing DXF file: {e}")
            raise Exception(f"Failed to parse DXF file: {str(e)}")
    
    @staticmethod
    def _find_nearest_text(x: float, y: float, text_entities: List[Dict], max_distance: float = 50) -> str:
        """Find the nearest text label to a point"""
        nearest_text = None
        min_distance = max_distance
        
        for text in text_entities:
            distance = ((text['x'] - x) ** 2 + (text['y'] - y) ** 2) ** 0.5
            if distance < min_distance:
                min_distance = distance
                nearest_text = text['text']
        
        return nearest_text
    
    @staticmethod
    def _calculate_polygon_area(coordinates: List[Dict]) -> float:
        """Calculate area of polygon using shoelace formula"""
        n = len(coordinates)
        if n < 3:
            return 0
        
        area = 0
        for i in range(n):
            j = (i + 1) % n
            area += coordinates[i]['x'] * coordinates[j]['y']
            area -= coordinates[j]['x'] * coordinates[i]['y']
        
        return abs(area) / 2
