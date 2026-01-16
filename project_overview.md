# CISM Mastery Application - Documentation

This document provides a comprehensive overview of the CISM Mastery application, its architecture, features, and the data processing pipeline.

## 🚀 Overview
CISM Mastery is a specialized web-based quiz application designed for CISM (Certified Information Security Manager) candidates. It transforms OCR-extracted PDF content into a high-performance, interactive study tool with official domain weighting and scaled scoring.

## 🛠️ Technology Stack
- **Frontend**: React 19 (Vite)
- **Styling**: Tailwind CSS + Glassmorphism Aesthetics
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Data Processor**: Python + PyMuPDF + OpenRouter (Qwen-VL)

## 🏗️ Architecture & Features

### 1. Intelligence & Data Pipeline (`vision_parse.py`)
- **Visual OCR**: Uses `qwen/qwen3-vl-30b-a3b-instruct` via OpenRouter to parse complex PDF layouts.
- **Auto-Enhancement**: AI enhances blurry text and guesses missing fragments to maintain professional integrity.
- **Structured Export**: Converts PDF pages into a meticulously structured `questions.json` array.

### 2. Core Application (`quiz-app/src/App.tsx`)
- **Domain-Based Logic**: Questions are mapped to the 4 official CISM domains:
  - Domain 1: Governance (17%)
  - Domain 2: Risk Management (20%)
  - Domain 3: Program Development (33%)
  - Domain 4: Incident Management (30%)
- **Dynamic Session Configuration**:
  - Customizable question counts.
  - Active/Disabled timer settings.
  - **Training Mode**: Immediate feedback and comprehensive rationales after every question.
  - **Quiz Mode**: Hidden outcomes until the final results page to simulate exam conditions.

### 3. Advanced Analytics & Scoring
- **Official Scaled Scoring**: Implements the ISACA 200-800 scale.
- **Weighted Results**: Final scores are calculated using the 17/20/33/30 domain distribution.
- **Pass/Fail Indicator**: Dynamic thresholds (Passing: 450) with professional status badges.
- **Domain Strength Breakdown**: Visual statistical summary of performance per domain to identify weak areas.

### 4. User Experience (UX)
- **Glassmorphism Design**: High-end transparent UI elements with subtle micro-animations.
- **Dark/Light Modes**: Persistent theme switching for late-night study sessions.
- **Session History**: Local storage persistence of past quiz attempts.
- **Printable Reports**: Integrated print styles for capturing results and rationales in physical/PDF format.

## 📁 Key Files
| File | Description |
| :--- | :--- |
| `quiz-app/public/questions.json` | The primary database of 1,000 cleaned, domain-mapped questions. |
| `quiz-app/src/App.tsx` | The "brain" of the application handling state, scoring, and UI logic. |
| `vision_parse.py` | Python script for AI-powered PDF extraction. |
| `clean_json.py` | (Utility) Script used for cleaning OCR artifacts and re-mapping domains. |
| `.env` | Stores API keys for the OpenRouter/Vision model pipeline. |

## 📊 Domain Distribution Summary
| Domain | Question Range | Weight |
| :--- | :--- | :--- |
| **1. Governance** | 1 - 175 | 17% |
| **2. Risk Management** | 176 - 385 | 20% |
| **3. Program Development** | 386 - 770 | 33% |
| **4. Incident Management** | 771 - 1000 | 30% |

## ✅ Passing Standards
- **Minimum Scaled Score**: 200
- **Maximum Scaled Score**: 800
- **Passing Threshold**: 450
- *Note: No individual domain cutoffs are required; the total weighted score is the determining factor.*

## 🚀 Vercel Deployment Instructions
To host this application on Vercel:
1. **Repository Setup**: If your project is in a monorepo, ensure you point the **Root Directory** to `quiz-app` in the Vercel dashboard.
2. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Framework Preset**: `Vite`
3. **Domain & Routing**: The included `vercel.json` handles all SPA routing and security headers automatically.
