"""
Share-based Referral Routes
Viral content sharing with rewards
"""
from fastapi import APIRouter, HTTPException, Request
from models.share_referral import (
    ShareReferral, ShareLeadCapture, ShareAnalytics,
    CreateShareLinkRequest, TrackShareActivityRequest, ShareReward
)
from middleware.auth import get_current_user
from datetime import datetime, timezone
import uuid
import random
import string

router = APIRouter(prefix="/share-referral", tags=["share-referral"])

def get_db(request: Request):
    return request.app.state.db

def generate_share_code(length=8):
    """Generate unique share tracking code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("/create-share-link")
async def create_share_link(share_data: CreateShareLinkRequest, request: Request):
    """
    Create a trackable share link for content
    User gets credits when people view/interact via their link
    """
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    # Verify article exists
    article = await db.articles.find_one({'id': share_data.article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Generate unique share code
    share_code = generate_share_code()
    attempts = 0
    while attempts < 10:
        existing = await db.share_referrals.find_one({'share_code': share_code}, {"_id": 0})
        if not existing:
            break
        share_code = generate_share_code()
        attempts += 1
    
    # Create share tracking
    share_id = str(uuid.uuid4())
    base_url = str(request.base_url).rstrip('/')
    share_link = f"{base_url}/content/article/{article['slug']}?ref={share_code}"
    
    share_referral = {
        'id': share_id,
        'article_id': share_data.article_id,
        'sharer_id': user['user_id'],
        'sharer_name': user.get('name', 'User'),
        'share_code': share_code,
        'share_link': share_link,
        'platform': share_data.platform,
        'view_count': 0,
        'click_count': 0,
        'lead_count': 0,
        'credits_earned': 0.0,
        'reward_status': 'pending',
        'tenant_id': user['tenant_id'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'last_activity_at': None
    }
    
    await db.share_referrals.insert_one(share_referral)
    
    # Increment article share count
    await db.articles.update_one(
        {'id': share_data.article_id},
        {'$inc': {'share_count': 1}}
    )
    
    # Get or create reward config
    reward_config = await db.share_rewards.find_one(
        {'tenant_id': user['tenant_id']},
        {"_id": 0}
    )
    
    if not reward_config:
        # Use global default
        reward_config = await db.share_rewards.find_one(
            {'tenant_id': None},
            {"_id": 0}
        )
    
    # Award immediate share credit
    share_credit = reward_config.get('reward_per_share', 10.0) if reward_config else 10.0
    
    # Update user's share credits
    await db.share_referrals.update_one(
        {'id': share_id},
        {
            '$set': {
                'credits_earned': share_credit,
                'reward_status': 'earned'
            }
        }
    )
    
    return {
        "success": True,
        "share_link": share_link,
        "share_code": share_code,
        "credits_earned": share_credit,
        "message": f"Share link created! You'll earn credits when people engage.",
        "share_id": share_id,
        "platform_message": generate_share_message(article, share_link, share_data.platform, user.get('name'))
    }

def generate_share_message(article: dict, share_link: str, platform: str, user_name: str = ""):
    """Generate platform-specific share messages"""
    
    if platform == "whatsapp":
        return f"""📚 {article['title']}

{article['excerpt']}

చదవండి ఇక్కడ: {share_link}

- {user_name}"""
    
    elif platform == "facebook" or platform == "linkedin":
        return f"""{article['title']}

{article['excerpt']}

Read more: {share_link}"""
    
    elif platform == "twitter":
        return f"""{article['title']}

{share_link}"""
    
    elif platform == "email":
        return {
            "subject": f"Check this out: {article['title']}",
            "body": f"""Hi,

I found this interesting article and thought you might like it:

{article['title']}

{article['excerpt']}

Read the full article here:
{share_link}

Best regards,
{user_name}"""
        }
    
    else:
        return f"{article['title']}\n\n{share_link}"

@router.post("/track-activity")
async def track_share_activity(activity_data: TrackShareActivityRequest, request: Request):
    """
    Track activity on shared links
    Activities: view, click, share, lead
    """
    db = get_db(request)
    
    # Find share referral
    share_ref = await db.share_referrals.find_one(
        {'share_code': activity_data.share_code},
        {"_id": 0}
    )
    
    if not share_ref:
        raise HTTPException(status_code=404, detail="Share code not found")
    
    # Get reward config
    reward_config = await db.share_rewards.find_one(
        {'tenant_id': share_ref['tenant_id']},
        {"_id": 0}
    )
    
    if not reward_config:
        reward_config = await db.share_rewards.find_one({'tenant_id': None}, {"_id": 0})
    
    # Calculate credits based on activity type
    credits = 0.0
    update_fields = {'last_activity_at': datetime.now(timezone.utc).isoformat()}
    
    if activity_data.activity_type == "view":
        update_fields['view_count'] = share_ref.get('view_count', 0) + 1
        credits = reward_config.get('reward_per_view', 1.0) if reward_config else 1.0
        
        # Update article view count
        await db.articles.update_one(
            {'id': share_ref['article_id']},
            {'$inc': {'view_count': 1}}
        )
    
    elif activity_data.activity_type == "click":
        update_fields['click_count'] = share_ref.get('click_count', 0) + 1
        credits = 5.0  # Fixed credit for CTA clicks
    
    elif activity_data.activity_type == "share":
        # Someone re-shared the content
        credits = reward_config.get('reward_per_share', 10.0) if reward_config else 10.0
    
    elif activity_data.activity_type == "lead":
        update_fields['lead_count'] = share_ref.get('lead_count', 0) + 1
        credits = reward_config.get('reward_per_lead', 100.0) if reward_config else 100.0
    
    # Update credits
    update_fields['credits_earned'] = share_ref.get('credits_earned', 0.0) + credits
    
    # Check for viral bonus
    if update_fields.get('view_count', 0) >= reward_config.get('viral_threshold', 100):
        if share_ref.get('reward_status') != 'viral_awarded':
            viral_bonus = reward_config.get('viral_bonus', 1000.0) if reward_config else 1000.0
            update_fields['credits_earned'] += viral_bonus
            update_fields['reward_status'] = 'viral_awarded'
            credits += viral_bonus
    
    # Update share referral
    await db.share_referrals.update_one(
        {'share_code': activity_data.share_code},
        {'$set': update_fields}
    )
    
    return {
        "success": True,
        "credits_earned": credits,
        "total_credits": update_fields['credits_earned'],
        "activity_type": activity_data.activity_type
    }

@router.post("/capture-lead")
async def capture_share_lead(lead_data: dict, request: Request):
    """
    Capture lead from shared content
    Awards credit to the person who shared
    """
    db = get_db(request)
    
    share_code = lead_data.get('share_code')
    if not share_code:
        raise HTTPException(status_code=400, detail="Share code required")
    
    # Find share referral
    share_ref = await db.share_referrals.find_one(
        {'share_code': share_code},
        {"_id": 0}
    )
    
    if not share_ref:
        raise HTTPException(status_code=404, detail="Share code not found")
    
    # Get reward config
    reward_config = await db.share_rewards.find_one(
        {'tenant_id': share_ref['tenant_id']},
        {"_id": 0}
    )
    
    lead_credit = reward_config.get('reward_per_lead', 100.0) if reward_config else 100.0
    
    # Create lead
    lead_id = str(uuid.uuid4())
    lead = {
        'id': lead_id,
        'article_id': share_ref['article_id'],
        'share_code': share_code,
        'sharer_id': share_ref['sharer_id'],
        'name': lead_data.get('name'),
        'email': lead_data.get('email'),
        'phone': lead_data.get('phone'),
        'message': lead_data.get('message'),
        'referrer_url': lead_data.get('referrer_url'),
        'ip_address': lead_data.get('ip_address'),
        'user_agent': request.headers.get('user-agent'),
        'status': 'new',
        'conversion_value': 0.0,
        'credit_awarded': lead_credit,
        'credit_status': 'awarded',
        'tenant_id': share_ref['tenant_id'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'converted_at': None
    }
    
    await db.share_leads.insert_one(lead)
    
    # Update share referral
    await db.share_referrals.update_one(
        {'share_code': share_code},
        {
            '$inc': {
                'lead_count': 1,
                'credits_earned': lead_credit
            },
            '$set': {
                'last_activity_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update article lead count
    await db.articles.update_one(
        {'id': share_ref['article_id']},
        {'$inc': {'lead_count': 1}}
    )
    
    # Send notification to sharer using Firebase service
    from services.firebase_notification_service import send_notification_to_user
    
    await send_notification_to_user(
        db=db,
        user_id=share_ref['sharer_id'],
        tenant_id=share_ref['tenant_id'],
        title='🎉 New Lead from Your Share!',
        message=f"Someone filled the form from your shared article! You earned ₹{lead_credit} credits.",
        notification_type='success',
        priority='normal',
        action_url='/share-rewards',
        action_label='View Rewards',
        metadata={
            'lead_id': lead_id,
            'credits': lead_credit
        }
    )
    
    return {
        "success": True,
        "message": "Lead captured successfully",
        "lead_id": lead_id,
        "credit_awarded": lead_credit
    }

@router.get("/my-analytics")
async def get_my_share_analytics(request: Request):
    """Get user's share analytics and earnings"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    # Get all user's shares
    shares = await db.share_referrals.find(
        {'sharer_id': user['user_id']},
        {"_id": 0}
    ).to_list(length=1000)
    
    # Calculate totals
    total_shares = len(shares)
    total_views = sum(s.get('view_count', 0) for s in shares)
    total_clicks = sum(s.get('click_count', 0) for s in shares)
    total_leads = sum(s.get('lead_count', 0) for s in shares)
    total_credits = sum(s.get('credits_earned', 0.0) for s in shares)
    
    # Get pending credits (leads not yet converted)
    pending_leads = await db.share_leads.find({
        'sharer_id': user['user_id'],
        'credit_status': 'awarded'
    }, {"_id": 0}).to_list(length=1000)
    
    available_credits = sum(l.get('credit_awarded', 0.0) for l in pending_leads if l.get('status') == 'converted')
    pending_credits = sum(l.get('credit_awarded', 0.0) for l in pending_leads if l.get('status') != 'converted')
    
    # Find top performing article
    top_share = max(shares, key=lambda x: x.get('view_count', 0)) if shares else None
    
    # Platform breakdown
    platform_stats = {}
    for share in shares:
        platform = share.get('platform', 'unknown')
        if platform not in platform_stats:
            platform_stats[platform] = {
                'count': 0,
                'views': 0,
                'leads': 0,
                'credits': 0.0
            }
        platform_stats[platform]['count'] += 1
        platform_stats[platform]['views'] += share.get('view_count', 0)
        platform_stats[platform]['leads'] += share.get('lead_count', 0)
        platform_stats[platform]['credits'] += share.get('credits_earned', 0.0)
    
    analytics = {
        'user_id': user['user_id'],
        'total_shares': total_shares,
        'total_views': total_views,
        'total_clicks': total_clicks,
        'total_leads': total_leads,
        'total_credits_earned': total_credits,
        'available_credits': available_credits,
        'pending_credits': pending_credits,
        'top_article_id': top_share.get('article_id') if top_share else None,
        'top_article_views': top_share.get('view_count', 0) if top_share else 0,
        'platform_stats': platform_stats,
        'recent_shares': sorted(shares, key=lambda x: x.get('created_at', ''), reverse=True)[:10]
    }
    
    return {
        "success": True,
        "analytics": analytics
    }

@router.get("/my-leads")
async def get_my_share_leads(request: Request, limit: int = 50, skip: int = 0):
    """Get leads generated from user's shares"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    # Get leads
    leads = await db.share_leads.find(
        {'sharer_id': user['user_id']},
        {"_id": 0}
    ).sort('created_at', -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with article info
    for lead in leads:
        article = await db.articles.find_one(
            {'id': lead['article_id']},
            {"_id": 0, "title": 1, "slug": 1}
        )
        lead['article'] = article
    
    total = await db.share_leads.count_documents({'sharer_id': user['user_id']})
    
    return {
        "success": True,
        "leads": leads,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/leaderboard")
async def get_share_leaderboard(request: Request, limit: int = 10):
    """Get top sharers leaderboard"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    # Aggregate shares by user
    pipeline = [
        {'$match': {'tenant_id': user['tenant_id']}},
        {
            '$group': {
                '_id': '$sharer_id',
                'sharer_name': {'$first': '$sharer_name'},
                'total_shares': {'$sum': 1},
                'total_views': {'$sum': '$view_count'},
                'total_leads': {'$sum': '$lead_count'},
                'total_credits': {'$sum': '$credits_earned'}
            }
        },
        {'$sort': {'total_credits': -1}},
        {'$limit': limit}
    ]
    
    leaderboard = await db.share_referrals.aggregate(pipeline).to_list(length=limit)
    
    return {
        "success": True,
        "leaderboard": leaderboard
    }

# ============ ADMIN ROUTES ============

@router.post("/admin/setup-rewards")
async def setup_reward_config(reward_data: dict, request: Request):
    """Setup reward configuration (Admin only)"""
    user = await get_current_user(request)
    if not user or user.get('role') not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db(request)
    
    # Check if config exists
    existing = await db.share_rewards.find_one(
        {'tenant_id': user['tenant_id']},
        {"_id": 0}
    )
    
    if existing:
        # Update
        await db.share_rewards.update_one(
            {'id': existing['id']},
            {
                '$set': {
                    **reward_data,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {"success": True, "message": "Reward config updated"}
    else:
        # Create new
        config_id = str(uuid.uuid4())
        config = {
            'id': config_id,
            'tenant_id': user['tenant_id'],
            **reward_data,
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.share_rewards.insert_one(config)
        return {"success": True, "message": "Reward config created", "config": config}

@router.get("/admin/all-leads")
async def get_all_share_leads(request: Request, limit: int = 100, skip: int = 0):
    """Get all leads from shares (Admin only)"""
    user = await get_current_user(request)
    if not user or user.get('role') not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db(request)
    
    leads = await db.share_leads.find(
        {'tenant_id': user['tenant_id']},
        {"_id": 0}
    ).sort('created_at', -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.share_leads.count_documents({'tenant_id': user['tenant_id']})
    
    return {
        "success": True,
        "leads": leads,
        "total": total
    }
