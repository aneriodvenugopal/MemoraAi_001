import cv2
import numpy as np
from PIL import Image
import pytesseract
from typing import List, Dict
import logging
import fitz  # For PDF to image conversion

logger = logging.getLogger(__name__)

class CVOCRParser:
    """Parser using Computer Vision and OCR for image-based layouts"""
    
    @staticmethod
    def parse_file(file_path: str) -> Dict:
        """
        Parse image/scanned PDF using CV and OCR
        """
        try:
            # Load image
            if file_path.lower().endswith('.pdf'):
                image = CVOCRParser._pdf_to_image(file_path)
            else:
                image = cv2.imread(file_path)
            
            if image is None:
                raise Exception("Failed to load image")
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply thresholding
            _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
            
            # Find contours (plot boundaries)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            plots = []
            
            # Filter and process contours
            for contour in contours:
                try:
                    # Filter by area
                    area = cv2.contourArea(contour)
                    if area < 500 or area > 100000:  # Skip too small or too large
                        continue
                    
                    # Approximate polygon
                    epsilon = 0.02 * cv2.arcLength(contour, True)
                    approx = cv2.approxPolyDP(contour, epsilon, True)
                    
                    # We want rectangular shapes (4 corners)
                    if len(approx) >= 4 and len(approx) <= 8:
                        # Get bounding rectangle
                        x, y, w, h = cv2.boundingRect(contour)
                        
                        # Create coordinates
                        coordinates = [
                            {'x': float(x), 'y': float(y)},
                            {'x': float(x + w), 'y': float(y)},
                            {'x': float(x + w), 'y': float(y + h)},
                            {'x': float(x), 'y': float(y + h)}
                        ]
                        
                        # Extract ROI for OCR
                        roi = image[y:y+h, x:x+w]
                        
                        # Try OCR on the plot area
                        plot_number = CVOCRParser._extract_text_from_roi(roi)
                        
                        block = 'A'
                        if plot_number and '-' in plot_number:
                            block = plot_number.split('-')[0]
                        
                        plots.append({
                            'display_name': plot_number or f"Plot-{len(plots)+1}",
                            'block': block,
                            'coordinates': coordinates,
                            'area': int(area),
                            'confidence': 65
                        })
                        
                except Exception as e:
                    logger.warning(f"Failed to process contour: {e}")
            
            # If no plots found, try alternative method
            if len(plots) == 0:
                # Try using edge detection
                plots = CVOCRParser._detect_using_edges(image)
            
            metadata = {
                'total_plots': len(plots),
                'file_type': 'image',
                'detection_method': 'cv_ocr',
                'image_size': f"{image.shape[1]}x{image.shape[0]}"
            }
            
            return {
                'plots': plots,
                'metadata': metadata
            }
            
        except Exception as e:
            logger.error(f"Error parsing with CV/OCR: {e}")
            raise Exception(f"Failed to parse file with CV/OCR: {str(e)}")
    
    @staticmethod
    def _pdf_to_image(pdf_path: str) -> np.ndarray:
        """Convert PDF first page to image"""
        doc = fitz.open(pdf_path)
        page = doc[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    
    @staticmethod
    def _extract_text_from_roi(roi: np.ndarray) -> str:
        """Extract text from image ROI using OCR"""
        try:
            # Preprocess for better OCR
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # OCR
            text = pytesseract.image_to_string(thresh, config='--psm 7')
            text = text.strip()
            
            # Filter for plot-like patterns (e.g., "A-1", "Plot 5")
            if text and (len(text) <= 10):
                return text
            
            return None
            
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return None
    
    @staticmethod
    def _detect_using_edges(image: np.ndarray) -> List[Dict]:
        """Alternative detection using edge detection"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # Find contours on edges
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            plots = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if 1000 < area < 50000:
                    x, y, w, h = cv2.boundingRect(contour)
                    coordinates = [
                        {'x': float(x), 'y': float(y)},
                        {'x': float(x + w), 'y': float(y)},
                        {'x': float(x + w), 'y': float(y + h)},
                        {'x': float(x), 'y': float(y + h)}
                    ]
                    
                    plots.append({
                        'display_name': f"Plot-{len(plots)+1}",
                        'block': 'A',
                        'coordinates': coordinates,
                        'area': int(area),
                        'confidence': 60
                    })
            
            return plots
            
        except Exception as e:
            logger.warning(f"Edge detection failed: {e}")
            return []
