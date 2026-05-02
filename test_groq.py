from app.core.config import settings
import httpx

models = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768']
headers = {'Authorization': f'Bearer {settings.GROQ_API_KEY}', 'Content-Type': 'application/json'}
payload = {
    'messages': [{'role': 'user', 'content': 'Respond in JSON. {"a": 1}'}],
    'response_format': {'type': 'json_object'}
}

for m in models:
    try:
        resp = httpx.post('https://api.groq.com/openai/v1/chat/completions', headers=headers, json={**payload, 'model': m})
        print(f"{m}: {resp.status_code} {resp.text[:50]}")
    except Exception as e:
        print(f"{m}: {e}")
