import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page } from 'react-pdf';
import type { FileRejection } from 'react-dropzone';
import 'pdfjs-dist/web/pdf_viewer.css';
import { FileText, Microscope, Activity } from 'lucide-react';
import './index.css';

interface AnalysisResults {
    pdfCount: number;
    topic: string[];
    score: string[];
    confidence: number;
}

const Uploading = () => {
    const [pdfFiles, setPdfFiles] = useState<File[]>([]);
    const [pdfUrls, setPdfUrls] = useState<string[]>([]);
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [topicName, setTopicName] = useState<string>("");

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

    useEffect(() => {
        if (pdfFiles.length > 0) {
            const urls = pdfFiles.map((file) => URL.createObjectURL(file));
            setPdfUrls(urls);
            return () => {
                urls.forEach((url) => URL.revokeObjectURL(url));
            };
        }
    }, [pdfFiles]);

    const handleFileUpload = async (files: File[]) => {
        setIsProcessing(true);
        setPdfFiles(files);
        setResults(null);

        try {
            const mockResults = await processPDF(files);
            setResults(mockResults);
        } catch (error) {
            console.error('Error processing PDF:', error);
            alert('Error processing PDF. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const processPDF = async (files: File[]): Promise<AnalysisResults> => {
        return new Promise((resolve) =>
            setTimeout(
                () =>
                    resolve({
                        pdfCount: files.length,
                        topic: topicName ? [topicName] : ['Default Topic'],
                        score: ['score'],
                        confidence: 0.92,
                    }),
                2000
            )
        );
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
                        placeholder="Enter topic name"
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
                {results && pdfUrls.length > 0 && (
                    <>
                        <AnalysisResultsView results={results} />
                    </>
                )}
            </div>
        </div>
    );
};

const AnalysisResultsView: React.FC<{ results: AnalysisResults }> = ({ results }) => (
    <div style={{ marginTop: '2rem', textAlign: 'left' }}>
        <h2>
            <Microscope style={{ marginRight: '0.5rem' }} />
            Analysis Results
        </h2>
        <h3>Number of PDFs Uploaded</h3>
        <p>{results.pdfCount}</p>
        <h3>Topic</h3>
        <p>{results.topic.join(', ')}</p>
        <h3>Score</h3>
        <p>{results.score.join(', ')}</p>
        <p>
            <Activity style={{ marginRight: '0.5rem' }} />
            Analysis Confidence: {(results.confidence * 100).toFixed(1)}%
        </p>
    </div>
);

export default Uploading;
