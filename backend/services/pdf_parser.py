import fitz  # PyMuPDF
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class PDFParser:
    """Parser for vector PDF files to extract plot boundaries"""
    
    @staticmethod
    def parse_file(file_path: str) -> Dict:
        """
        Parse PDF file and extract plot information
        """
        try:
            doc = fitz.open(file_path)
            
            if len(doc) == 0:
                raise Exception("PDF has no pages")
            
            # Process first page
            page = doc[0]
            
            plots = []
            text_instances = []
            
            # Extract text with positions
            text_dict = page.get_text("dict")
            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:  # Text block
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "").strip()
                            if text:
                                bbox = span.get("bbox", [0, 0, 0, 0])
                                text_instances.append({
                                    'text': text,
                                    'x': (bbox[0] + bbox[2]) / 2,
                                    'y': (bbox[1] + bbox[3]) / 2
                                })
            
            # Extract vector paths (rectangles)
            paths = page.get_drawings()
            
            for path in paths:
                try:
                    # Check if it's a closed rectangle-like shape
                    if path.get("type") == "f" or path.get("type") == "s":  # fill or stroke
                        rect = path.get("rect")
                        if rect:
                            x0, y0, x1, y1 = rect
                            
                            # Skip very small or very large shapes
                            width = abs(x1 - x0)
                            height = abs(y1 - y0)
                            
                            if width < 10 or height < 10 or width > 1000 or height > 1000:
                                continue
                            
                            coordinates = [
                                {'x': round(x0, 2), 'y': round(y0, 2)},
                                {'x': round(x1, 2), 'y': round(y0, 2)},
                                {'x': round(x1, 2), 'y': round(y1, 2)},
                                {'x': round(x0, 2), 'y': round(y1, 2)}
                            ]
                            
                            # Find nearest text
                            centroid_x = (x0 + x1) / 2
                            centroid_y = (y0 + y1) / 2
                            plot_number = PDFParser._find_nearest_text(centroid_x, centroid_y, text_instances)
                            
                            area = abs(int(width * height))
                            
                            block = 'A'
                            if plot_number and '-' in plot_number:
                                block = plot_number.split('-')[0]
                            
                            plots.append({
                                'display_name': plot_number or f"Plot-{len(plots)+1}",
                                'block': block,
                                'coordinates': coordinates,
                                'area': area,
                                'confidence': 80
                            })
                            
                except Exception as e:
                    logger.warning(f"Failed to parse path: {e}")
            
            # If no rectangles found, try to find closed paths
            if len(plots) == 0:
                # Alternative: Extract images and analyze
                logger.info("No vector rectangles found, PDF might be image-based")
            
            doc.close()
            
            metadata = {
                'total_plots': len(plots),
                'total_text_instances': len(text_instances),
                'file_type': 'pdf',
                'is_vector': len(plots) > 0
            }
            
            return {
                'plots': plots,
                'metadata': metadata
            }
            
        except Exception as e:
            logger.error(f"Error parsing PDF file: {e}")
            raise Exception(f"Failed to parse PDF file: {str(e)}")
    
    @staticmethod
    def _find_nearest_text(x: float, y: float, text_instances: List[Dict], max_distance: float = 100) -> str:
        """Find nearest text to a point"""
        nearest_text = None
        min_distance = max_distance
        
        for text in text_instances:
            distance = ((text['x'] - x) ** 2 + (text['y'] - y) ** 2) ** 0.5
            if distance < min_distance:
                min_distance = distance
                nearest_text = text['text']
        
        return nearest_text
