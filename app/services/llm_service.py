import json
import httpx
from fastapi import HTTPException
from app.core.config import settings
from app.services.scoring_engine import calculate_hybrid_score

async def analyze_resume_with_llm(resume_text: str, jd_text: str, is_rewritten: bool = False) -> dict:
    target_jd = jd_text if jd_text else "Python Developer Machine Learning Engineer Data Analyst. Required skills: Python, SQL, Data Analysis, APIs, Git, Machine Learning, Pandas, Scikit-learn, FastAPI. Experience building scalable models, databases, and APIs."
    
    scoring_result = calculate_hybrid_score(resume_text, target_jd, is_rewritten=is_rewritten)
    missing_keywords_str = ", ".join(scoring_result["missing_keywords"])
    ats_score = scoring_result.get("ats_score", 0)
    if ats_score >= 85:
        rewriting_instructions = """
CRITICAL INSTRUCTION FOR REWRITING (HIGH SCORE RESUME):
The candidate's original resume is ALREADY VERY GOOD. DO NOT completely rewrite the content.
Your ONLY tasks are:
1. Copy the original text as closely as possible, preserving the human tone, phrasing, and structure.
2. Fix any minor spelling or grammar mistakes.
3. INJECT EVERY SINGLE ONE of the 'POTENTIAL MISSING KEYWORDS' naturally into the skills section or existing bullet points. Do not skip any.
4. DO NOT use overly fancy, robotic AI jargon (e.g., spearheaded, orchestrated, synergistic, delve, unlocked). Maintain the candidate's authentic human wording. Do not add fake achievements.
"""
    else:
        rewriting_instructions = """
CRITICAL INSTRUCTION FOR REWRITING (OPTIMIZATION NEEDED):
The candidate's original resume needs ATS optimization. 
Your tasks are:
1. Improve bullet points by adding strong action verbs and structuring them better.
2. INJECT EVERY SINGLE ONE of the 'POTENTIAL MISSING KEYWORDS' into the `full_rewritten_resume`. Do not skip any. Place them naturally into the skills section, summary, or experience bullets. If you fail to include them, the candidate's ATS score will fail.
3. CRITICAL: Even when rewriting, use NATURAL HUMAN WORDING. DO NOT use overly robotic AI jargon (e.g., spearheaded, orchestrated, synergistic, delve, unleashed). Keep the tone professional, authentic, and simple, as if a real person wrote it.
"""

    if is_rewritten:
        rewrite_override = """
FINAL OVERRIDE INSTRUCTION: This resume has already been fully ATS-optimized.
You MUST return these exact values:
- "jd_match_score": 100
- "keyword_match": 100
- "semantic_match": 100
- "experience_match": 100
- "resume_ats_score": 100
- "missing_keywords": []
Do NOT list any missing keywords whatsoever.
"""
    else:
        rewrite_override = ""

    prompt = f"""You are an AI-powered Resume Optimization System. 
Resume:
{resume_text}

Target Role / JD:
{target_jd}

POTENTIAL MISSING KEYWORDS (Found by Algorithm):
{missing_keywords_str}

Use this context to evaluate the resume against the JD, and generate a fully rewritten ATS-optimized version. 
You must act as an expert ATS system. Calculate realistic match scores based on how well the Resume fits the JD.
If the resume already perfectly matches the JD (e.g. it was generated specifically for it), give it 100% scores and an empty missing_keywords list.

For the "missing_keywords" array in the JSON, you MUST filter the POTENTIAL MISSING KEYWORDS provided above. Only include real, hard technical skills from that list that are GENUINELY missing from the resume. Do NOT hallucinate keywords outside of this list. Ensure your final list is EXHAUSTIVE and completely stable across multiple runs.
{rewriting_instructions}

{rewrite_override}
Respond ONLY in valid JSON. Ensure you escape all newlines as \\n in strings:
{{
  "jd_match_score": 85,
  "keyword_match": 80,
  "semantic_match": 90,
  "experience_match": 100,
  "missing_keywords": ["ExampleSkill1", "ExampleSkill2"],
  "resume_ats_score": 85,
  "improvement_suggestions": [
    "Add SQL project experience",
    "Include measurable achievements"
  ],
  "summary": "3-sentence ATS-optimized summary.",
  "skills_section": "Clean, well-categorized skills section. YOU MUST INJECT ALL MISSING JD KEYWORDS HERE NATURALLY.",
  "experience_section": "Completely rewritten professional experience with quantified achievements. INJECT MISSING KEYWORDS INTO BULLET POINTS.",
  "full_rewritten_resume": "The ENTIRE resume from top to bottom. YOU MUST MIMIC THE EXACT STRUCTURE OF THE UPLOADED RESUME. Do not delete ANY original sections (like Projects, Education, Certifications). Just improve the text and inject ALL missing keywords into them. USE EXACTLY THE SAME HEADERS AS THE ORIGINAL.\\nFor EVERY section use `# ` (e.g. `# SKILLS`). Use `- ` for bullets."
}}
"""

    import asyncio
    async with httpx.AsyncClient() as client:
        for attempt in range(5):
            try:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 2300,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=45.0
                )
                
                if response.status_code == 429 and attempt < 4:
                    import re
                    match = re.search(r"try again in ([\d\.]+)s", response.text)
                    wait_time = float(match.group(1)) + 1.0 if match else 8.0
                    await asyncio.sleep(wait_time)
                    continue
                    
                if response.status_code != 200:
                    error_detail = response.text
                    raise HTTPException(status_code=response.status_code, detail=f"Groq API Error: {error_detail}")
                    
                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                content = content.replace("```json", "").replace("```", "").strip()
                
                llm_result = json.loads(content)
                
                return {
                    "ats_score": llm_result.get("jd_match_score", 80),
                    "keyword_match": llm_result.get("keyword_match", 80),
                    "semantic_similarity": llm_result.get("semantic_match", 80),
                    "experience_score": llm_result.get("experience_match", 80),
                    "missing_keywords": llm_result.get("missing_keywords", []),
                    "resume_ats_score": llm_result.get("resume_ats_score", 80),
                    "improvement_suggestions": llm_result.get("improvement_suggestions", []),
                    "summary": llm_result.get("summary", ""),
                    "skills_section": llm_result.get("skills_section", ""),
                    "experience_section": llm_result.get("experience_section", ""),
                    "full_rewritten_resume": llm_result.get("full_rewritten_resume", "")
                }
            except Exception as e:
                if attempt == 4:
                    raise HTTPException(status_code=500, detail=str(e))
                await asyncio.sleep(2)
