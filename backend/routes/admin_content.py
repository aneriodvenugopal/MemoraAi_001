"""
Admin Content Management Routes - For SaaS Admin CRUD Operations
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from models.content import (
    Article, ArticleCreateRequest, ArticleUpdateRequest,
    ContentCategory, ContentTag
)
from middleware.auth import get_current_user
from datetime import datetime, timezone
import uuid
from typing import List, Optional

router = APIRouter(prefix="/admin/content", tags=["admin-content"])

def get_db(request: Request):
    return request.app.state.db

async def check_admin_access(user: dict):
    """Check if user has admin access"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if user is super_admin or admin (using role slug from JWT)
    if user.get('role') not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return True

# ============ ARTICLE MANAGEMENT ============

@router.get("/articles")
async def get_all_articles(
    request: Request,
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all articles with filters (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    # Build query
    query = {}
    if status:
        query['status'] = status
    if category_id:
        query['category_id'] = category_id
    
    # Get articles
    articles = await db.articles.find(query, {"_id": 0}) \
        .sort('created_at', -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(length=limit)
    
    # Get total count
    total = await db.articles.count_documents(query)
    
    # Enrich with category info
    for article in articles:
        if article.get('category_id'):
            category = await db.content_categories.find_one(
                {'id': article['category_id']},
                {"_id": 0}
            )
            article['category'] = category
    
    return {
        "success": True,
        "articles": articles,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/articles/{article_id}")
async def get_article_by_id(article_id: str, request: Request):
    """Get single article by ID (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    article = await db.articles.find_one({'id': article_id}, {"_id": 0})
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Get category
    if article.get('category_id'):
        category = await db.content_categories.find_one(
            {'id': article['category_id']},
            {"_id": 0}
        )
        article['category'] = category
    
    return article

@router.post("/articles")
async def create_article(article_data: ArticleCreateRequest, request: Request):
    """Create new article (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    # Generate slug from title
    slug = article_data.title.lower().replace(' ', '-').replace('/', '-')
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    
    # Check if slug exists
    existing = await db.articles.find_one({'slug': slug}, {"_id": 0})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    # Create article
    article_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    article = {
        'id': article_id,
        'title': article_data.title,
        'slug': slug,
        'excerpt': article_data.excerpt,
        'content': article_data.content,
        'featured_image': article_data.featured_image,
        'category_id': article_data.category_id,
        'tags': article_data.tags,
        'author_id': user['user_id'],
        'author_name': user.get('name', 'Admin'),
        'meta_description': article_data.excerpt[:160],
        'reading_time': article_data.reading_time,
        'problem_statement': article_data.problem_statement,
        'impact_analysis': article_data.impact_analysis,
        'solution_description': article_data.solution_description,
        'roi_benefits': article_data.roi_benefits,
        'success_metrics': article_data.success_metrics,
        'view_count': 0,
        'share_count': 0,
        'lead_count': 0,
        'cta_text': article_data.cta_text,
        'cta_link': article_data.cta_link,
        'status': article_data.status,
        'published_at': now if article_data.status == 'published' else None,
        'created_at': now,
        'updated_at': now,
        'tenant_id': None  # Global content
    }
    
    await db.articles.insert_one(article)
    
    # Remove _id field if it exists to avoid serialization issues
    article.pop('_id', None)
    
    return {
        "success": True,
        "message": "Article created successfully",
        "article_id": article_id,
        "article": article
    }

@router.put("/articles/{article_id}")
async def update_article(
    article_id: str,
    article_data: ArticleUpdateRequest,
    request: Request
):
    """Update existing article (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    # Check if article exists
    existing = await db.articles.find_one({'id': article_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Build update data
    update_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
    
    # Only update provided fields
    if article_data.title is not None:
        update_data['title'] = article_data.title
        # Update slug
        slug = article_data.title.lower().replace(' ', '-').replace('/', '-')
        slug = ''.join(c for c in slug if c.isalnum() or c == '-')
        update_data['slug'] = slug
    
    if article_data.excerpt is not None:
        update_data['excerpt'] = article_data.excerpt
    if article_data.content is not None:
        update_data['content'] = article_data.content
    if article_data.featured_image is not None:
        update_data['featured_image'] = article_data.featured_image
    if article_data.category_id is not None:
        update_data['category_id'] = article_data.category_id
    if article_data.tags is not None:
        update_data['tags'] = article_data.tags
    if article_data.problem_statement is not None:
        update_data['problem_statement'] = article_data.problem_statement
    if article_data.impact_analysis is not None:
        update_data['impact_analysis'] = article_data.impact_analysis
    if article_data.solution_description is not None:
        update_data['solution_description'] = article_data.solution_description
    if article_data.roi_benefits is not None:
        update_data['roi_benefits'] = article_data.roi_benefits
    if article_data.success_metrics is not None:
        update_data['success_metrics'] = article_data.success_metrics
    if article_data.cta_text is not None:
        update_data['cta_text'] = article_data.cta_text
    if article_data.cta_link is not None:
        update_data['cta_link'] = article_data.cta_link
    if article_data.reading_time is not None:
        update_data['reading_time'] = article_data.reading_time
    
    # Handle status change
    if article_data.status is not None:
        update_data['status'] = article_data.status
        if article_data.status == 'published' and not existing.get('published_at'):
            update_data['published_at'] = datetime.now(timezone.utc).isoformat()
    
    # Update article
    await db.articles.update_one(
        {'id': article_id},
        {'$set': update_data}
    )
    
    # Get updated article
    updated_article = await db.articles.find_one({'id': article_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Article updated successfully",
        "article": updated_article
    }

@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, request: Request):
    """Delete article (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    # Check if article exists
    existing = await db.articles.find_one({'id': article_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Delete article
    await db.articles.delete_one({'id': article_id})
    
    # Also delete related tracking data
    await db.content_views.delete_many({'article_id': article_id})
    await db.content_shares.delete_many({'article_id': article_id})
    
    return {
        "success": True,
        "message": "Article deleted successfully"
    }

@router.post("/articles/{article_id}/publish")
async def publish_article(article_id: str, request: Request):
    """Publish article (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    result = await db.articles.update_one(
        {'id': article_id},
        {
            '$set': {
                'status': 'published',
                'published_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {
        "success": True,
        "message": "Article published successfully"
    }

@router.post("/articles/{article_id}/unpublish")
async def unpublish_article(article_id: str, request: Request):
    """Unpublish article (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    result = await db.articles.update_one(
        {'id': article_id},
        {
            '$set': {
                'status': 'draft',
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {
        "success": True,
        "message": "Article unpublished successfully"
    }

# ============ CATEGORY MANAGEMENT ============

@router.get("/categories")
async def get_all_categories(request: Request):
    """Get all categories (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    categories = await db.content_categories.find({}, {"_id": 0}).to_list(length=100)
    
    # Get article count for each category
    for category in categories:
        count = await db.articles.count_documents({'category_id': category['id']})
        category['article_count'] = count
    
    return {
        "success": True,
        "categories": categories
    }

@router.post("/categories")
async def create_category(category_data: dict, request: Request):
    """Create new category (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    # Generate slug
    slug = category_data['name'].lower().replace(' ', '-')
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    
    # Check if slug exists
    existing = await db.content_categories.find_one({'slug': slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category_id = str(uuid.uuid4())
    category = {
        'id': category_id,
        'name': category_data['name'],
        'slug': slug,
        'description': category_data.get('description'),
        'icon': category_data.get('icon'),
        'color': category_data.get('color', '#3B82F6'),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.content_categories.insert_one(category)
    
    # Remove _id field if it exists to avoid serialization issues
    category.pop('_id', None)
    
    return {
        "success": True,
        "message": "Category created successfully",
        "category": category
    }

@router.put("/categories/{category_id}")
async def update_category(category_id: str, category_data: dict, request: Request):
    """Update category (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    existing = await db.content_categories.find_one({'id': category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {}
    if 'name' in category_data:
        update_data['name'] = category_data['name']
        slug = category_data['name'].lower().replace(' ', '-')
        slug = ''.join(c for c in slug if c.isalnum() or c == '-')
        update_data['slug'] = slug
    
    if 'description' in category_data:
        update_data['description'] = category_data['description']
    if 'icon' in category_data:
        update_data['icon'] = category_data['icon']
    if 'color' in category_data:
        update_data['color'] = category_data['color']
    
    await db.content_categories.update_one(
        {'id': category_id},
        {'$set': update_data}
    )
    
    updated_category = await db.content_categories.find_one({'id': category_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Category updated successfully",
        "category": updated_category
    }

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, request: Request):
    """Delete category (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    # Check if category has articles
    article_count = await db.articles.count_documents({'category_id': category_id})
    if article_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {article_count} articles. Move or delete articles first."
        )
    
    result = await db.content_categories.delete_one({'id': category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {
        "success": True,
        "message": "Category deleted successfully"
    }

# ============ ANALYTICS ============

@router.get("/analytics")
async def get_content_analytics(request: Request):
    """Get content analytics overview (Admin only)"""
    user = await get_current_user(request)
    await check_admin_access(user)
    
    db = get_db(request)
    
    # Count articles by status
    total_articles = await db.articles.count_documents({})
    published_articles = await db.articles.count_documents({'status': 'published'})
    draft_articles = await db.articles.count_documents({'status': 'draft'})
    
    # Get total views and shares
    articles = await db.articles.find({}, {"_id": 0}).to_list(length=1000)
    total_views = sum(a.get('view_count', 0) for a in articles)
    total_shares = sum(a.get('share_count', 0) for a in articles)
    total_leads = sum(a.get('lead_count', 0) for a in articles)
    
    # Get top performing articles
    top_articles = sorted(
        articles,
        key=lambda x: x.get('view_count', 0) + x.get('share_count', 0) * 10,
        reverse=True
    )[:5]
    
    # Get category count
    total_categories = await db.content_categories.count_documents({})
    
    return {
        "success": True,
        "analytics": {
            "total_articles": total_articles,
            "published_articles": published_articles,
            "draft_articles": draft_articles,
            "total_views": total_views,
            "total_shares": total_shares,
            "total_leads": total_leads,
            "total_categories": total_categories,
            "top_articles": top_articles
        }
    }
