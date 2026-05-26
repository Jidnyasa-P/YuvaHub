import re
import hashlib

def clean_text(text: str) -> str:
    """Removes HTML tags, extra whitespace, and control characters."""
    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Replace multiple spaces with a single space
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()

def generate_fingerprint(title: str, organization: str, category: str) -> str:
    """
    Generates a unique deterministic hash for an opportunity.
    Prevents cross-platform duplicates (e.g., same internship on LinkedIn and Internshala).
    """
    safe_title = re.sub(r'[^a-z0-9]', '', str(title).lower())
    safe_org = re.sub(r'[^a-z0-9]', '', str(organization).lower())
    safe_cat = str(category).lower()
    
    unique_string = f"{safe_cat}:{safe_org}:{safe_title}"
    return hashlib.sha256(unique_string.encode('utf-8')).hexdigest()
