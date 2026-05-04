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
*   **User Authentication System**:
    *   📝 **Register** with email and password.
    *   ✅ **OTP Email Verification** — verify your account via a one-time password sent to your inbox.
    *   🔐 **Login** with secure JWT-based session management.
    *   🔑 **Forgot Password** — request a secure reset link via email.
    *   🔄 **Reset Password** — set a new password using the emailed reset link.
*   **Modern UI**: Beautiful, responsive, glassmorphism-inspired frontend with animated score visualizations.

## 🛠️ Tech Stack

*   **Backend**: Python, FastAPI, Uvicorn
*   **AI & NLP**: Groq API (LLaMA-3), Scikit-Learn (TF-IDF), Regex NLP
*   **Document Parsing**: `pdfplumber`, `python-docx`
*   **Document Generation**: `reportlab` (PDF), `python-docx` (Word)
*   **Auth**: JWT (JSON Web Tokens), Bcrypt Password Hashing, OTP Email Verification
*   **Database**: SQLite (`ats_pro.db`), SQLAlchemy ORM
*   **Frontend**: HTML5, Vanilla CSS, JavaScript (Fetch API)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ATS-Pro-Analyzer.git
cd ATS-Pro-Analyzer
```

### 2. Set up the Environment
Create a `.env` file in the root directory and add your keys:
```env
GROQ_API_KEY=your_api_key_here
SECRET_KEY=your_jwt_secret_here
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_email_app_password
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
│   │   └── endpoints.py              # API routing and document generation
│   ├── core/
│   │   └── config.py                 # Environment variables handling
│   ├── services/
│   │   ├── auth_service.py           # JWT token creation and verification
│   │   ├── email_service.py          # OTP and password reset email sending
│   │   ├── file_parser.py            # PDF and DOCX text extraction
│   │   ├── llm_service.py            # Groq AI Prompts and JSON handling
│   │   ├── resume_pdf_generator.py   # PDF resume generation
│   │   └── scoring_engine.py         # TF-IDF & Keyword Hybrid Scoring
│   ├── database.py                   # DB session and engine setup
│   ├── main.py                       # FastAPI application setup
│   └── models.py                     # SQLAlchemy User and Document models
├── frontend/
│   ├── index.html                    # Main UI
│   ├── reset-password.html           # Password reset page
│   ├── script.js                     # API integration and DOM manipulation
│   └── style.css                     # Glassmorphism styling
├── .env                              # API Keys (Not tracked by Git)
├── .gitignore                        # Git ignore rules
├── ats_pro.db                        # SQLite database
├── pyproject.toml                    # Project dependencies (uv)
├── uv.lock                           # Locked dependency versions
├── requirements.txt                  # Python dependencies
└── README.md                         # Project documentation
```

## 🔐 Auth API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register with email & password |
| POST | `/auth/verify-otp` | Verify account via OTP email |
| POST | `/auth/login` | Login and receive JWT token |
| POST | `/auth/forgot-password` | Request password reset link via email |
| POST | `/auth/reset-password` | Reset password using token from email |

## 📝 License
This project is open-source and available under the MIT License.