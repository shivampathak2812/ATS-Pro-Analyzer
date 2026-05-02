# ATS Pro Analyzer 🚀

An AI-powered, full-stack Applicant Tracking System (ATS) Resume Analyzer and Optimizer. This application evaluates a candidate's resume against a Job Description (JD) using a hybrid scoring engine (NLP + Embeddings) and leverages LLMs to rewrite and optimize the resume for maximum ATS compatibility.

## 🌟 Key Features

*   **Hybrid Scoring Engine**: Uses deterministic math rather than AI hallucination to calculate your score:
    *   **Keyword Match**: Uses pure Python and Regex to extract and compare core keywords (0% memory overhead).
    *   **Semantic Similarity**: Uses `scikit-learn`'s `TfidfVectorizer` to calculate cosine similarity between the resume and JD.
    *   **Experience Relevance**: Heuristic extraction of years of experience to ensure domain match.
*   **AI-Powered Optimization**: Uses Groq's blazing-fast LLaMA-3 API to:
    *   Identify missing keywords.
    *   Provide an actionable improvement plan.
    *   **Completely rewrite** your professional summary, skills, and experience sections into ATS-friendly formats.
*   **Multi-Role Targeting**: Can optimize resumes for multiple target roles (e.g., Python Developer, ML Engineer, Data Analyst) even *without* a specific job description.
*   **Document Generation**: Instantly download your newly optimized, ATS-friendly resume as a **PDF** or **Word Document (DOCX)**.
*   **Modern UI**: Beautiful, responsive, glassmorphism-inspired frontend with animated score visualizations.

## 🛠️ Tech Stack

*   **Backend**: Python, FastAPI, Uvicorn
*   **AI & NLP**: Groq API (LLaMA-3), Scikit-Learn (TF-IDF), Regex NLP
*   **Document Parsing**: `pdfplumber`, `python-docx`
*   **Document Generation**: `reportlab` (PDF), `python-docx` (Word)
*   **Frontend**: HTML5, Vanilla CSS, JavaScript (Fetch API)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ATS-Pro-Analyzer.git
cd ATS-Pro-Analyzer
```

### 2. Set up the Environment
Create a `.env` file in the root directory and add your Groq API key:
```env
GROQ_API_KEY=your_api_key_here
```

### 3. Install Dependencies
Using `uv` (recommended) or `pip`:
```bash
uv pip install -r requirements.txt
```

### 4. Run the Application
Start the FastAPI server:
```bash
uv run uvicorn app.main:app --reload
```
Open your browser and navigate to `http://127.0.0.1:8000/`.

## 📂 Project Structure

```
ATS-Pro-Analyzer/
├── app/
│   ├── api/
│   │   └── endpoints.py      # API routing and document generation
│   ├── core/
│   │   └── config.py         # Environment variables handling
│   ├── services/
│   │   ├── file_parser.py    # PDF and DOCX text extraction
│   │   ├── scoring_engine.py # TF-IDF & Keyword Hybrid Scoring
│   │   └── llm_service.py    # Groq AI Prompts and JSON handling
│   └── main.py               # FastAPI application setup
├── frontend/
│   ├── index.html            # Main UI
│   ├── style.css             # Glassmorphism styling
│   └── script.js             # API integration and DOM manipulation
├── .env                      # API Keys (Not tracked by Git)
├── requirements.txt          # Python dependencies
└── README.md                 # Project documentation
```

## 📝 License
This project is open-source and available under the MIT License.
