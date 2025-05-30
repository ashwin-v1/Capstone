import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import type { FileRejection } from 'react-dropzone';
import './index.css';

const Uploading = () => {
    const [pdfFiles, setPdfFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const predefinedTopics = [
        "Global Seasonality of Human Seasonal Coronaviruses, Circulating Season of Severe Acute Respiratory Syndrome",
        "Clinical Features of COVID-19 and Factors Associated with Severe Clinical Course",
        "Suboptimal Quality and High Risk of Bias in Diagnostic Test Accuracy Studies at Chest Radiography and CT in the Acute Setting of the COVID-19 Pandemic",
        "Laboratory Findings Comorbidities and Clinical Outcomes Comparing Medical Staff versus the General Population",
        "Sex-Specific COVID-19 Clinical Outcomes",
        "Clinical Outcomes of Early Versus Late Tracheostomy in Coronavirus Disease 2019 Patients",
        "Association Between Renin-Angiotensin-Aldosterone System Inhibitors and Clinical Outcomes in Patients With COVID-19",
        "Non-alcoholic fatty liver disease and clinical outcomes in patients with COVID-19",
        "Epidemiology and clinical features of COVID-19 outbreaks in aged care facilities",
        "Autopsy in COVID-19: what the clinician can learn from the dead?",
        "Relative sensitivity of anterior nares, mid-turbinate and nasopharyngeal swabs for detection of SARS-CoV-2",
        "Does metformin affect outcomes in COVID-19 patients with new or pre-existing diabetes mellitus",
        "Predicting mortality in severe COVID-19, clinical prediction rules for mortality from SARS-CoV-2 infection",
        "Effect of timing of intubation on clinical outcomes of critically ill patients with COVID-19",
        "The divergent protective effects of angiotensin-converting enzyme inhibitors and angiotensin receptor blockers on clinical outcomes of coronavirus disease 2019 (COVID-19)",
        "Corticosteroid use in COVID-19 patients",
        "The Impact of Dementia on the Clinical Outcome of COVID-19",
        "Ethnicity and clinical outcomes in COVID-19",
        "Corona Virus Disease 2019 (COVID-19) and Its Effect on Renal System",
        "The possibility and cause of relapse after previously recovered from COVID-19",
        "The use of invasive mechanical ventilation in COVID-19 patients",
        "Non-invasive ventilation for the care of patients infected with COVID-19",
        "COVID-19 infection risk to rescuers treating cardiac arrest",
        "Effect of convalescent blood products for patients with severe acute respiratory infections of viral etiology",
        "COVID-19 in pregnancy",
        "The novel 2019 coronavirus (nCoV) infection in humans",
        "Reducing stigma and discrimination associated with Covid-19",
        "Psychological consequences of COVID-19 amongst affected individuals, healthcare workers and the general population",
        "The accuracy of chest X-ray, CT and ultrasound for the diagnosis of patients with suspected COVID-19 in a hospital setting",
        "Rate of intensive care unit admission and outcomes among patients with corona viruses",
        "Clinical laboratory and imaging characteristics of children with COVID-19",
        "Impact of comorbidities on the disease course in SARS-CoV-2 infection",
        "Incidence and prognostic associations of myocardial injury in patients with coronavirus disease 2019 (COVID-19)",
        "Acute cardiac injury in patients suffering from COVID-19 infection",
        "Sociodemographic and clinical risk factors, laboratory parameters and treatments associated with higher mortality in COVID-19",
        "Maternal clinical characteristics and perinatal outcomes of pregnant women infected by coronavirus (COVID-19)",
        "Laboratory analysis and outcome for patients with COVID-19",
        "Efficacy and safety of lianhua qingwen for COVID-19",
        "The COVID-19 controversy over non-steroidal anti-inflammatory drugs (NSAIDs) in adult acute lower respiratory tract infections with COVID-19",
        "The effect of comorbid pulmonary diseases on the severity of COVID-19 patients",
        "Case fatality rates for COVID-19 patients requiring invasive mechanical ventilation",
        "Venous thromboembolism in COVID-19",
        "The prevalence of mental health disorders in university and college students during the COVID-19 pandemic",
        "The prevalence of depression, anxiety and sleep disorder in COVID-19 patients",
        "Nutritional screening tools used for identification of nutritional risk in older patients with COVID-19",
        "Home-based exercise programmes improve physical fitness of older adults",
        "Gender susceptibility in COVID-19 and outcomes",
        "Exploring options for reprocessing of N95 filtering facepiece respirators (N95-FFRs) amidst the COVID-19 pandemic",
        "Can immunity during pregnancy influence SARS-CoV-2 infection?",
        "Biomarkers of cytokine storm as red flags for severe and fatal COVID-19 cases",
        "Gastrointestinal symptoms and fecal nucleic acid testing of children with 2019 coronavirus disease",
        "Outcomes of mechanical ventilation among patients with COVID-19 adult respiratory distress syndrome",
        "Corticosteroids for COVID-19 treatment",
        "Mass screening versus community containment versus a combination of both to mitigate COVID-19",
        "Impact of non-pharmaceutical interventions targeted at the COVID-19 pandemic on influenza incidence and deaths",
        "Effect of COVID-19 on Tele-eyecare practice",
        "The role and response of primary care and community nursing in the delivery of palliative care in epidemics and pandemics",
        "Impact of disasters including pandemics such as COVID-19 on cardiometabolic outcomes across the life-course",
        "Prevalence and impact of cardiac injury in patients with COVID-19",
        "Exploring the impact of COVID-19 on mental health outcomes in children and adolescents",
        "Coronavirus disease 2019 (COVID-19) markedly increases mortality in patients with hip fracture",
        "The effects of ACEIs/ARBs on mortality in COVID-19 infected patients",
        "Perioperative mortality and morbidity in hip fractures among COVID-positive and COVID-negative patients",
        "Eating behavior changes during the COVID-19 pandemic",
        "Which mode of delivery is better for preventing possible vertical transmission from a pregnant mother confirmed with COVID-19 to a neonate? Cesarean or vaginal delivery?",
        "Eyes are the windows to COVID-19?",
        "Refugees and migrants and COVID-19",
        "Impact of COVID-19 on adolescents’ psychological state and mental health",
        "Effects of the COVID-19 pandemic on out-of-hospital cardiac arrest",
        "Hydroxychloroquine for treatment of nonsevere COVID-19 patients",
        "Human microbiome alteration in COVID-19 cases",
        "Effective public health measures to mitigate the spread of COVID-19",
        "Effect of weather on COVID-19 mortality",
        "Antibiotic prescribing in patients with COVID-19",
        "Venovenous extracorporeal membrane oxygenation for COVID-19 patients with severe acute respiratory distress syndrome",
        "Physical activity and sedentary behaviours of people during the COVID-19 pandemic lockdown compared with before the lockdown",
        "Impacts of COVID-19 on people with physical disabilities",
        "CT features of Coronavirus disease 2019 in children",
        "Pulmonary embolism and venous thromboembolism in COVID-19",
        "A rapid diagnostic test accuracy review of fear of COVID-19 scales",
        "Systemic inflammatory syndrome in COVID-19; multisystem inflammatory syndrome in children with SARS-CoV-2 infection"
    ];
    const [topicQuery, setTopicQuery] = useState('');
    const [filteredTopics, setFilteredTopics] = useState<string[]>([]);
    const [showTopicList, setShowTopicList] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Filter topics as user types
    useEffect(() => {
        setFilteredTopics(
            predefinedTopics.filter(topic =>
                topic.toLowerCase().startsWith(topicQuery.toLowerCase())
            )
        );
    }, [topicQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowTopicList(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

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
        formData.append('topic', topicQuery);

        try {
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
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

                {/* Autocomplete topic input */}
                <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        value={topicQuery}
                        onChange={e => {
                            setTopicQuery(e.target.value);
                            setShowTopicList(true);
                        }}
                        onFocus={() => setShowTopicList(true)}
                        placeholder="Select topic (optional)"
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            border: '1px solid var(--primary)',
                            boxSizing: 'border-box'
                        }}
                    />
                    {showTopicList && topicQuery && (
                        <ul
                            style={{
                                listStyle: 'none',
                                margin: 0,
                                padding: 0,
                                border: '1px solid #ccc',
                                position: 'absolute',
                                width: '100%',
                                maxHeight: '150px',
                                overflowY: 'auto',
                                background: '#fff',
                                zIndex: 10
                            }}
                        >
                            {filteredTopics.length > 0 ? (
                                filteredTopics.map(topic => (
                                    <li
                                        key={topic}
                                        onClick={() => {
                                            setTopicQuery(topic);
                                            setShowTopicList(false);
                                        }}
                                        style={{ padding: '8px', cursor: 'pointer' }}
                                    >
                                        {topic}
                                    </li>
                                ))
                            ) : (
                                <li style={{ padding: '8px', color: '#888' }}>No matches</li>
                            )}
                        </ul>
                    )}
                </div>

                <section {...getRootProps()} className="upload-zone">
                    <input {...getInputProps()} />
                    <p>Drag & drop biomedical PDFs here, or click to upload</p>
                    {pdfFiles.length > 0 && (
                        <p>
                            Selected files: <strong>{pdfFiles.map(file => file.name).join(', ')}</strong>
                        </p>
                    )}
                </section>
                {isProcessing && <div className="loading-spinner"></div>}
            </div>
        </div>
    );
};

export default Uploading;
