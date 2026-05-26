from typing import List

# Centralized Taxonomy Mapping
TAG_MAPPINGS = {
    # AI & ML
    "machine learning": "AI/ML",
    "ml": "AI/ML",
    "artificial intelligence": "AI/ML",
    "ai": "AI/ML",
    "deep learning": "AI/ML",
    "nlp": "AI/ML",
    
    # Frontend
    "react": "Frontend",
    "reactjs": "Frontend",
    "vue": "Frontend",
    "html css": "Frontend",
    "web development": "Web Dev",
    
    # Backend
    "node.js": "Backend",
    "nodejs": "Backend",
    "python": "Backend",
    "django": "Backend",
    "express": "Backend",
}

def normalize_tags(raw_tags: List[str]) -> List[str]:
    """
    Maps raw source tags to standard Yuvahub taxonomy.
    """
    normalized = set()
    for tag in raw_tags:
        lower_tag = tag.lower().strip()
        
        if lower_tag in TAG_MAPPINGS:
            normalized.add(TAG_MAPPINGS[lower_tag])
        else:
            # Title case if unknown to keep it neat
            normalized.add(tag.title())
            
    return list(normalized)
