from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str  # URL-friendly version of title
    content: str  # Full article content in markdown
    excerpt: str  # Short summary (150-200 chars)
    category: str  # 'saas', 'tenant', 'project'
    sub_category: str  # e.g., 'problem-solution', 'features', 'insights'
    keywords: List[str] = []  # SEO keywords
    meta_description: str  # SEO meta description
    author: str = "ExlainERP Team"
    reading_time: int = 5  # Minutes
    featured_image: Optional[str] = None
    tags: List[str] = []
    status: str = "published"  # draft, published, archived
    views: int = 0
    likes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
    published_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ArticleCreate(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: str
    category: str
    sub_category: str
    keywords: List[str] = []
    meta_description: str
    author: str = "ExlainERP Team"
    reading_time: int = 5
    featured_image: Optional[str] = None
    tags: List[str] = []
    status: str = "published"

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    keywords: Optional[List[str]] = None
    meta_description: Optional[str] = None
    author: Optional[str] = None
    reading_time: Optional[int] = None
    featured_image: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class AIArticleRequest(BaseModel):
    topic: str
    category: str  # 'saas', 'tenant', 'project'
    sub_category: str
    keywords: List[str] = []
    target_word_count: int = 1500

class BulkArticleGenerationRequest(BaseModel):
    category: str  # 'saas', 'tenant', 'project'
    count: int = 50  # Number of articles to generate
    start_index: int = 1  # Which article to start from in content strategy
