# AI Documentation

## Overview

SnapNEarn uses AI and computer vision to assist in detecting traffic violations from user-uploaded images and videos. The AI pipeline improves report accuracy while protecting user privacy.

---

## AI Pipeline

```
Media Upload
      ↓
Image Preprocessing
      ↓
Helmet Detection
      ↓
Face Blurring
      ↓
Number Plate Recognition (OCR)
      ↓
Confidence Score
      ↓
Violation Report
```

---

## AI Modules

### Helmet Detection
Detects whether motorcycle riders are wearing helmets using TensorFlow and OpenCV.

### Number Plate Recognition
Extracts vehicle registration numbers using image preprocessing and Tesseract OCR.

### Face Blurring
Automatically detects and blurs faces to preserve user privacy.

### Confidence Scoring
Generates a confidence score for each AI prediction to assist in evidence verification.

---

## Technologies

- Python
- TensorFlow
- OpenCV
- Tesseract OCR
- BlazeFace

---

> **Note:** AI is used to assist the reporting process. Final verification of traffic violations should always be performed by authorized personnel.
