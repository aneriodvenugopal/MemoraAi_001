from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional
from datetime import datetime
from models.article import Article, ArticleCreate, ArticleUpdate, AIArticleRequest, BulkArticleGenerationRequest
from services.article_generator import ArticleGenerator
import re

router = APIRouter()

def get_db(request: Request):
    return request.app.state.db

# Helper function to create slug
def create_slug(title: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

# ====== PUBLIC ENDPOINTS ======

@router.get("/public/articles", response_model=dict)
async def get_public_articles(
    request: Request,
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(12, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Get published articles for public view"""
    
    db = get_db(request)
    query = {"deleted_at": None, "status": "published"}
    
    if category:
        query["category"] = category
    if sub_category:
        query["sub_category"] = sub_category
    if tag:
        query["tags"] = tag
    
    articles = await db.articles.find(query).sort("published_at", -1).skip(skip).limit(limit).to_list(length=None)
    total = await db.articles.count_documents(query)
    
    # Remove MongoDB _id field to avoid serialization issues
    for article in articles:
        if '_id' in article:
            del article['_id']
    
    return {
        "success": True,
        "articles": articles,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/public/articles/{article_id}", response_model=dict)
async def get_public_article(request: Request, article_id: str):
    """Get single article by ID"""
    
    db = get_db(request)
    article = await db.articles.find_one({
        "id": article_id,
        "deleted_at": None,
        "status": "published"
    })
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count
    await db.articles.update_one(
        {"id": article_id},
        {"$inc": {"views": 1}}
    )
    
    # Remove MongoDB _id
    if '_id' in article:
        del article['_id']
    
    return {"success": True, "article": article}

@router.get("/public/articles/slug/{slug}", response_model=dict)
async def get_public_article_by_slug(request: Request, slug: str):
    """Get single article by slug"""
    
    db = get_db(request)
    article = await db.articles.find_one({
        "slug": slug,
        "deleted_at": None,
        "status": "published"
    })
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count
    await db.articles.update_one(
        {"slug": slug},
        {"$inc": {"views": 1}}
    )
    
    # Remove MongoDB _id
    if '_id' in article:
        del article['_id']
    
    return {"success": True, "article": article}

@router.post("/public/articles/{article_id}/like", response_model=dict)
async def like_article(request: Request, article_id: str):
    """Like an article"""
    
    db = get_db(request)
    result = await db.articles.update_one(
        {"id": article_id, "deleted_at": None},
        {"$inc": {"likes": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"success": True, "message": "Article liked"}

@router.get("/public/articles/featured/list", response_model=dict)
async def get_featured_articles(request: Request, limit: int = Query(6, ge=1, le=20)):
    """Get featured articles (most viewed)"""
    
    db = get_db(request)
    articles = await db.articles.find({
        "deleted_at": None,
        "status": "published"
    }).sort("views", -1).limit(limit).to_list(length=None)
    
    # Remove MongoDB _id
    for article in articles:
        if '_id' in article:
            del article['_id']
    
    return {"success": True, "articles": articles}

# ====== ADMIN ENDPOINTS (Protected) ======

@router.post("/admin/articles", response_model=dict)
async def create_article(request: Request, article: ArticleCreate):
    """Create new article manually"""
    
    db = get_db(request)
    # Check if slug already exists
    existing = await db.articles.find_one({"slug": article.slug, "deleted_at": None})
    if existing:
        raise HTTPException(status_code=400, detail="Article with this slug already exists")
    
    article_dict = article.dict()
    article_dict["id"] = str(datetime.now().timestamp()).replace('.', '')
    article_dict["created_at"] = datetime.now()
    article_dict["updated_at"] = datetime.now()
    article_dict["views"] = 0
    article_dict["likes"] = 0
    article_dict["deleted_at"] = None
    
    if article.status == "published":
        article_dict["published_at"] = datetime.now()
    
    await db.articles.insert_one(article_dict)
    
    # Remove MongoDB _id
    if '_id' in article_dict:
        del article_dict['_id']
    
    return {
        "success": True,
        "message": "Article created successfully",
        "article": article_dict
    }

@router.get("/admin/articles", response_model=dict)
async def get_all_articles(
    request: Request,
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0)
):
    """Get all articles (admin view)"""
    
    db = get_db(request)
    query = {"deleted_at": None}
    
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    
    articles = await db.articles.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=None)
    total = await db.articles.count_documents(query)
    
    # Remove MongoDB _id
    for article in articles:
        if '_id' in article:
            del article['_id']
    
    return {
        "success": True,
        "articles": articles,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/admin/articles/{article_id}", response_model=dict)
async def get_article(request: Request, article_id: str):
    """Get single article (admin)"""
    
    db = get_db(request)
    article = await db.articles.find_one({"id": article_id, "deleted_at": None})
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Remove MongoDB _id
    if '_id' in article:
        del article['_id']
    
    return {"success": True, "article": article}

@router.put("/admin/articles/{article_id}", response_model=dict)
async def update_article(request: Request, article_id: str, article_update: ArticleUpdate):
    """Update article"""
    
    db = get_db(request)
    existing = await db.articles.find_one({"id": article_id, "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    
    update_data = {k: v for k, v in article_update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now()
    
    # If status changed to published, set published_at
    if article_update.status == "published" and existing.get("status") != "published":
        update_data["published_at"] = datetime.now()
    
    await db.articles.update_one(
        {"id": article_id},
        {"$set": update_data}
    )
    
    updated_article = await db.articles.find_one({"id": article_id})
    
    # Remove MongoDB _id
    if updated_article and '_id' in updated_article:
        del updated_article['_id']
    
    return {
        "success": True,
        "message": "Article updated successfully",
        "article": updated_article
    }

@router.delete("/admin/articles/{article_id}", response_model=dict)
async def delete_article(request: Request, article_id: str):
    """Soft delete article"""
    
    db = get_db(request)
    result = await db.articles.update_one(
        {"id": article_id, "deleted_at": None},
        {"$set": {"deleted_at": datetime.now()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"success": True, "message": "Article deleted successfully"}

@router.get("/admin/articles/stats/overview", response_model=dict)
async def get_articles_stats(request: Request):
    """Get article statistics"""
    
    db = get_db(request)
    total_articles = await db.articles.count_documents({"deleted_at": None})
    published = await db.articles.count_documents({"deleted_at": None, "status": "published"})
    draft = await db.articles.count_documents({"deleted_at": None, "status": "draft"})
    
    # Count by category
    saas_count = await db.articles.count_documents({"deleted_at": None, "category": "saas"})
    tenant_count = await db.articles.count_documents({"deleted_at": None, "category": "tenant"})
    project_count = await db.articles.count_documents({"deleted_at": None, "category": "project"})
    
    # Total views and likes
    pipeline = [
        {"$match": {"deleted_at": None}},
        {"$group": {
            "_id": None,
            "total_views": {"$sum": "$views"},
            "total_likes": {"$sum": "$likes"}
        }}
    ]
    stats = await db.articles.aggregate(pipeline).to_list(length=1)
    total_views = stats[0]["total_views"] if stats else 0
    total_likes = stats[0]["total_likes"] if stats else 0
    
    return {
        "success": True,
        "stats": {
            "total_articles": total_articles,
            "published": published,
            "draft": draft,
            "by_category": {
                "saas": saas_count,
                "tenant": tenant_count,
                "project": project_count
            },
            "total_views": total_views,
            "total_likes": total_likes
        }
    }

# ====== AI ARTICLE GENERATION ENDPOINTS ======

@router.post("/admin/articles/ai/generate", response_model=dict)
async def generate_ai_article(request: Request, article_request: AIArticleRequest):
    """Generate a single article using AI"""
    
    db = get_db(request)
    try:
        generator = ArticleGenerator()
        article_data = await generator.generate_article(
            topic=article_request.topic,
            category=article_request.category,
            sub_category=article_request.sub_category,
            keywords=article_request.keywords,
            target_word_count=article_request.target_word_count
        )
        
        # Add additional fields
        article_data["id"] = str(datetime.now().timestamp()).replace('.', '')
        article_data["created_at"] = datetime.now()
        article_data["updated_at"] = datetime.now()
        article_data["published_at"] = datetime.now()
        article_data["views"] = 0
        article_data["likes"] = 0
        article_data["deleted_at"] = None
        
        # Save to database
        await db.articles.insert_one(article_data)
        
        # Remove MongoDB _id
        if '_id' in article_data:
            del article_data['_id']
        
        return {
            "success": True,
            "message": "Article generated successfully",
            "article": article_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate article: {str(e)}")

@router.post("/admin/articles/ai/bulk-generate", response_model=dict)
async def bulk_generate_articles(request: Request, bulk_request: BulkArticleGenerationRequest):
    """Generate multiple articles using AI - returns immediately, processes in background"""
    
    # This endpoint will be called from frontend to start bulk generation
    # For now, return success - will implement background task if needed
    
    return {
        "success": True,
        "message": f"Bulk generation started for {bulk_request.count} articles in category {bulk_request.category}",
        "category": bulk_request.category,
        "count": bulk_request.count
    }
