from typing import List, Optional
from pydantic import BaseModel, HttpUrl, Field
from beanie import Document
from datetime import datetime
from enum import Enum

class OpportunityType(str, Enum):
    INTERNSHIP = "internship"
    HACKATHON = "hackathon"
    SCHOLARSHIP = "scholarship"
    EVENT = "event"
    STARTUP_PROGRAM = "startup_program"
    INTERNATIONAL = "international"
    FELLOWSHIP = "fellowship"

class Mode(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    HYBRID = "hybrid"

class Opportunity(Document):
    title: str
    description: str
    organization: Optional[str] = None
    deadline: Optional[datetime] = None
    tags: List[str] = []
    category: OpportunityType
    eligibility: Optional[str] = None
    location: Optional[str] = None
    mode: Mode = Mode.ONLINE
    source_name: str
    apply_link: HttpUrl
    official_link: Optional[HttpUrl] = None
    difficulty_level: Optional[str] = None  # Beginner, Intermediate, Advanced
    stipend_or_prize: Optional[str] = None
    
    # Metadata for ingestion and matching
    fingerprint: str = Field(unique=True, description="Hash of title, org, and type to prevent duplicates")
    status: str = "open" # open, closed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    views: int = 0
    saves: int = 0

    class Settings:
        name = "opportunities"
        indexes = [
            "category",
            "tags",
            "deadline",
            "status",
            [("title", "text"), ("description", "text"), ("organization", "text")],
            "fingerprint"
        ]

class UserProfile(Document):
    user_id: str = Field(unique=True)
    name: str
    email: str
    class_year: Optional[int] = None
    interests: List[str] = []
    location: Optional[str] = None
    goals: List[str] = [] # e.g., "Learn AI", "Win Hackathons"
    
    saved_opportunities: List[str] = [] # List of Opportunity ObjectIds

    class Settings:
        name = "users"

class SourceTracker(Document):
    source_name: str
    category: OpportunityType
    last_run: datetime
    status: str # "success", "failed"
    items_scraped: int
    error_log: Optional[str] = None

    class Settings:
        name = "sources_tracker"
