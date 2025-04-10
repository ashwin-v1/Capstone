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

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

MAX_FILE_SIZE_MB = 100
ALLOWED_EXTENSIONS = {'pdf'}

# Initialize the OpenAI client with your API key
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Define a folder for "bad" PDFs
BAD_PDF_DIR = os.path.join(os.getcwd(), 'bad_pdfs')
if not os.path.exists(BAD_PDF_DIR):
    os.makedirs(BAD_PDF_DIR)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_parameters(text: str) -> dict:
    """
    Use GPT-4o to extract these details from the biomedical paper text:
      - Number of references
      - Study Type (e.g., RCT, observational, cohort, case-control, etc.)
      - Study Population Size
      - Control Group Size
      - Sampling Method (Randomized, convenience sampling, or stratified sampling)
    
    The API is instructed to return a comma-separated list. The function then returns
    an object that includes an "extraction_string" (a comma-separated string of the five values).
    """
    # Truncate text to avoid exceeding token limits
    truncated_text = text[:6000]
    prompt1 = "For the following biomedical paper: "
    prompt2 = "\nPlease extract the following details from the paper: Number of references, Study Type (e.g., RCT, observational, cohort, case-control, etc.), Study Population Size, Control Group Size, Sampling Method (Randomized, convenience sampling, or stratified sampling)"
    prompt3 = " ONLY respond with the extracted details in the given order with each detail separated by a comma. Only include the values without labels."
    final_prompt = prompt1 + truncated_text + prompt2 + prompt3

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": final_prompt}],
        )
        result = response.choices[0].message.content.strip()
        parameters = result.split(",")
        retry_count = 0
        max_retry = 5
        while len(parameters) != 5 and retry_count < max_retry:
            prompt_add = f"\nThe last response had {len(parameters)} details. Please provide ONLY the 5 requested details as a comma-separated list."
            new_prompt = final_prompt + prompt_add
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": new_prompt}],
            )
            result = response.choices[0].message.content.strip()
            parameters = result.split(",")
            retry_count += 1

        if len(parameters) == 5:
            cleaned_params = [p.strip() for p in parameters]
            extraction_string = ", ".join(cleaned_params)
            return {
                "num_references": cleaned_params[0],
                "study_type": cleaned_params[1],
                "study_population_size": cleaned_params[2],
                "control_group_size": cleaned_params[3],
                "sampling_method": cleaned_params[4],
                "extraction_string": extraction_string
            }
        else:
            return {"error": "Could not extract parameters correctly"}
    except Exception as e:
        print(f"OpenAI error in parameter extraction: {str(e)}")
        return {"error": "Parameter extraction failed"}

@app.route('/api/upload', methods=['POST'])
def handle_upload():
    try:
        if 'pdfs' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400

        topic = request.form.get('topic', 'General Biomedical Analysis')
        files = request.files.getlist('pdfs')
        if not files:
            return jsonify({'error': 'No files selected'}), 400

        results = []
        for file in files:
            if file and allowed_file(file.filename):
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    file.save(tmp.name)
                    text = ""
                    try:
                        with pdfplumber.open(tmp.name) as pdf:
                            for page in pdf.pages:
                                text_segment = page.extract_text()
                                if text_segment:
                                    text += text_segment
                    except Exception as e:
                        print(f"Error reading PDF {file.filename}:", str(e))

                    parameters = extract_parameters(text) if text.strip() else {"error": "No text extracted"}

                    # Default to bad pdf for now
                    bad_pdf_path = os.path.join(BAD_PDF_DIR, file.filename)
                    with open(tmp.name, 'rb') as src, open(bad_pdf_path, 'wb') as dst:
                        dst.write(src.read())

                    extraction_string = parameters.get("extraction_string") if "error" not in parameters else parameters.get("error")
                    print(f"Extraction for {file.filename}: {extraction_string}")

                    results.append({
                        'filename': file.filename,
                        'topic': topic,
                        'parameters': parameters,
                        'extractionString': extraction_string
                    })
                os.unlink(tmp.name)

        print("Upload extraction results:", results)
        return jsonify({
            'pdfCount': len(results),
            'extractions': results
        })

    except Exception as e:
        print("Unhandled error in /api/upload:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['GET'])
def download_files():
    """
    Create a zip archive containing all PDFs from the 'bad_pdfs' folder.
    """
    memory_file = BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        for root, dirs, files in os.walk(BAD_PDF_DIR):
            for filename in files:
                file_path = os.path.join(root, filename)
                zf.write(file_path, arcname=filename)
    memory_file.seek(0)
    return send_file(memory_file, download_name='bad_pdfs.zip', as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')
