"""
Content Management Models for Educational Articles
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ContentCategory(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None  # Emoji or icon name
    color: Optional[str] = None  # Hex color for UI
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ContentTag(BaseModel):
    id: str
    name: str
    slug: str

class Article(BaseModel):
    id: str
    title: str
    slug: str
    excerpt: str
    content: str  # Markdown or HTML content
    featured_image: Optional[str] = None
    category_id: str
    category: Optional[ContentCategory] = None
    tags: List[str] = []  # Tag IDs
    author_id: str
    author_name: Optional[str] = None
    
    # SEO & Metadata
    meta_description: Optional[str] = None
    reading_time: int = 5  # minutes
    
    # Problem-Solution Framework
    problem_statement: str
    impact_analysis: str
    solution_description: str
    roi_benefits: str
    success_metrics: str
    
    # Engagement
    view_count: int = 0
    share_count: int = 0
    lead_count: int = 0
    
    # CTA
    cta_text: str = "Start Free Trial"
    cta_link: str = "/register"
    
    # Publishing
    status: str = "draft"  # draft, published, archived
    published_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Tenant
    tenant_id: Optional[str] = None

class ArticleCreateRequest(BaseModel):
    title: str
    excerpt: str
    content: str
    featured_image: Optional[str] = None
    category_id: str
    tags: List[str] = []
    problem_statement: str
    impact_analysis: str
    solution_description: str
    roi_benefits: str
    success_metrics: str
    cta_text: str = "Start Free Trial"
    cta_link: str = "/register"
    status: str = "draft"
    reading_time: int = 5

class ArticleUpdateRequest(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    problem_statement: Optional[str] = None
    impact_analysis: Optional[str] = None
    solution_description: Optional[str] = None
    roi_benefits: Optional[str] = None
    success_metrics: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    status: Optional[str] = None
    reading_time: Optional[int] = None

class ContentView(BaseModel):
    id: str
    article_id: str
    viewer_ip: Optional[str] = None
    viewer_id: Optional[str] = None  # If logged in user
    referrer: Optional[str] = None
    user_agent: Optional[str] = None
    viewed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ContentShare(BaseModel):
    id: str
    article_id: str
    platform: str  # whatsapp, facebook, linkedin, email, sms, twitter
    sharer_id: Optional[str] = None
    sharer_ip: Optional[str] = None
    shared_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ContentLead(BaseModel):
    id: str
    article_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None
    source: str = "content"  # How they found us
    ip_address: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    tenant_id: Optional[str] = None

class TrackViewRequest(BaseModel):
    article_id: str
    referrer: Optional[str] = None

class TrackShareRequest(BaseModel):
    article_id: str
    platform: str

class CaptureLeadRequest(BaseModel):
    article_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None
