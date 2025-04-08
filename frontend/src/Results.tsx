import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, } from 'chart.js';
import { useLocation } from 'react-router-dom';
import './results.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ResultsData {
    topic: string;
    goodCount: number;
    badCount: number;
    pdfCount: number;
    confidence: number;
}

const Results: React.FC = () => {
    const location = useLocation();
    const results = location.state as ResultsData;

    if (!results) {
        return <div className="error-message">No analysis results found. Please upload PDFs first.</div>;
    }

    const data = {
        labels: ['Good PDFs', 'Bad PDFs'],
        datasets: [
            {
                data: [results.goodCount, results.badCount],
                backgroundColor: ['#1E3F66', '#BCD2E8'],
                hoverBackgroundColor: ['#1E3F66', '#BCD2E8'],
            },
        ],
    };

    const handleDownload = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/download');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'results.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    return (
        <div className="results-container">
            <h1>Topic: {results.topic}</h1>
            <div className="chart-container">
                <Pie data={data} />
            </div>
            <div className="summary-section">
                <div className="counts">
                    <p>Good PDFs: <strong>{results.goodCount}</strong></p>
                    <p>Bad PDFs: <strong>{results.badCount}</strong></p>
                    <p>Total PDFs: <strong>{results.pdfCount}</strong></p>
                </div>
                <button className="download-button" onClick={handleDownload}>
                    Download ZIP file of PDFs
                </button>
            </div>
        </div>
    );
};

export default Results;