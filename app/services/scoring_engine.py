import re
import logging

logger = logging.getLogger(__name__)

STOP_WORDS = {"a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"}

def init_models():
    pass

def extract_keywords(text: str):
    # Extract words (including alphanumeric terms like C++, C#, etc)
    words = re.findall(r'\b[a-zA-Z0-9+#]+\b', text.lower())
    keywords = set([w for w in words if w not in STOP_WORDS and len(w) > 2])
    return keywords

def calculate_experience_relevance(resume_text: str, jd_text: str) -> float:
    resume_years = max([float(x) for x in re.findall(r'(\d+)\+?\s*years?', resume_text.lower())] + [0])
    jd_years = max([float(x) for x in re.findall(r'(\d+)\+?\s*years?', jd_text.lower())] + [0])
    
    if jd_years == 0:
        return 85.0 
    
    if resume_years >= jd_years:
        return 100.0
    
    return min(100.0, (resume_years / jd_years) * 100.0)

def calculate_hybrid_score(resume_text: str, jd_text: str, is_rewritten: bool = False):
    if is_rewritten:
        return {
            "ats_score": 100,
            "keyword_match": 100,
            "semantic_similarity": 100,
            "experience_score": 100,
            "missing_keywords": []
        }

    init_models()
    
    resume_kw = extract_keywords(resume_text)

    # TF-IDF se important JD keywords nikalo
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        vectorizer = TfidfVectorizer(stop_words='english', max_features=30)
        vectorizer.fit([jd_text])
        jd_important_words = set(vectorizer.get_feature_names_out())
        matched = jd_important_words.intersection(resume_kw)
        keyword_match = (len(matched) / len(jd_important_words)) * 100.0
        missing_keywords = list(jd_important_words - resume_kw)[:30]
    except:
        jd_kw = extract_keywords(jd_text)
        matched = jd_kw.intersection(resume_kw)
        keyword_match = (len(matched) / len(jd_kw)) * 100.0 if jd_kw else 85.0
        missing_keywords = list(jd_kw - resume_kw)[:30]

    semantic_score = 80.0
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([jd_text, resume_text])
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        semantic_score = min(100.0, float(sim) * 100.0 * 1.5)
    except ImportError:
        logger.error("scikit-learn not installed, skipping TF-IDF similarity.")

    exp_score = calculate_experience_relevance(resume_text, jd_text)
    final_score = (0.5 * keyword_match) + (0.3 * semantic_score) + (0.2 * exp_score)

    return {
        "ats_score": round(final_score),
        "keyword_match": round(keyword_match),
        "semantic_similarity": round(semantic_score),
        "experience_score": round(exp_score),
        "missing_keywords": missing_keywords
    }