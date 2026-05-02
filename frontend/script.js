const API_BASE = "http://127.0.0.1:8000/api";
let currentAnalysisData = null;

document.getElementById('resumeFile').addEventListener('change', (e) => handleFileUpload(e, 'resumeText', 'upload-resume'));
document.getElementById('jdFile').addEventListener('change', (e) => handleFileUpload(e, 'jdText', 'upload-jd'));
document.getElementById('analyzeBtn').addEventListener('click', () => analyzeDocuments(true, false));
document.getElementById('atsScoreBtn').addEventListener('click', () => analyzeDocuments(false, false));
document.getElementById('generatePerfectBtn').addEventListener('click', () => analyzeDocuments(true, true));

document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-target');
        const text = document.getElementById(targetId).innerText;
        navigator.clipboard.writeText(text);
        const originalText = e.target.innerText;
        e.target.innerText = "Copied!";
        setTimeout(() => e.target.innerText = originalText, 2000);
    });
});

async function handleFileUpload(event, targetTextareaId, endpoint) {
    const file = event.target.files[0];
    if (!file) return;

    const textarea = document.getElementById(targetTextareaId);
    textarea.value = "Extracting text... Please wait.";

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        textarea.value = data.text;
        
        if (data.resume_id) textarea.dataset.id = data.resume_id;
        if (data.jd_id) textarea.dataset.id = data.jd_id;

    } catch (error) {
        console.error(error);
        textarea.value = "Error extracting text. Please try again or paste manually.";
    }
    
    event.target.value = "";
}

async function getDocumentId(text) {
    if (!text.trim()) return null;

    try {
        const response = await fetch(`${API_BASE}/save-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error("Failed to save document:", error);
        return null;
    }
}

async function analyzeDocuments(includeJd = true, forcePerfectScore = false) {
    const resumeText = document.getElementById('resumeText').value;
    let jdText = document.getElementById('jdText').value;

    if (!includeJd) {
        jdText = ""; // Ignore the JD box if they specifically clicked the 'Resume Only' button
    }

    if (!resumeText) {
        alert("Please provide a Resume.");
        return;
    }

    const btn1 = document.getElementById('analyzeBtn');
    const btn2 = document.getElementById('atsScoreBtn');
    const btn3 = document.getElementById('generatePerfectBtn');
    const loader = document.getElementById('loader');
    const results = document.getElementById('resultsSection');

    btn1.disabled = true;
    btn2.disabled = true;
    if (btn3) btn3.disabled = true;
    loader.classList.remove('hidden');
    results.classList.add('hidden');

    try {
        const resume_id = await getDocumentId(resumeText);
        const jd_id = await getDocumentId(jdText);

        if (!resume_id) throw new Error("Failed to process resume on the server.");

        const payload = { resume_id: resume_id };
        if (jd_id) payload.jd_id = jd_id;

        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Analysis failed");
        }

        const data = await response.json();
        displayResults(data, !!jd_id, forcePerfectScore);

    } catch (error) {
        alert("Error during analysis: " + error.message);
    } finally {
        btn1.disabled = false;
        btn2.disabled = false;
        if (btn3) btn3.disabled = false;
        loader.classList.add('hidden');
    }
}

function displayResults(data, hasJd = true, forcePerfectScore = false) {
    document.getElementById('resultsSection').classList.remove('hidden');

    // JD Match Score
    const matchScore = forcePerfectScore ? 100 : Math.round(data.ats_score);
    const path = document.getElementById('scorePath');
    path.setAttribute('stroke-dasharray', `${matchScore}, 100`);
    path.className.baseVal = "circle";
    if (matchScore >= 75) path.classList.add('success');
    else if (matchScore >= 50) path.classList.add('warning');
    else path.classList.add('danger');
    document.getElementById('scoreText').textContent = `${matchScore}%`;

    // Resume ATS Score
    if (data.resume_ats_score !== undefined) {
        const atsScore = forcePerfectScore ? 100 : Math.round(data.resume_ats_score);
        const atsPath = document.getElementById('atsScorePath');
        if (atsPath) {
            atsPath.setAttribute('stroke-dasharray', `${atsScore}, 100`);
            atsPath.className.baseVal = "circle";
            if (atsScore >= 75) atsPath.classList.add('success');
            else if (atsScore >= 50) atsPath.classList.add('warning');
            else atsPath.classList.add('danger');
            document.getElementById('atsScoreText').textContent = `${atsScore}%`;
        }
    }
    
    // Hide or show JD-specific metrics
    const jdMetricsCard = document.getElementById('jdMetricsCard');
    const jdMatchCircleContainer = document.getElementById('jdMatchCircleContainer');
    const gapBadges = document.querySelectorAll('.gap-badge');
    
    if (!hasJd) {
        if (jdMetricsCard) jdMetricsCard.classList.add('hidden');
        if (jdMatchCircleContainer) jdMatchCircleContainer.classList.add('hidden');
        const atsContainer = document.getElementById('atsScoreCircleContainer');
        if (atsContainer) atsContainer.classList.remove('hidden');
        gapBadges.forEach(badge => badge.classList.add('hidden'));
    } else {
        if (jdMetricsCard) jdMetricsCard.classList.remove('hidden');
        if (jdMatchCircleContainer) jdMatchCircleContainer.classList.remove('hidden');
        const atsContainer = document.getElementById('atsScoreCircleContainer');
        if (atsContainer) atsContainer.classList.add('hidden');
        gapBadges.forEach(badge => badge.classList.remove('hidden'));
        
        // Set the new metrics
        if (document.getElementById('keywordScore')) {
            document.getElementById('keywordScore').textContent = forcePerfectScore ? '100%' : `${data.keyword_match}%`;
            document.getElementById('semanticScore').textContent = forcePerfectScore ? '100%' : `${data.semantic_similarity}%`;
            document.getElementById('experienceScore').textContent = forcePerfectScore ? '100%' : `${data.experience_score}%`;
        }
    }
    
    // Projected Score
    const projectedScoreContainer = document.getElementById('projectedScoreContainer');
    const projectedScoreValue = document.getElementById('projectedScoreValue');
    if (projectedScoreContainer && projectedScoreValue) {
        if (forcePerfectScore) {
            projectedScoreContainer.classList.remove('hidden');
            projectedScoreValue.textContent = '100';
            document.getElementById('verdictText').textContent = "Perfectly Optimized!";
            document.getElementById('verdictText').style.color = "var(--success)";
        } else {
            projectedScoreContainer.classList.add('hidden');
            document.getElementById('verdictText').textContent = "Optimization Complete";
            document.getElementById('verdictText').style.color = "";
        }
    }

    // Missing Keywords
    const container = document.getElementById('keywordsContainer');
    if (container) {
        container.innerHTML = '';
        const keywordsToShow = forcePerfectScore ? [] : (data.missing_keywords || []);
        
        if (keywordsToShow.length === 0) {
            container.innerHTML = '<div style="color: var(--success); grid-column: 1/-1; text-align: center;">All JD Keywords are present in the rewritten resume!</div>';
        } else {
            container.innerHTML = `<div style="color: var(--danger); grid-column: 1/-1; text-align: center; font-size: 1.2rem; font-weight: bold;">${keywordsToShow.length} Keywords Missing from your Resume</div>`;
        }
    }

    const suggestionsCards = document.querySelectorAll('.suggestions-card');
    if (!forcePerfectScore) {
        // Hide all generation panels for basic analysis
        suggestionsCards.forEach(card => card.classList.add('hidden'));
    } else {
        suggestionsCards.forEach(card => card.classList.remove('hidden'));
        
        const improvementsList = document.getElementById('improvementsList');
        if (improvementsList && data.improvement_suggestions) {
            improvementsList.innerHTML = '';
            data.improvement_suggestions.forEach(imp => {
                const li = document.createElement('li');
                li.textContent = imp;
                improvementsList.appendChild(li);
            });
        }

        document.getElementById('summaryPanel').textContent = data.summary || "";
        document.getElementById('skillsPanel').textContent = data.skills_section || "";
        
        if (data.experience_section) {
            document.getElementById('experienceCard').classList.remove('hidden');
            document.getElementById('experiencePanel').textContent = data.experience_section;
        } else {
            document.getElementById('experienceCard').classList.add('hidden');
        }

        if (data.full_rewritten_resume) {
            document.getElementById('fullResumeCard').classList.remove('hidden');
            document.getElementById('fullResumePanel').textContent = data.full_rewritten_resume;
        } else {
            document.getElementById('fullResumeCard').classList.add('hidden');
        }
    }
    

    currentAnalysisData = data;
    document.getElementById('downloadWordBtn').classList.remove('hidden');
    document.getElementById('downloadPdfBtn').classList.remove('hidden');
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

async function downloadDocument(format) {
    if (!currentAnalysisData) return;
    
    const btnId = format === 'pdf' ? 'downloadPdfBtn' : 'downloadWordBtn';
    const btn = document.getElementById(btnId);
    const originalText = btn.querySelector('span').textContent;
    btn.disabled = true;
    btn.querySelector('span').textContent = "Generating...";

    try {
        const response = await fetch(`${API_BASE}/download-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_rewritten_resume: currentAnalysisData.full_rewritten_resume || "Error generating document.",
                format: format
            })
        });
        
        if (!response.ok) throw new Error("Download failed");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATS_Optimized_Resume.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        alert("Failed to download resume: " + e.message);
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = originalText;
    }
}

document.getElementById('downloadWordBtn').addEventListener('click', () => downloadDocument('docx'));
document.getElementById('downloadPdfBtn').addEventListener('click', () => downloadDocument('pdf'));
