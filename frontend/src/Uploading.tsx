import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page } from 'react-pdf';
import type { FileRejection } from 'react-dropzone';
import 'pdfjs-dist/web/pdf_viewer.css';
import { FileText, Microscope, Activity } from 'lucide-react';
import './index.css';

interface AnalysisResults {
    //  numOfFiles: string[];
    topic: string[];
    // score: string[];
    confidence: number;
}

const Uploading = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);

    const { getRootProps, getInputProps } = useDropzone({
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        onDrop: (acceptedFiles: File[], fileRejections: FileRejection[]) => {
            if (fileRejections.length > 0) {
                alert('Please upload only PDF files');
                return;
            }
            handleFileUpload(acceptedFiles[0]);
        },
    });

    useEffect(() => {
        if (pdfFile) {
            const objectUrl = URL.createObjectURL(pdfFile);
            setPdfUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [pdfFile]);

    const handleFileUpload = async (file: File) => {
        setIsProcessing(true);
        setPdfFile(file);
        setResults(null);

        try {
            const mockResults = await processPDF(file);
            setResults(mockResults);
        } catch (error) {
            console.error('Error processing PDF:', error);
            alert('Error processing PDF. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const processPDF = async (file: File): Promise<AnalysisResults> => {
        return new Promise((resolve) =>
            setTimeout(
                () =>
                    resolve({
                        // numOfFiles: ['IL-6', 'CRP', 'TNF-α'],
                        topic: ['COVID-19'],
                        // score: ['score'],
                        confidence: 0.92,
                    }),
                2000
            )
        );
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    return (
        <div className="main-container">
            <div className="upload-card">
                <h1>M.A.R.S</h1>
                <p>Screen biomedical papers with AI</p>
                <section {...getRootProps()} className="upload-zone">
                    <input {...getInputProps()} />
                    <p>Drag & drop a biomedical PDF here, or click to upload</p>
                    {pdfFile && (
                        <p>
                            Selected file: <strong>{pdfFile.name}</strong>
                        </p>
                    )}
                </section>

                {isProcessing && <div className="loading-spinner"></div>}

                {results && pdfUrl && (
                    <>
                        <div style={{ marginTop: '2rem' }}>
                            {numPages && <p>Pages: {numPages}</p>}
                        </div>
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
        <h3>Topic</h3>
        {/* <p>{results.numOfFiles.join(', ')}</p> */}
        <h3></h3>
        {/* <p>{results.score.join(', ')}</p> */}
        <h3>Summary</h3>

        <p>
            <Activity style={{ marginRight: '0.5rem' }} />
            Analysis Confidence: {(results.confidence * 100).toFixed(1)}%
        </p>
    </div>
);

export default Uploading;
