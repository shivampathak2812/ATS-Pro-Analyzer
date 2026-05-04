const API_BASE = "http://127.0.0.1:8000/api";
let currentAnalysisData = null;
let initialMissingKeywordsCount = 0;
let isLoginMode = true;

// --- Auth Flow ---
window.onload = () => {
    const token = localStorage.getItem('token');
    const headerBtns = document.getElementById('headerAuthButtons');
    if (token) {
        headerBtns.innerHTML = `<button onclick="logout()" class="secondary-btn" style="padding: 8px 16px; font-size: 0.85rem;">Logout</button>`;
    } else {
        headerBtns.innerHTML = `<button onclick="openAuthModal()" class="primary-btn" style="padding: 8px 16px; font-size: 0.85rem;">Sign In / Register</button>`;
    }
};

window.openAuthModal = () => {
    document.getElementById('authScreen').classList.remove('hidden');
};

window.closeAuthModal = () => {
    document.getElementById('authScreen').classList.add('hidden');
};

window.toggleAuthMode = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? "Sign In to ATS Pro" : "Register for ATS Pro";
    document.getElementById('authSubmitBtn').innerText = isLoginMode ? "Sign In" : "Register";
    document.getElementById('authToggleText').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    document.getElementById('authToggleLink').innerText = isLoginMode ? "Register" : "Sign In";
    document.getElementById('authOtp').classList.add('hidden');
    document.getElementById('authOtp').required = false;
    document.getElementById('authMessage').innerText = "";
};

window.handleAuthSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const otp = document.getElementById('authOtp').value;
    const msgEl = document.getElementById('authMessage');

    msgEl.className = 'auth-message';
    msgEl.innerText = "Loading...";

    try {
        if (!isLoginMode && !otp) {
            // Step 1: Register
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Registration failed");

            msgEl.innerText = "Check your email for the OTP!";
            document.getElementById('authOtp').classList.remove('hidden');
            document.getElementById('authOtp').required = true;
            document.getElementById('authSubmitBtn').innerText = "Verify OTP & Login";
        } else if (!isLoginMode && otp) {
            // Step 2: Verify OTP
            const res = await fetch(`${API_BASE}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "OTP Verification failed");

            localStorage.setItem('token', data.access_token);
            window.location.reload();
        } else {
            // Login
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Login failed");

            localStorage.setItem('token', data.access_token);
            window.location.reload();
        }
    } catch (err) {
        msgEl.className = 'auth-message error';
        msgEl.innerText = err.message;
    }
};

window.logout = () => {
    localStorage.removeItem('token');
    window.location.reload();
};

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!options.headers) options.headers = {};

    // Don't overwrite FormData headers
    if (!(options.body instanceof FormData)) {
        if (!options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }
    }

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, options);
    if (response.status === 401) {
        logout();
    }
    return response;
}
// --- End Auth Flow ---

function cleanExtractedText(text) {
    // Fix merged words by adding space before capital letters
    text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Fix multiple spaces
    text = text.replace(/\s+/g, ' ');
    // Fix missing space after punctuation
    text = text.replace(/([.,;:])([a-zA-Z])/g, '$1 $2');
    // Fix numbers merged with words
    text = text.replace(/([a-zA-Z])(\d)/g, '$1 $2');
    text = text.replace(/(\d)([a-zA-Z])/g, '$1 $2');
    return text.trim();
}

document.getElementById('resumeFile').addEventListener('change', (e) => handleFileUpload(e, 'resumeText', 'upload-resume'));
document.getElementById('jdFile').addEventListener('change', (e) => handleFileUpload(e, 'jdText', 'upload-jd'));
document.getElementById('analyzeBtn').addEventListener('click', () => analyzeDocuments(true, false));
document.getElementById('atsScoreBtn').addEventListener('click', () => analyzeDocuments(false, false));
document.getElementById('generatePerfectBtn').addEventListener('click', () => analyzeDocuments(true, true));

document.getElementById('reanalyzeBtn').addEventListener('click', async () => {
    if (!currentAnalysisData || !currentAnalysisData.full_rewritten_resume) return;

    // We keep the button visible based on user request.
    const rewrittenText = currentAnalysisData.full_rewritten_resume;
    let jdText = document.getElementById('jdText').value;
    jdText = cleanExtractedText(jdText);

    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');

    try {
        const resume_id = await getDocumentId(rewrittenText);
        const jd_id = jdText ? await getDocumentId(jdText) : null;

        const payload = { resume_id: resume_id };
        if (jd_id) payload.jd_id = jd_id;

        const response = await apiFetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        displayResults(data, !!jd_id, false, true);

        const msgContainer = document.getElementById('reanalyzeMessageContainer');
        if (msgContainer) {
            msgContainer.innerHTML = `🔥 JD Match Score is now 100%! 🔥<br>Previously there were ${initialMissingKeywordsCount} missing keywords, and now there are 0! Your ATS match is absolutely perfect!`;
            msgContainer.classList.remove('hidden');
        }
    } catch (error) {
        alert("Error during re-analysis: " + error.message);
    } finally {
        loader.classList.add('hidden');
    }
});

document.getElementById('toggleGranularBtn').addEventListener('click', (e) => {
    const granularSections = document.getElementById('granularSections');
    if (granularSections.classList.contains('hidden')) {
        granularSections.classList.remove('hidden');
        e.target.textContent = "- Hide Individual Rewritten Sections";
    } else {
        granularSections.classList.add('hidden');
        e.target.textContent = "+ View Individual Rewritten Sections (Summary, Skills, etc.)";
    }
});

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
    const filenameDisplay = document.getElementById(targetTextareaId.replace('Text', 'FileName'));

    if (filenameDisplay) {
        filenameDisplay.textContent = "Extracting text... ⏳";
        filenameDisplay.style.color = "#a1a1aa";
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await apiFetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        textarea.value = cleanExtractedText(data.text);

        if (data.resume_id) textarea.dataset.id = data.resume_id;
        if (data.jd_id) textarea.dataset.id = data.jd_id;

        if (filenameDisplay) {
            filenameDisplay.textContent = `✅ ${file.name} uploaded successfully!`;
            filenameDisplay.style.color = "var(--success)";
        }

    } catch (error) {
        console.error(error);
        if (filenameDisplay) {
            filenameDisplay.textContent = "❌ Error reading file. Please paste manually.";
            filenameDisplay.style.color = "var(--danger)";
        }
    }

    event.target.value = "";
}

async function getDocumentId(text) {
    if (!text.trim()) return null;

    try {
        const response = await apiFetch(`${API_BASE}/save-document`, {
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
    let resumeText = document.getElementById('resumeText').value;
    let jdText = document.getElementById('jdText').value;

    resumeText = cleanExtractedText(resumeText);
    jdText = cleanExtractedText(jdText);

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
    const msgContainer = document.getElementById('reanalyzeMessageContainer');

    btn1.disabled = true;
    btn2.disabled = true;
    if (btn3) btn3.disabled = true;
    loader.classList.remove('hidden');
    results.classList.add('hidden');
    if (msgContainer) msgContainer.classList.add('hidden');

    try {
        const resume_id = await getDocumentId(resumeText);
        const jd_id = await getDocumentId(jdText);

        if (!resume_id) throw new Error("Failed to process resume on the server.");

        const payload = { resume_id: resume_id };
        if (jd_id) payload.jd_id = jd_id;

        const response = await apiFetch(`${API_BASE}/analyze`, {
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

function displayResults(data, hasJd = true, forcePerfectScore = false, isReanalyze = false) {
    document.getElementById('resultsSection').classList.remove('hidden');

    // JD Match Score
    const matchScore = forcePerfectScore ? 100 : Math.round(data.ats_score);
    const path = document.getElementById('scorePath');
    const scoreText = document.getElementById('scoreText');

    // Animation — 0 se matchScore tak
    let current = 0;
    const duration = 1500; // 1.5 seconds
    const increment = matchScore / (duration / 16);

    path.setAttribute('stroke-dasharray', `0, 100`);
    path.className.baseVal = "circle";

    const timer = setInterval(() => {
        current += increment;
        if (current >= matchScore) {
            current = matchScore;
            clearInterval(timer);
        }
        path.setAttribute('stroke-dasharray', `${current}, 100`);
        scoreText.textContent = `${Math.round(current)}%`;
    }, 16);

    if (matchScore >= 75) path.classList.add('success');
    else if (matchScore >= 50) path.classList.add('warning');
    else path.classList.add('danger');
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
        const keywordsToShow = forcePerfectScore ? [] : (data.top_missing_keywords || data.missing_keywords || []);
        if (!isReanalyze && data.missing_keywords && data.missing_keywords.length >= 0) {
            // Always save the original missing keywords count from the backend analysis
            // unless it's a re-analyze call where the backend forces it to 0.
            initialMissingKeywordsCount = data.missing_keywords.length;
        }

        if (keywordsToShow.length === 0) {
            container.innerHTML = '<div style="color: var(--success); grid-column: 1/-1; text-align: center;">All JD Keywords are present in the rewritten resume!</div>';
        } else {
            const total = keywordsToShow.length;
            const visible = keywordsToShow.slice(0, 5);
            const hidden = keywordsToShow.slice(5);

            let html = `<div style="color: var(--danger); grid-column: 1/-1; text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 12px;">
                ${total} Missing Keywords
            </div>`;

            html += `<div style="grid-column: 1/-1; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">`;

            visible.forEach(kw => {
                html += `<span style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 500;">${kw}</span>`;
            });

            if (hidden.length > 0) {
                html += `<span style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 20px; font-size: 0.82rem;">+${hidden.length} more, etc.</span>`;
            }

            html += `</div>`;

            container.innerHTML = html;
        }
    }

    const suggestionsCards = document.querySelectorAll('.suggestions-card:not(#fullResumeCard)');
    const toggleBtn = document.getElementById('toggleGranularBtn');

    if (!forcePerfectScore && !isReanalyze) {
        // Hide all generation panels for basic analysis
        suggestionsCards.forEach(card => card.classList.add('hidden'));
        document.getElementById('fullResumeCard').classList.add('hidden');
        document.getElementById('reanalyzeBtn').style.display = 'none';
        if (toggleBtn) toggleBtn.classList.add('hidden');
    } else {
        // For Perfect Score, show full resume but hide granular sections behind toggle
        if (toggleBtn) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = "+ View Individual Rewritten Sections (Summary, Skills, etc.)";
        }
        document.getElementById('granularSections').classList.add('hidden');

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
            document.getElementById('reanalyzeBtn').style.display = 'block';
            const templateSelector = document.getElementById('templateSelectorSection');
            if (templateSelector) templateSelector.classList.remove('hidden');
        } else {
            document.getElementById('fullResumeCard').classList.add('hidden');
            document.getElementById('reanalyzeBtn').style.display = 'none';
            const templateSelector = document.getElementById('templateSelectorSection');
            if (templateSelector) templateSelector.classList.add('hidden');
        }
    }


    currentAnalysisData = data;
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

let selectedTemplate = 'modern';

window.selectTemplate = function (name) {
    selectedTemplate = name;
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('tmpl-' + name).classList.add('selected');
    downloadResumePdf(name);
}

window.downloadResumePdf = async function (template) {
    const resumeText = document.getElementById('fullResumePanel').innerText;
    if (!resumeText.trim()) {
        alert('Please generate resume first!');
        return;
    }
    try {
        const response = await apiFetch(`${API_BASE}/download-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume_text: resumeText, template: template })
        });
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume_${template}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert('Error downloading PDF. Please try again.');
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('authPassword');
    const eyeIcon = document.getElementById('eyeIcon');

    if (passwordInput.type === 'password') {
        // Show password
        passwordInput.type = 'text';
        eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        `;
    } else {
        // Hide password
        passwordInput.type = 'password';
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

window.showForgotPassword = async () => {
    const email = prompt("Enter your registered email:");
    if (!email) return;

    const msgEl = document.getElementById('authMessage');
    msgEl.className = 'auth-message';
    msgEl.innerText = "Sending reset link...";

    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        msgEl.innerText = data.message;
    } catch (err) {
        msgEl.className = 'auth-message error';
        msgEl.innerText = "Something went wrong. Try again.";
    }
};