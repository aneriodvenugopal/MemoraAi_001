"""
Content Management System API Routes
"""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime
import uuid
from models.content import (
    Article, ArticleCreateRequest, ArticleUpdateRequest,
    ContentCategory, ContentView, ContentShare, ContentLead,
    TrackViewRequest, TrackShareRequest, CaptureLeadRequest
)
from middleware.auth import get_current_user

router = APIRouter(prefix="/content", tags=["content"])

# ==================== ADMIN CMS ROUTES (Protected) ====================

@router.post("/admin/articles", response_model=Article)
async def create_article(request: Request, article_data: ArticleCreateRequest):
    """
    Create a new article (Admin only)
    """
    try:
        # Get current user (authentication)
        current_user = await get_current_user(request)
        
        db = request.app.state.db
        
        # Generate slug from title
        slug = article_data.title.lower().replace(" ", "-").replace("'", "")
        
        # Create article
        article = {
            "id": str(uuid.uuid4()),
            "title": article_data.title,
            "slug": slug,
            "excerpt": article_data.excerpt,
            "content": article_data.content,
            "featured_image": article_data.featured_image,
            "category_id": article_data.category_id,
            "tags": article_data.tags,
            "author_id": current_user["user_id"],
            "author_name": current_user.get("name", "Admin"),
            "problem_statement": article_data.problem_statement,
            "impact_analysis": article_data.impact_analysis,
            "solution_description": article_data.solution_description,
            "roi_benefits": article_data.roi_benefits,
            "success_metrics": article_data.success_metrics,
            "reading_time": article_data.reading_time,
            "cta_text": article_data.cta_text,
            "cta_link": article_data.cta_link,
            "status": article_data.status,
            "view_count": 0,
            "share_count": 0,
            "lead_count": 0,
            "published_at": datetime.utcnow().isoformat() if article_data.status == "published" else None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "tenant_id": current_user.get("tenant_id")
        }
        
        await db.articles.insert_one(article)
        
        return Article(**article)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/articles", response_model=List[Article])
async def get_admin_articles(request: Request, status: Optional[str] = None):
    """
    Get all articles for admin (including drafts)
    """
    try:
        current_user = await get_current_user(request)
        db = request.app.state.db
        
        query = {}
        if status:
            query["status"] = status
        
        articles = await db.articles.find(query).sort("created_at", -1).to_list(length=None)
        
        return [Article(**article) for article in articles]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/articles/{article_id}", response_model=Article)
async def get_admin_article(request: Request, article_id: str):
    """
    Get single article for editing (Admin)
    """
    try:
        current_user = await get_current_user(request)
        db = request.app.state.db
        
        article = await db.articles.find_one({"id": article_id})
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return Article(**article)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/articles/{article_id}", response_model=Article)
async def update_article(request: Request, article_id: str, article_data: ArticleUpdateRequest):
    """
    Update an article (Admin only)
    """
    try:
        current_user = await get_current_user(request)
        db = request.app.state.db
        
        # Find existing article
        article = await db.articles.find_one({"id": article_id})
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Prepare update data
        update_data = {k: v for k, v in article_data.dict(exclude_unset=True).items() if v is not None}
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Update slug if title changed
        if "title" in update_data:
            update_data["slug"] = update_data["title"].lower().replace(" ", "-").replace("'", "")
        
        # Set published_at if status changed to published
        if update_data.get("status") == "published" and article["status"] != "published":
            update_data["published_at"] = datetime.utcnow().isoformat()
        
        # Update article
        await db.articles.update_one(
            {"id": article_id},
            {"$set": update_data}
        )
        
        # Get updated article
        updated_article = await db.articles.find_one({"id": article_id})
        
        return Article(**updated_article)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/articles/{article_id}")
async def delete_article(request: Request, article_id: str):
    """
    Delete an article (Admin only)
    """
    try:
        current_user = await get_current_user(request)
        db = request.app.state.db
        
        result = await db.articles.delete_one({"id": article_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return {"message": "Article deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PUBLIC CONTENT ROUTES ====================

@router.get("/articles", response_model=List[Article])
async def get_published_articles(
    request: Request,
    category_id: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 20
):
    """
    Get published articles (Public)
    """
    try:
        db = request.app.state.db
        
        query = {"status": "published"}
        
        if category_id:
            query["category_id"] = category_id
        
        if tag:
            query["tags"] = tag
        
        articles = await db.articles.find(query).sort("published_at", -1).limit(limit).to_list(length=limit)
        
        return [Article(**article) for article in articles]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/articles/{slug}", response_model=Article)
async def get_article_by_slug(request: Request, slug: str):
    """
    Get single published article by slug (Public)
    """
    try:
        db = request.app.state.db
        
        article = await db.articles.find_one({"slug": slug, "status": "published"})
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return Article(**article)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track-view")
async def track_article_view(request: Request, view_data: TrackViewRequest):
    """
    Track article view
    """
    try:
        db = request.app.state.db
        
        # Create view record
        view = {
            "id": str(uuid.uuid4()),
            "article_id": view_data.article_id,
            "viewer_ip": request.client.host if request.client else None,
            "referrer": view_data.referrer,
            "user_agent": request.headers.get("user-agent"),
            "viewed_at": datetime.utcnow().isoformat()
        }
        
        await db.content_views.insert_one(view)
        
        # Increment view count
        await db.articles.update_one(
            {"id": view_data.article_id},
            {"$inc": {"view_count": 1}}
        )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track-share")
async def track_article_share(request: Request, share_data: TrackShareRequest):
    """
    Track article share
    """
    try:
        db = request.app.state.db
        
        # Create share record
        share = {
            "id": str(uuid.uuid4()),
            "article_id": share_data.article_id,
            "platform": share_data.platform,
            "sharer_ip": request.client.host if request.client else None,
            "shared_at": datetime.utcnow().isoformat()
        }
        
        await db.content_shares.insert_one(share)
        
        # Increment share count
        await db.articles.update_one(
            {"id": share_data.article_id},
            {"$inc": {"share_count": 1}}
        )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/capture-lead")
async def capture_content_lead(request: Request, lead_data: CaptureLeadRequest):
    """
    Capture lead from content
    """
    try:
        db = request.app.state.db
        
        # Create lead record
        lead = {
            "id": str(uuid.uuid4()),
            "article_id": lead_data.article_id,
            "name": lead_data.name,
            "email": lead_data.email,
            "phone": lead_data.phone,
            "message": lead_data.message,
            "source": "content",
            "ip_address": request.client.host if request.client else None,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await db.content_leads.insert_one(lead)
        
        # Increment lead count
        await db.articles.update_one(
            {"id": lead_data.article_id},
            {"$inc": {"lead_count": 1}}
        )
        
        return {"success": True, "message": "We'll contact you soon!"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CATEGORIES ====================

@router.get("/categories", response_model=List[ContentCategory])
async def get_categories(request: Request):
    """
    Get all content categories
    """
    try:
        db = request.app.state.db
        
        categories = await db.content_categories.find().to_list(length=None)
        
        return [ContentCategory(**category) for category in categories]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/categories", response_model=ContentCategory)
async def create_category(request: Request, name: str, description: str, icon: str, color: str):
    """
    Create category (Admin only)
    """
    try:
        current_user = await get_current_user(request)
        db = request.app.state.db
        
        category = {
            "id": str(uuid.uuid4()),
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "description": description,
            "icon": icon,
            "color": color,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await db.content_categories.insert_one(category)
        
        return ContentCategory(**category)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
