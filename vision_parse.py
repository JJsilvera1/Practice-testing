import fitz  # PyMuPDF
import base64
import requests
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

MODEL_ID = "qwen/qwen3-vl-30b-a3b-instruct"

def pdf_page_to_base64(page):
    """Convert a PyMuPDF page to a base64 encoded PNG image."""
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # Increase resolution
    img_data = pix.tobytes("png")
    return base64.b64encode(img_data).decode('utf-8')

def call_vision_model(base64_image):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    
    prompt = (
        "Extract the exam questions, multiple-choice options, correct answers, and justifications from this image. "
        "If any text is unclear due to image quality or OCR artifacts, use your expertise to enhance the text and "
        "make the best educated guess possible to ensure consistency and professional integrity. "
        "Output ONLY a JSON array of objects with the following structure: "
        '[{"number": "1", "question": "Question text...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "answer": "C", "justification": {"A": "...", "B": "...", "C": "...", "D": "..."}}]. '
        "Exclude all headers, footers, page numbers, and any other text not part of a question or its explanation. "
        "If a question is split across pages, provide only the full questions that start on this page. "
        "Return ONLY valid JSON. DO NOT include any conversational text, introductory remarks, or explanations. "
        "If no multiple-choice questions are found on this page, return an empty array `[]`."
    )

    payload = {
        "model": MODEL_ID,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        
        if 'choices' not in result or not result['choices']:
            return []
            
        content = result['choices'][0]['message']['content']
        
        # Clean the output in case it has markdown blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return []
    except Exception as e:
        print(f"Error calling vision model: {e}")
        return []

def process_pdf(pdf_path, output_path, start_page=19):
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    checkpoint_path = output_path + ".checkpoint"
    
    data = {"last_page": start_page - 1, "questions": []}
    
    # Try to load existing checkpoint
    if os.path.exists(checkpoint_path):
        try:
            with open(checkpoint_path, "r", encoding="utf-8") as f:
                loaded_data = json.load(f)
                if isinstance(loaded_data, dict) and "last_page" in loaded_data:
                    data = loaded_data
                    print(f"Resuming from page {data['last_page'] + 1}")
                elif isinstance(loaded_data, list):
                    # Legacy format, try to recover
                    data["questions"] = loaded_data
                    data["last_page"] = start_page - 1 # We don't know, so we might re-process
                    print("Legacy checkpoint found, questions recovered. Starting from configured start_page.")
        except Exception as e:
            print(f"Error loading checkpoint: {e}. Starting fresh.")

    # Main loop
    for i in range(data["last_page"], total_pages):
        page_num = i + 1
        print(f"Processing page {page_num}/{total_pages}...")
        page = doc[i]
        
        base64_img = pdf_page_to_base64(page)
        questions = call_vision_model(base64_img)
        
        if questions:
            print(f"  Found {len(questions)} questions.")
            data["questions"].extend(questions)
        else:
            print(f"  No questions found on page {page_num}.")
            
        # Update checkpoint after every page
        data["last_page"] = i + 1
        with open(checkpoint_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        
        # Polite delay
        time.sleep(1)
        
    # Final save
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data["questions"], f, indent=4)
    
    print(f"Finished. Total questions extracted: {len(data['questions'])}")

if __name__ == "__main__":
    pdf_path = r"C:\Users\Jordan\Practice testing\CISM Review Questions, Answ 10th edition ocr.pdf"
    # Write directly to the public folder of the quiz app for live development
    output_path = r"C:\Users\Jordan\Practice testing\quiz-app\public\questions.json"
    
    # Starting/Resuming full extraction from page 19
    process_pdf(pdf_path, output_path, start_page=19)
