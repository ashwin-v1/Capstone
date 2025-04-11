from flask import Flask, request, jsonify, send_file, after_this_request
from unsloth import FastLanguageModel
from flask_cors import CORS
from io import BytesIO
from dotenv import load_dotenv
from openai import OpenAI
import os
import tempfile
import pdfplumber
import zipfile
import torch
import json

#Load environment variables
load_dotenv('key.env')

app = Flask(__name__)
CORS(app)

MAX_FILE_SIZE_MB = 100
ALLOWED_EXTENSIONS = {'pdf'}

#Init openai api
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

#Folder for bad pdfs
BAD_PDF_DIR = os.path.join(os.getcwd(), 'bad_pdfs')
if not os.path.exists(BAD_PDF_DIR):
    os.makedirs(BAD_PDF_DIR)

#Folder for good pdfs
GOOD_PDF_DIR = os.path.join(os.getcwd(), 'good_pdfs')
if not os.path.exists(GOOD_PDF_DIR):
    os.makedirs(GOOD_PDF_DIR)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

#Uses GPT-4o mini to extract details from paper, returns an object with extracted details
def extract_parameters(text: str) -> dict:
    #Truncate text to avoid token limit
    truncated_text = text[:6000]
    prompt1 = "For the following biomedical paper: "
    prompt2 = "\nPlease extract the following details from the paper:The Title, Abstract, Number of references, Study Type (e.g., RCT, observational, cohort, case-control, etc.), Study Population Size"
    prompt3 = " ONLY respond with the extracted details in the given order with each detail separated by a | symbol. Only include the values without labels."
    final_prompt = prompt1 + truncated_text + prompt2 + prompt3

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": final_prompt}],
        )
        result = response.choices[0].message.content.strip()
        parameters = result.split("|")

        retry_count = 0
        max_retry = 5

        while len(parameters) != 5 and retry_count < max_retry:
            prompt_add = f"\nThe last response had {len(parameters)} details. Please provide ONLY the 5 requested details as a | separated list."
            new_prompt = final_prompt + prompt_add

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": new_prompt}],
            )

            result = response.choices[0].message.content.strip()
            parameters = result.split("|")
            retry_count += 1

        if len(parameters) == 5:
            cleaned_params = [p.strip() for p in parameters]
            extraction_string = "| ".join(cleaned_params)
            print(f"GPT Extracted String: {extraction_string}")
            return {
                "title": cleaned_params[0],
                "abstract": cleaned_params[1],
                "num_references": cleaned_params[2],
                "study_type": cleaned_params[3],
                "study_population_size": cleaned_params[4],
                "extraction_string": extraction_string
            }
        else:
            return {"error": "Could not extract parameters correctly"}
    except Exception as e:
        print(f"OpenAI error in parameter extraction: {str(e)}")
        return {"error": "Parameter extraction failed"}

#Generates prediction from model for provided params
def modelInference(topic, title, abstract, references, study_type, pop_size):
    user_prompt = f"For the given Topic: {topic}\nAsnwer if the following academic paper is good or bad\nTitle: {title}\nAbstract: {abstract} Number of References: {references}\nStudy Type: {study_type}\nStudy Population Size: {pop_size}"

    message = [
    {"role": "user", "content": user_prompt},]

    #Setup and Test model
    max_seq_length = 2048 #Max num of input tokens (2048 tokens)
    dtype = None #None = auto-detect, selects optimal PyTorch data type, used to store model weights/activations
    load_in_4bit = True # (QLoRA = True) Using 4bit quantization

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = "llama3.2_3B_fullParamDataset_3epoch",
        # chat_template = "llama-3.1",
        max_seq_length = max_seq_length,
        dtype = dtype,
        load_in_4bit = load_in_4bit,
    )
    FastLanguageModel.for_inference(model)

    #Convert to llama chat template
    inputs = tokenizer.apply_chat_template(
        message,
        tokenize = True,
        add_generation_prompt = True,
        return_tensors = "pt",
    ).to("cuda")

    outputs = model.generate(input_ids = inputs, max_new_tokens = 64, use_cache = True,
                         temperature = 1.5, min_p = 0.1)
    model_response = str(tokenizer.batch_decode(outputs))
    ans = model_response.split("<|start_header_id|>assistant<|end_header_id|>")[1].split("<|eot_id|>")[0].strip()

    print(f"Model Response: {model_response}\n\nAnswer: {ans}")

    return ans

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
        goodCount = 0
        badCount = 0
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

                    # print(f"pdfplumber extracted text: {text}")

                    #Extract parameters using GPT
                    parameters = extract_parameters(text) if text.strip() else {"error": "No text extracted"}

                    #Get model prediction
                    prediction = modelInference(topic, parameters["title"], parameters["abstract"], parameters["num_references"], parameters["study_type"], parameters["study_population_size"])

                    #Default to bad pdf for now
                    if "good" in prediction:
                        goodCount += 1
                        good_pdf_path = os.path.join(GOOD_PDF_DIR, file.filename)
                        with open(tmp.name, 'rb') as src, open(good_pdf_path, 'wb') as dst:
                            dst.write(src.read())
                    
                    if "bad" in prediction:
                        badCount += 1
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
                    print()
                os.unlink(tmp.name)

        # print("Upload extraction results:", results)
        return jsonify({
            'pdfCount': len(results),
            'goodCount': goodCount,
            'badCount': badCount,
            'topic': topic,
            'extractions': results
        })

    except Exception as e:
        print("Unhandled error in /api/upload:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['GET'])
def download_files():
    """
    Create a zip archive to download
    """
    memory_file = BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        #Add bad PDFs
        for root, _, files in os.walk(BAD_PDF_DIR):
            for filename in files:
                file_path = os.path.join(root, filename)
                zf.write(file_path, arcname=os.path.join('bad_pdfs', filename))

        #Add good PDFs
        for root, _, files in os.walk(GOOD_PDF_DIR):
            for filename in files:
                file_path = os.path.join(root, filename)
                zf.write(file_path, arcname=os.path.join('good_pdfs', filename))

    memory_file.seek(0)
    
    @after_this_request
    def cleanup(response):
        try:
            #Clear bad_pdfs and good_pdfs data
            for folder in [BAD_PDF_DIR, GOOD_PDF_DIR]:
                for f in os.listdir(folder):
                    file_path = os.path.join(folder, f)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
        except Exception as e:
            print("Cleanup error:", e)
        return response

    return send_file(memory_file, download_name='all_pdfs.zip', as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')
