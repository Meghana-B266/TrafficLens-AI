#!/usr/bin/env python3
"""
🚨 CACHE - Helmet Detection Service
Advanced AI-powered helmet detection with multi-violation support
"""

import os
import sys
import json
import time
import logging
import requests
import cv2
import numpy as np
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import base64
from twilio.rest import Client
from dotenv import load_dotenv
from helmet_detection_model import analyze_image_for_helmet

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('helmet_detection.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
OCR_API_KEY = os.getenv('OCR_API_KEY', '256DF5A5-1D99-45F9-B165-1888C6EB734B')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_NUMBER = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("✅ Twilio client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Twilio client: {e}")

class HelmetDetectionService:
    def __init__(self):
        self.violation_types = {
            'no_helmet': {'fine': 500, 'description': 'Riding without helmet'},
            'triple_riding': {'fine': 1000, 'description': 'Triple riding violation'},
            'red_light': {'fine': 1000, 'description': 'Red light violation'},
            'overspeeding': {'fine': 2000, 'description': 'Overspeeding violation'},
            'no_license': {'fine': 5000, 'description': 'Driving without license'},
            'mobile_use': {'fine': 1000, 'description': 'Using mobile while driving'}
        }
        logger.info("🚨 Helmet Detection Service initialized")

    def detect_helmet(self, image_data):
        """Real helmet detection using AI model"""
        try:
            logger.info("🪖 Using real helmet detection model...")

            # Use the real helmet detection model
            detection_result = analyze_image_for_helmet(image_data)

            if not detection_result['success']:
                return {
                    'helmet_detected': False,
                    'confidence': 0.0,
                    'person_count': 0,
                    'violations': ['detection_failed'],
                    'error': detection_result.get('error', 'Detection failed')
                }

            # Convert model results to service format
            violations = []
            if detection_result['people_without_helmets'] > 0:
                violations.append('no_helmet')

            return {
                'helmet_detected': detection_result['people_without_helmets'] == 0,
                'confidence': detection_result['confidence'],
                'person_count': detection_result['person_count'],
                'people_with_helmets': detection_result['people_with_helmets'],
                'people_without_helmets': detection_result['people_without_helmets'],
                'violations': violations,
                'detailed_results': detection_result.get('detailed_results', [])
            }

        except Exception as e:
            logger.error(f"❌ Real helmet detection failed: {e}")
            return {
                'helmet_detected': False,
                'confidence': 0.0,
                'person_count': 1,
                'violations': ['no_helmet'],
                'error': str(e)
            }

    def detect_triple_riding(self, image_data):
        """Detect triple riding using person counting"""
        try:
            # Mock triple riding detection
            # In real implementation, this would use person detection models
            person_count = np.random.randint(1, 4)  # Mock person count
            
            is_triple_riding = person_count >= 3
            confidence = 0.85 if is_triple_riding else 0.95
            
            return {
                'person_count': person_count,
                'is_triple_riding': is_triple_riding,
                'confidence': confidence,
                'violations': ['triple_riding'] if is_triple_riding else []
            }
            
        except Exception as e:
            logger.error(f"❌ Triple riding detection failed: {e}")
            return {
                'person_count': 1,
                'is_triple_riding': False,
                'confidence': 0.0,
                'violations': [],
                'error': str(e)
            }

    def extract_number_plate(self, image_data):
        """Extract number plate using OCR"""
        try:
            # Convert base64 to image for OCR
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            # Use OCR.space API
            url = 'https://api.ocr.space/parse/image'
            
            payload = {
                'apikey': OCR_API_KEY,
                'language': 'eng',
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
                'OCREngine': 2
            }
            
            files = {
                'base64Image': f'data:image/jpeg;base64,{image_data}'
            }
            
            response = requests.post(url, data=payload, files=files, timeout=30)
            result = response.json()
            
            if result.get('IsErroredOnProcessing'):
                logger.error(f"OCR Error: {result.get('ErrorMessage')}")
                return {'number_plate': 'UNKNOWN', 'confidence': 0.0}
            
            # Extract text and find number plate pattern
            extracted_text = ""
            if result.get('ParsedResults'):
                extracted_text = result['ParsedResults'][0].get('ParsedText', '')
            
            # Simple number plate pattern matching
            import re
            plate_patterns = [
                r'[A-Z]{2}\s*\d{2}\s*[A-Z]{1,2}\s*\d{4}',  # Standard Indian format
                r'[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}',  # Without spaces
                r'\b[A-Z0-9]{6,10}\b'  # General alphanumeric
            ]
            
            number_plate = 'UNKNOWN'
            confidence = 0.0
            
            for pattern in plate_patterns:
                matches = re.findall(pattern, extracted_text.upper())
                if matches:
                    number_plate = matches[0].replace(' ', '')
                    confidence = 0.8
                    break
            
            return {
                'number_plate': number_plate,
                'confidence': confidence,
                'raw_text': extracted_text
            }
            
        except Exception as e:
            logger.error(f"❌ Number plate extraction failed: {e}")
            return {
                'number_plate': 'UNKNOWN',
                'confidence': 0.0,
                'error': str(e)
            }

# Initialize service
detection_service = HelmetDetectionService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Helmet Detection Service',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0'
    })

@app.route('/detect/helmet', methods=['POST'])
def detect_helmet():
    """Helmet detection endpoint"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        logger.info("🔍 Processing helmet detection request")
        
        # Detect helmet
        helmet_result = detection_service.detect_helmet(data['image'])
        
        # Extract number plate
        plate_result = detection_service.extract_number_plate(data['image'])
        
        # Detect triple riding
        triple_result = detection_service.detect_triple_riding(data['image'])
        
        # Combine results
        violations = []
        violations.extend(helmet_result.get('violations', []))
        violations.extend(triple_result.get('violations', []))
        
        result = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'helmet_detection': helmet_result,
            'triple_riding_detection': triple_result,
            'number_plate': plate_result,
            'violations': violations,
            'total_violations': len(violations),
            'estimated_fine': sum(detection_service.violation_types.get(v, {}).get('fine', 0) for v in violations)
        }
        
        logger.info(f"✅ Detection completed: {len(violations)} violations found")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Detection failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/detect/video', methods=['POST'])
def detect_video():
    """Video analysis endpoint"""
    try:
        data = request.get_json()
        if not data or 'frames' not in data:
            return jsonify({'error': 'No video frames provided'}), 400
        
        logger.info(f"🎥 Processing video analysis: {len(data['frames'])} frames")
        
        all_violations = []
        frame_results = []
        
        for i, frame_data in enumerate(data['frames']):
            # Process each frame
            helmet_result = detection_service.detect_helmet(frame_data)
            triple_result = detection_service.detect_triple_riding(frame_data)
            plate_result = detection_service.extract_number_plate(frame_data)
            
            frame_violations = []
            frame_violations.extend(helmet_result.get('violations', []))
            frame_violations.extend(triple_result.get('violations', []))
            
            frame_result = {
                'frame_number': i + 1,
                'violations': frame_violations,
                'helmet_detection': helmet_result,
                'triple_riding_detection': triple_result,
                'number_plate': plate_result
            }
            
            frame_results.append(frame_result)
            all_violations.extend(frame_violations)
        
        # Aggregate results
        unique_violations = list(set(all_violations))
        total_fine = sum(detection_service.violation_types.get(v, {}).get('fine', 0) for v in unique_violations)
        
        result = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'total_frames': len(data['frames']),
            'frame_results': frame_results,
            'summary': {
                'unique_violations': unique_violations,
                'total_violations': len(unique_violations),
                'estimated_fine': total_fine,
                'violation_frequency': {v: all_violations.count(v) for v in unique_violations}
            }
        }
        
        logger.info(f"✅ Video analysis completed: {len(unique_violations)} unique violations")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Video analysis failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/send-challan', methods=['POST'])
def send_whatsapp_challan():
    """Send challan notification via WhatsApp using Twilio"""
    try:
        data = request.get_json()

        phone_number = data.get('phoneNumber', '+919597400881')
        fine_amount = data.get('fineAmount', 0)
        violation_type = data.get('violationType', 'Traffic Violation')
        location = data.get('location', 'Unknown')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        reporter_id = data.get('reporterId', 'anonymous')

        # Ensure phone number is in WhatsApp format
        if not phone_number.startswith('whatsapp:'):
            phone_number = f'whatsapp:{phone_number}'

        # Create challan message
        message_body = f"""🚔 TRAFFIC CHALLAN GENERATED

🚨 Violation: {violation_type}
💰 Fine Amount: ₹{fine_amount}
📍 Location: {location}
⏰ Time: {datetime.fromisoformat(timestamp.replace('Z', '+00:00')).strftime('%d/%m/%Y %H:%M')}

⚖️ Please pay your challan within 15 days to avoid additional penalties.

🔗 Pay online: https://parivahan.gov.in
📞 Helpline: 1800-XXX-XXXX

This is an automated message from SnapNEarn Traffic Monitoring System."""

        # Send WhatsApp message using Twilio
        if twilio_client:
            message = twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                to=phone_number,
                body=message_body
            )

            logger.info(f"📱 WhatsApp challan sent successfully. SID: {message.sid}")

            return jsonify({
                'success': True,
                'message': 'Challan sent via WhatsApp successfully',
                'message_sid': message.sid,
                'fine_amount': fine_amount,
                'phone_number': phone_number,
                'timestamp': datetime.now().isoformat()
            })
        else:
            logger.warning("📱 Twilio not configured, simulating WhatsApp send")
            return jsonify({
                'success': True,
                'message': 'Challan generated (WhatsApp service unavailable)',
                'fine_amount': fine_amount,
                'phone_number': phone_number,
                'timestamp': datetime.now().isoformat()
            })

    except Exception as e:
        logger.error(f"❌ Failed to send WhatsApp challan: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    logger.info("🚀 Starting Helmet Detection Service...")
    logger.info(f"🔧 OCR API Key: {'✅ Configured' if OCR_API_KEY else '❌ Missing'}")
    logger.info(f"📱 Twilio: {'✅ Configured' if twilio_client else '❌ Missing'}")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        threaded=True
    )
