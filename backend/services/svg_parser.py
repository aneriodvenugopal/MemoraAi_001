from bs4 import BeautifulSoup
from typing import List, Dict
import re
import logging

logger = logging.getLogger(__name__)

class SVGParser:
    """Parser for SVG files to extract plot boundaries and text"""
    
    @staticmethod
    def parse_file(file_path: str) -> Dict:
        """
        Parse SVG file and extract plot information
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                svg_content = f.read()
            
            soup = BeautifulSoup(svg_content, 'xml')
            
            plots = []
            text_elements = []
            
            # Extract all text elements first
            for text in soup.find_all(['text', 'tspan']):
                try:
                    text_content = text.get_text(strip=True)
                    if not text_content:
                        continue
                    
                    x = float(text.get('x', 0))
                    y = float(text.get('y', 0))
                    
                    text_elements.append({
                        'text': text_content,
                        'x': x,
                        'y': y
                    })
                except Exception as e:
                    logger.warning(f"Failed to parse text: {e}")
            
            # Extract rectangles
            for rect in soup.find_all('rect'):
                try:
                    x = float(rect.get('x', 0))
                    y = float(rect.get('y', 0))
                    width = float(rect.get('width', 0))
                    height = float(rect.get('height', 0))
                    
                    if width <= 0 or height <= 0:
                        continue
                    
                    # Create coordinates for rectangle
                    coordinates = [
                        {'x': round(x, 2), 'y': round(y, 2)},
                        {'x': round(x + width, 2), 'y': round(y, 2)},
                        {'x': round(x + width, 2), 'y': round(y + height, 2)},
                        {'x': round(x, 2), 'y': round(y + height, 2)}
                    ]
                    
                    # Find nearest text
                    centroid_x = x + width / 2
                    centroid_y = y + height / 2
                    plot_number = SVGParser._find_nearest_text(centroid_x, centroid_y, text_elements)
                    
                    # Calculate area
                    area = abs(int(width * height))
                    
                    # Skip very small shapes (likely decorative elements or text boxes)
                    # Real plots are typically at least 100 sq.ft minimum
                    if area < 100:
                        logger.info(f"Skipping tiny rectangle (area={area} sq.ft) - likely decorative element")
                        continue
                    
                    # Skip if no valid plot label found
                    if not plot_number:
                        logger.info(f"Skipping rectangle with no valid plot label")
                        continue
                    
                    block = 'A'
                    if plot_number and '-' in plot_number:
                        block = plot_number.split('-')[0]
                    
                    plots.append({
                        'display_name': plot_number,
                        'block': block,
                        'coordinates': coordinates,
                        'area': area,
                        'confidence': 95
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to parse rect: {e}")
            
            # Extract polygons
            for polygon in soup.find_all('polygon'):
                try:
                    points_str = polygon.get('points', '')
                    if not points_str:
                        continue
                    
                    # Parse points
                    coordinates = SVGParser._parse_polygon_points(points_str)
                    
                    if len(coordinates) < 3:
                        continue
                    
                    # Find nearest text
                    centroid_x = sum(c['x'] for c in coordinates) / len(coordinates)
                    centroid_y = sum(c['y'] for c in coordinates) / len(coordinates)
                    plot_number = SVGParser._find_nearest_text(centroid_x, centroid_y, text_elements)
                    
                    # Calculate area
                    area = abs(int(SVGParser._calculate_polygon_area(coordinates)))
                    
                    # Skip very small shapes (likely decorative elements or text boxes)
                    if area < 100:
                        logger.info(f"Skipping tiny polygon (area={area} sq.ft) - likely decorative element")
                        continue
                    
                    # Skip if no valid plot label found
                    if not plot_number:
                        logger.info(f"Skipping polygon with no valid plot label")
                        continue
                    
                    block = 'A'
                    if plot_number and '-' in plot_number:
                        block = plot_number.split('-')[0]
                    
                    plots.append({
                        'display_name': plot_number,
                        'block': block,
                        'coordinates': coordinates,
                        'area': area,
                        'confidence': 95
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to parse polygon: {e}")
            
            # Extract paths (simplified)
            for path in soup.find_all('path'):
                try:
                    d = path.get('d', '')
                    if not d or len(d) > 500:  # Skip complex paths
                        continue
                    
                    # Try to extract simple rectangular paths
                    coordinates = SVGParser._parse_simple_path(d)
                    
                    if len(coordinates) >= 3:
                        centroid_x = sum(c['x'] for c in coordinates) / len(coordinates)
                        centroid_y = sum(c['y'] for c in coordinates) / len(coordinates)
                        plot_number = SVGParser._find_nearest_text(centroid_x, centroid_y, text_elements)
                        
                        area = abs(int(SVGParser._calculate_polygon_area(coordinates)))
                        
                        # Skip very small shapes (likely decorative elements)
                        if area < 100:
                            logger.info(f"Skipping tiny path (area={area} sq.ft) - likely decorative element")
                            continue
                        
                        # Skip if no valid plot label found
                        if not plot_number:
                            logger.info(f"Skipping path with no valid plot label")
                            continue
                        
                        block = 'A'
                        if plot_number and '-' in plot_number:
                            block = plot_number.split('-')[0]
                        
                        plots.append({
                            'display_name': plot_number,
                            'block': block,
                            'coordinates': coordinates,
                            'area': area,
                            'confidence': 90
                        })
                        
                except Exception as e:
                    logger.warning(f"Failed to parse path: {e}")
            
            metadata = {
                'total_plots': len(plots),
                'total_text_labels': len(text_elements),
                'file_type': 'svg'
            }
            
            return {
                'plots': plots,
                'metadata': metadata
            }
            
        except Exception as e:
            logger.error(f"Error parsing SVG file: {e}")
            raise Exception(f"Failed to parse SVG file: {str(e)}")
    
    @staticmethod
    def _parse_polygon_points(points_str: str) -> List[Dict]:
        """Parse SVG polygon points string"""
        coordinates = []
        points = re.findall(r'([\d.]+)[,\s]+([\d.]+)', points_str)
        for x, y in points:
            coordinates.append({
                'x': round(float(x), 2),
                'y': round(float(y), 2)
            })
        return coordinates
    
    @staticmethod
    def _parse_simple_path(d: str) -> List[Dict]:
        """Parse simple SVG path (M L commands only)"""
        coordinates = []
        commands = re.findall(r'[ML]\s*([\d.]+)[,\s]+([\d.]+)', d)
        for x, y in commands:
            coordinates.append({
                'x': round(float(x), 2),
                'y': round(float(y), 2)
            })
        return coordinates
    
    @staticmethod
    def _is_plot_label(text: str) -> bool:
        """
        Determine if text is likely a plot label vs decorative text
        Plot labels are typically short and contain numbers/letters
        """
        if not text:
            return False
        
        # Remove whitespace
        text = text.strip()
        
        # Too long to be a plot label (likely title/header)
        if len(text) > 20:
            return False
        
        # Common patterns for plot labels:
        # - "A-1", "B-12", "Plot 5"
        # - Just numbers: "1", "10", "123"
        # - Block + number: "A1", "B23"
        
        # Pattern 1: Contains hyphen with letter-number (A-1, Block-5)
        if re.match(r'^[A-Z]+-?\d+$', text, re.IGNORECASE):
            return True
        
        # Pattern 2: Just a number (1, 10, 123)
        if re.match(r'^\d+$', text):
            return True
        
        # Pattern 3: "Plot" followed by number
        if re.match(r'^(Plot|P)\s*-?\d+$', text, re.IGNORECASE):
            return True
        
        # Pattern 4: Letter + number without separator (A1, B12)
        if re.match(r'^[A-Z]\d+$', text, re.IGNORECASE):
            return True
        
        # Reject common non-plot text patterns
        reject_keywords = [
            'road', 'phase', 'plots', 'layout', 'existing', 'wide',
            'feet', 'sqft', 'area', 'total', 'project', 'colony',
            'nagar', 'avenue', 'estate', 'garden', 'park', 'enclave'
        ]
        
        text_lower = text.lower()
        for keyword in reject_keywords:
            if keyword in text_lower:
                return False
        
        return False
    
    @staticmethod
    def _find_nearest_text(x: float, y: float, text_elements: List[Dict], max_distance: float = 100) -> str:
        """Find nearest text to a point that looks like a plot label"""
        nearest_text = None
        min_distance = max_distance
        
        for text in text_elements:
            # Filter out non-plot labels
            if not SVGParser._is_plot_label(text['text']):
                continue
            
            distance = ((text['x'] - x) ** 2 + (text['y'] - y) ** 2) ** 0.5
            if distance < min_distance:
                min_distance = distance
                nearest_text = text['text']
        
        return nearest_text
    
    @staticmethod
    def _calculate_polygon_area(coordinates: List[Dict]) -> float:
        """Calculate polygon area"""
        n = len(coordinates)
        if n < 3:
            return 0
        
        area = 0
        for i in range(n):
            j = (i + 1) % n
            area += coordinates[i]['x'] * coordinates[j]['y']
            area -= coordinates[j]['x'] * coordinates[i]['y']
        
        return abs(area) / 2
