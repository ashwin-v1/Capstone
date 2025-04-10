import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import type { FileRejection } from 'react-dropzone';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/web/pdf_viewer.css';
import { FileText, Microscope, Activity } from 'lucide-react';
import './index.css';

const Uploading = () => {
    const [pdfFiles, setPdfFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [topicName, setTopicName] = useState<string>("");
    const navigate = useNavigate();

    const { getRootProps, getInputProps } = useDropzone({
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 10,
        onDrop: (acceptedFiles: File[], fileRejections: FileRejection[]) => {
            if (fileRejections.length > 0) {
                alert('Please upload only PDF files');
                return;
            }
            handleFileUpload(acceptedFiles);
        },
    });

    const handleFileUpload = async (files: File[]) => {
        setIsProcessing(true);
        setPdfFiles(files);

        const formData = new FormData();
        files.forEach(file => formData.append('pdfs', file));
        // Pass the topic if provided (the backend includes it in the response for each file)
        formData.append('topic', topicName);

        try {
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            // 'data' contains { pdfCount, extractions: [ { filename, topic, parameters } ] }
            navigate('/results', { state: data });
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing PDFs. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="main-container">
            <div className="upload-card">
                <h1>M.A.R.S</h1>
                <p>Screen biomedical papers with AI</p>
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder="Enter topic name (optional)"
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            border: '1px solid var(--primary)',
                        }}
                    />
                </div>
                <section {...getRootProps()} className="upload-zone">
                    <input {...getInputProps()} />
                    <p>Drag & drop biomedical PDFs here, or click to upload</p>
                    {pdfFiles.length > 0 && (
                        <p>
                            Selected files: <strong>{pdfFiles.map((file) => file.name).join(', ')}</strong>
                        </p>
                    )}
                </section>
                {isProcessing && <div className="loading-spinner"></div>}
            </div>
        </div>
    );
};

export default Uploading;
