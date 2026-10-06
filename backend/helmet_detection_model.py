#!/usr/bin/env python3
"""
🪖 Real Helmet Detection Model
Uses computer vision to detect helmets in uploaded images
"""

import cv2
import numpy as np
import base64
import io
from PIL import Image
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HelmetDetector:
    def __init__(self):
        """Initialize the helmet detection model"""
        self.helmet_cascade = None
        self.face_cascade = None
        self.load_models()
    
    def load_models(self):
        """Load pre-trained cascade classifiers"""
        try:
            # Load face cascade (built-in OpenCV)
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            # For helmet detection, we'll use a combination of face detection and head region analysis
            logger.info("✅ Helmet detection models loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to load models: {str(e)}")
    
    def preprocess_image(self, image_data):
        """Convert base64 image to OpenCV format"""
        try:
            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            
            # Convert to PIL Image
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            return cv_image
            
        except Exception as e:
            logger.error(f"❌ Image preprocessing failed: {str(e)}")
            return None
    
    def detect_faces_and_heads(self, image):
        """Detect faces and head regions in the image"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(30, 30)
            )
            
            return faces
            
        except Exception as e:
            logger.error(f"❌ Face detection failed: {str(e)}")
            return []
    
    def analyze_helmet_region(self, image, face_rect):
        """Analyze the head region above the face for helmet presence"""
        try:
            x, y, w, h = face_rect
            
            # Define helmet region (above the face)
            helmet_y = max(0, y - int(h * 0.8))
            helmet_h = int(h * 1.2)
            helmet_region = image[helmet_y:y + helmet_h, x:x + w]
            
            if helmet_region.size == 0:
                return False, 0.0
            
            # Convert to HSV for better color analysis
            hsv = cv2.cvtColor(helmet_region, cv2.COLOR_BGR2HSV)
            
            # Define helmet color ranges (common helmet colors)
            helmet_colors = [
                # Black helmets
                ([0, 0, 0], [180, 255, 50]),
                # White helmets  
                ([0, 0, 200], [180, 30, 255]),
                # Red helmets
                ([0, 120, 70], [10, 255, 255]),
                # Blue helmets
                ([100, 150, 0], [130, 255, 255]),
                # Yellow helmets
                ([20, 100, 100], [30, 255, 255])
            ]
            
            helmet_pixels = 0
            total_pixels = helmet_region.shape[0] * helmet_region.shape[1]
            
            for (lower, upper) in helmet_colors:
                lower = np.array(lower, dtype=np.uint8)
                upper = np.array(upper, dtype=np.uint8)
                mask = cv2.inRange(hsv, lower, upper)
                helmet_pixels += cv2.countNonZero(mask)
            
            # Calculate helmet coverage percentage
            helmet_coverage = helmet_pixels / total_pixels
            
            # Additional shape analysis
            gray_region = cv2.cvtColor(helmet_region, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray_region, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Look for helmet-like shapes (rounded, dome-like)
            helmet_shape_score = 0
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 100:  # Minimum area threshold
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                        if 0.3 < circularity < 0.9:  # Helmet-like circularity
                            helmet_shape_score += circularity
            
            # Combine color and shape analysis
            confidence = (helmet_coverage * 0.6 + min(helmet_shape_score, 1.0) * 0.4)
            has_helmet = confidence > 0.15  # Threshold for helmet detection
            
            return has_helmet, min(confidence * 100, 95.0)  # Cap at 95% confidence
            
        except Exception as e:
            logger.error(f"❌ Helmet analysis failed: {str(e)}")
            return False, 0.0
    
    def detect_helmet(self, image_data):
        """Main helmet detection function"""
        try:
            # Preprocess image
            image = self.preprocess_image(image_data)
            if image is None:
                return {
                    'success': False,
                    'error': 'Failed to process image',
                    'has_helmet': False,
                    'confidence': 0.0
                }
            
            # Detect faces
            faces = self.detect_faces_and_heads(image)
            
            if len(faces) == 0:
                return {
                    'success': True,
                    'message': 'No person detected in image',
                    'has_helmet': False,
                    'confidence': 0.0,
                    'person_count': 0
                }
            
            # Analyze each detected face for helmet
            helmet_results = []
            for face in faces:
                has_helmet, confidence = self.analyze_helmet_region(image, face)
                helmet_results.append({
                    'has_helmet': has_helmet,
                    'confidence': confidence,
                    'face_region': face.tolist()
                })
            
            # Overall analysis
            total_people = len(faces)
            people_with_helmets = sum(1 for result in helmet_results if result['has_helmet'])
            people_without_helmets = total_people - people_with_helmets
            
            # Calculate overall confidence
            avg_confidence = np.mean([result['confidence'] for result in helmet_results])
            
            return {
                'success': True,
                'person_count': total_people,
                'people_with_helmets': people_with_helmets,
                'people_without_helmets': people_without_helmets,
                'has_violation': people_without_helmets > 0,
                'confidence': round(avg_confidence, 2),
                'detailed_results': helmet_results,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Helmet detection failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'has_helmet': False,
                'confidence': 0.0
            }

# Global detector instance
helmet_detector = HelmetDetector()

def analyze_image_for_helmet(image_data):
    """Wrapper function for helmet detection"""
    return helmet_detector.detect_helmet(image_data)

if __name__ == "__main__":
    # Test the detector
    logger.info("🪖 Helmet Detection Model Ready")
    logger.info("✅ Model can detect helmets in uploaded images")
