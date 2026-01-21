# CISM Mastery Hub 🏆

A professional-grade, high-performance study platform for CISM (Certified Information Security Manager) candidates. This repository contains both a high-end web application and an AI-powered data processing pipeline.

![CISM Hub Preview](https://img.shields.io/badge/Status-Complete-emerald) 
![Stack-React-blue](https://img.shields.io/badge/Stack-React_19-blue)
![Stack-Python-yellow](https://img.shields.io/badge/Pipeline-Python_Vision-yellow)
![Offline-Support-brightgreen](https://img.shields.io/badge/Offline-PWA_Enabled-brightgreen)

---

## 🚀 Key Features

### 1. Advanced Study Experience
- **1,000 Professional Questions**: Fully cleaned and domain-aware question bank.
- **Official Domain Weighting**: Simulates the ISACA distribution (17% Governance, 20% Risk, 33% Program Development, 30% Incident Management).
- **Scaled Scoring System**: Implements the official 200–800 score range with a 450 passing threshold.
- **Training & Quiz Modes**: 
  - *Training*: Instant feedback with comprehensive rationales.
  - *Quiz/Exam*: Hidden outcomes to simulate real-world testing conditions.
- **Flag for Review**: Flag difficult questions during a session and review them later in the results phase, regardless of whether you got them right.

### 2. Offline Resilience (New) 📴
- **PWA (Progressive Web App)**: Install the app on your desktop or mobile. The service worker caches all assets and question data, allowing for 100% offline study sessions.
- **Session Persistence**: Progress is automatically saved to `localStorage`. If you refresh, crash, or go offline during an exam, you can pick up exactly where you left off.
- **Upfront Loading**: The entire question bank is loaded into memory on initial start, ensuring lightning-fast performance without subsequent network requests.

### 3. AI-Powered Data Pipeline 🧠
- **Vision-Based Extraction**: Uses the Qwen-VL vision model via OpenRouter to meticulously extract questions from complex PDF layouts.
- **Auto-Enhancement**: Intelligent AI logic cleans OCR artifacts, corrects blurry text, and ensures professional integrity.
- **Domain Mapping**: Questions are automatically categorized into their respective CISM domains based on the source structure.

---

## 🔍 How the Scanning Works (`vision_parse.py`)

The extraction pipeline is designed to handle complex, multi-column exam layouts that traditional OCR often fails to parse correctly.

### Core Logic Snippet
```python
def call_vision_model(base64_image):
    # Prompting the model to act as a structured data extractor
    prompt = (
        "Extract the exam questions, multiple-choice options, correct answers, "
        "and justifications from this image. Output ONLY a JSON array..."
    )
    
    # Sending high-resolution imagery to the vision model
    payload = {
        "model": "qwen/qwen3-vl-30b-a3b-instruct",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
            ]
        }]
    }
    # ... handles base64 conversion and JSON cleaning
```

### Extraction Workflow
1. **Visual Pre-processing**: PDF pages are converted to PNGs at 2x scale for maximum clarity.
2. **AI Inference**: The Qwen-VL model analyzes the page structure, distinquishing between questions, justifications, and noise (headers/footers).
3. **Data Cleaning**: The script automatically handles markdown-to-JSON cleaning and validates the schema.
4. **Resilience**: A checkpoint system (`questions.json.checkpoint`) ensures that if the process is interrupted, it resumes from the exact page where it stopped.

---

## 📊 CISM Scoring Standards

| Metric | Target |
| :--- | :--- |
| **Pass Mark** | 450 / 800 |
| **Domain 1 (Governance)** | 17% Weight |
| **Domain 2 (Risk Management)** | 20% Weight |
| **Domain 3 (Program Development)** | 33% Weight |
| **Domain 4 (Incident Management)** | 30% Weight |

---

## 🛠️ Setup & Installation

### Running the App
1. Navigate to `quiz-app`
2. `npm install`
3. `npm run dev`

### Running the Vision Pipeline
1. Ensure your `.env` contains a valid `OPENROUTER_API_KEY`.
2. Install Python dependencies: `pip install pymupdf requests python-dotenv`.
3. Run `python vision_parse.py`.

---

## 🌐 Deployment
The app is optimized for **Vercel**.
- **Root Directory**: `quiz-app`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite

The included `vercel.json` ensures smooth SPA routing and high-performance caching headers.
