"""
Social networking models - Posts, Follows, and Privacy settings
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PrivacyLevel(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    CONNECTIONS_ONLY = "connections_only"


class PrivacySettings(BaseModel):
    """Privacy settings for doctor profile"""
    email: PrivacyLevel = PrivacyLevel.PRIVATE
    phone: PrivacyLevel = PrivacyLevel.PRIVATE
    hospital_address: PrivacyLevel = PrivacyLevel.PUBLIC
    registration_number: PrivacyLevel = PrivacyLevel.PUBLIC  # Always public for trust
    specialization: PrivacyLevel = PrivacyLevel.PUBLIC
    
    class Config:
        use_enum_values = True


class DoctorProfileExtended(BaseModel):
    """Extended profile fields for doctor"""
    bio: Optional[str] = Field(None, max_length=500)
    experience_years: Optional[int] = Field(None, ge=0, le=60)
    consultation_fee: Optional[str] = None
    languages: List[str] = []
    qualifications: List[str] = []
    achievements: List[str] = []
    profile_photo_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    
    # Social stats
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    
    # Profile completion
    profile_completion: int = 35  # Base completion after registration
    
    # Privacy
    privacy_settings: PrivacySettings = Field(default_factory=PrivacySettings)
    
    # Avatar options
    avatar_style: Optional[str] = None  # null = use photo or initials
    

class Post(BaseModel):
    """Medical post/article by doctor"""
    id: str
    author_id: str
    content: str = Field(..., min_length=1, max_length=5000)
    images: List[str] = []  # URLs to attached images
    tags: List[str] = []  # Medical tags like #Cardiology, #CaseStudy
    
    # Engagement
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    
    # Flags
    is_case_study: bool = False
    is_research: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PostCreate(BaseModel):
    """Create post request"""
    content: str = Field(..., min_length=1, max_length=5000)
    images: List[str] = []
    tags: List[str] = []
    is_case_study: bool = False
    is_research: bool = False


class PostResponse(BaseModel):
    """Post response with author info"""
    id: str
    author_id: str
    author_name: str
    author_photo: Optional[str]
    author_specialization: str
    author_verified: bool
    
    content: str
    images: List[str]
    tags: List[str]
    
    likes_count: int
    comments_count: int
    shares_count: int
    is_liked: bool = False  # Whether current user liked it
    
    is_case_study: bool
    is_research: bool
    
    created_at: datetime


class Follow(BaseModel):
    """Follow relationship between doctors"""
    id: str
    follower_id: str  # Doctor who follows
    following_id: str  # Doctor being followed
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FollowRequest(BaseModel):
    """Follow a doctor request"""
    doctor_id: str


class DoctorPublicProfile(BaseModel):
    """Public-facing doctor profile card"""
    id: str
    name: str
    specialization: str
    hospital: Optional[str]
    profile_photo_url: Optional[str]
    bio: Optional[str]
    experience_years: Optional[int]
    verification_status: str
    is_verified: bool
    
    # Stats
    followers_count: int
    following_count: int
    posts_count: int
    
    # Current user's relationship
    is_following: bool = False
    is_follower: bool = False
    
    # Privacy-controlled fields (only shown if public)
    email: Optional[str] = None
    phone: Optional[str] = None


class Comment(BaseModel):
    """Comment on a post"""
    id: str
    post_id: str
    author_id: str
    content: str = Field(..., min_length=1, max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CommentCreate(BaseModel):
    """Create comment request"""
    content: str = Field(..., min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    """Comment with author info"""
    id: str
    post_id: str
    author_id: str
    author_name: str
    author_photo: Optional[str]
    content: str
    created_at: datetime


class Like(BaseModel):
    """Like on a post"""
    id: str
    post_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Profile completion calculation
def calculate_profile_completion(doctor_data: dict) -> int:
    """Calculate profile completion percentage"""
    completion = 35  # Base after registration
    
    fields = {
        'bio': 10,
        'experience_years': 5,
        'consultation_fee': 5,
        'languages': 5,
        'qualifications': 10,
        'achievements': 5,
        'profile_photo_url': 15,
        'phone': 5,
        'hospital': 5,
    }
    
    for field, points in fields.items():
        value = doctor_data.get(field)
        if value:
            if isinstance(value, list) and len(value) > 0:
                completion += points
            elif isinstance(value, str) and len(value) > 0:
                completion += points
            elif isinstance(value, int):
                completion += points
    
    return min(completion, 100)
