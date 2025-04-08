# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import pdfplumber
import zipfile
from io import BytesIO
from dotenv import load_dotenv
import openai
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

MAX_FILE_SIZE_MB = 100
ALLOWED_EXTENSIONS = {'pdf'}

client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def analyze_text(text: str, topic: str) -> dict:
    """Extract structured parameters using GPT-4"""
    prompt = f"""
    Extract the following parameters from this biomedical paper text:
    - Title
    - Abstract
    - Topic
    
    Return JSON format with keys: title, abstract, topic
    
    Text excerpt: {text[:6000]}  
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a biomedical research analyst."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        analysis = json.loads(response.choices[0].message.content)
        return {
            'is_good': analysis.get('is_good', False),
            'confidence': analysis.get('confidence', 0.0),
            'reason': analysis.get('reason', 'Analysis unavailable')
        }
    except Exception as e:
        print(f"OpenAI error: {str(e)}")
        return {'is_good': False, 'confidence': 0.0, 'reason': 'Analysis failed'}

@app.route('/api/upload', methods=['POST'])
def handle_upload():
    try:
        if 'pdfs' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400
            
        topic = request.form.get('topic', 'General Biomedical Analysis')
        files = request.files.getlist('pdfs')
        
        if not files:
            return jsonify({'error': 'No files selected'}), 400

        good_count = 0
        bad_count = 0
        total_files = len(files)
        confidences = []

        for file in files:
            if file and allowed_file(file.filename):
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    file.save(tmp.name)
                    
                    text = ""
                    with pdfplumber.open(tmp.name) as pdf:
                        for page in pdf.pages:
                            text += page.extract_text() or ""
                    
                    analysis = analyze_text(text, topic)
                    confidences.append(analysis['confidence'])
                    
                    if analysis['is_good']:
                        good_count += 1
                    else:
                        bad_count += 1
                
                os.unlink(tmp.name)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        return jsonify({
            'pdfCount': total_files,
            'topic': topic,
            'goodCount': good_count,
            'badCount': bad_count,
            'confidence': round(avg_confidence, 2)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['GET'])
def download_files():
    memory_file = BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        zf.writestr('analysis_results.txt', 'Full implementation would include processed PDFs here')
    memory_file.seek(0)
    return send_file(memory_file, download_name='results.zip', as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')