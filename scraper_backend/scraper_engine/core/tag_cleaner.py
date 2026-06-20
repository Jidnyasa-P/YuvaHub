import os
import sys
import json
import urllib.request
import logging
import time

logger = logging.getLogger(__name__)

# Global state to prevent 429 errors from bursting Gemini API (15 RPM limit on free tier)
_last_request_time = 0.0
_cooldown_period = 4.2  # 4 seconds ~ 14.3 RPM
_rate_limit_until = 0.0

def clean_tags_with_ai(title: str, raw_tags: list) -> list:
    """
    Uses the modern Gemini 3.5 Flash model (server-side REST API, zero external dependencies)
    to normalize, standardize, and prune raw/scraped tags into structured tech loadout tags.
    Now equipped with cooldown mechanism to prevent 429 Too Many Requests errors.
    """
    global _last_request_time, _rate_limit_until
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.debug("No GEMINI_API_KEY set. Skipping AI-assisted tag cleanup.")
        fallback = [t for t in raw_tags if len(t) > 1 and len(t) < 20]
        return fallback[:4] if fallback else ["Opportunity"]

    current_time = time.time()
    if current_time < _rate_limit_until or (current_time - _last_request_time) < _cooldown_period:
        # Cooldown active, fallback gracefully without logging an error
        fallback = [t for t in raw_tags if len(t) > 1 and len(t) < 20]
        return fallback[:4] if fallback else ["Opportunity"]

    _last_request_time = time.time()

    # Limit payload
    tags_str = ", ".join(raw_tags[:6])
    prompt = (
        f"You are a professional tag cleanup AI system for YuvaHub, a discovery portal.\n"
        f"Analyze this opportunity: '{title}' and its raw tags: [{tags_str}].\n"
        f"Generate exactly 2 to 4 clean, concise, industry-recognized technical and category tags "
        f"(e.g., 'React', 'Python', 'Web3', 'Blockchain', 'Scholarship', 'Internship', 'Machine Learning', 'Open Source').\n"
        f"Always use title-case. Respond with a valid, clean JSON string array only, nothing else. Example: [\"React\", \"Scholarship\"]."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "aistudio-build"  # Required telemetry header
    }
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            tags = json.loads(text)
            if isinstance(tags, list):
                # Clean and normalize strings
                cleaned = [str(t).strip() for t in tags if t]
                return cleaned[:4]
    except (urllib.error.HTTPError, Exception) as error:
        is_503 = getattr(error, 'code', None) == 503
        is_429 = getattr(error, 'code', None) == 429
        is_timeout = "timed out" in str(error).lower() or "timeout" in str(error).lower()
        if is_503 or is_timeout or is_429:
            logger.info(f"Gemini 3.5-flash error (503/429/timeout), retrying with gemini-3.1-flash-lite...")
            url_lite = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
            try:
                req_lite = urllib.request.Request(url_lite, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
                with urllib.request.urlopen(req_lite, timeout=8) as response_lite:
                    res_data = json.loads(response_lite.read().decode("utf-8"))
                    text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    tags = json.loads(text)
                    if isinstance(tags, list):
                        cleaned = [str(t).strip() for t in tags if t]
                        return cleaned[:4]
            except Exception as lite_ex:
                logger.warning(f"AI Tag Cleanup exception (lite): {lite_ex}. Falling back to standard normalizer.")
        elif getattr(error, 'code', None) == 429:
            # Hit rate limit despite cooldown, backoff for 30 seconds
            _rate_limit_until = time.time() + 30.0
        else:
            logger.warning(f"AI Tag Cleanup exception: {error}. Falling back to standard normalizer.")
        
    # Return standard clean list fallback
    fallback = [t for t in raw_tags if len(t) > 1 and len(t) < 20]
    return fallback[:4] if fallback else ["Opportunity"]
