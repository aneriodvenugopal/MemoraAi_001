from fastapi import APIRouter, HTTPException, Request
from models.referral import ReferralCode, Referral, ReferralCreate, ReferralStats
from middleware.auth import get_current_user
from datetime import datetime, timezone
import uuid
import random
import string

router = APIRouter(prefix="/referrals", tags=["referrals"])

def get_db(request: Request):
    return request.app.state.db

def generate_unique_code(name: str) -> str:
    """Generate unique referral code"""
    # Take first 3 letters of name + 6 random chars
    prefix = ''.join(filter(str.isalpha, name.upper()))[:3]
    if len(prefix) < 3:
        prefix = prefix + 'REF'[:3-len(prefix)]
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{suffix}"

@router.post("/generate-code")
async def generate_referral_code(request: Request):
    """Generate or get user's referral code"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if user already has a referral code
    existing = await db.referral_codes.find_one({
        'user_id': user['user_id'],
        'tenant_id': user['tenant_id']
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Generate new code
    base_code = generate_unique_code(user.get('name', 'USER'))
    
    # Ensure uniqueness
    attempts = 0
    while attempts < 10:
        check = await db.referral_codes.find_one({'referral_code': base_code}, {"_id": 0})
        if not check:
            break
        base_code = generate_unique_code(user.get('name', 'USER'))
        attempts += 1
    
    # Create referral code
    referral_code_id = str(uuid.uuid4())
    base_url = request.base_url.scheme + "://" + request.base_url.netloc
    
    referral_data = {
        'id': referral_code_id,
        'user_id': user['user_id'],
        'tenant_id': user['tenant_id'],
        'referral_code': base_code,
        'referral_link': f"{base_url}/register?ref={base_code}",
        'total_referrals': 0,
        'total_earned': 0.0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'is_active': True
    }
    
    await db.referral_codes.insert_one(referral_data)
    
    return referral_data

@router.get("/my-code")
async def get_my_referral_code(request: Request):
    """Get user's referral code and stats"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get or create referral code
    referral_code = await db.referral_codes.find_one({
        'user_id': user['user_id'],
        'tenant_id': user['tenant_id']
    }, {"_id": 0})
    
    if not referral_code:
        # Generate new one
        return await generate_referral_code(request)
    
    return referral_code

@router.get("/stats")
async def get_referral_stats(request: Request):
    """Get user's referral statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get referral code
    referral_code_doc = await db.referral_codes.find_one({
        'user_id': user['user_id'],
        'tenant_id': user['tenant_id']
    }, {"_id": 0})
    
    if not referral_code_doc:
        # Generate if not exists
        referral_code_doc = await generate_referral_code(request)
    
    # Get all referrals
    referrals = await db.referrals.find({
        'referrer_id': user['user_id'],
        'tenant_id': user['tenant_id']
    }, {"_id": 0}).to_list(length=1000)
    
    # Calculate stats
    total_referrals = len(referrals)
    completed_referrals = len([r for r in referrals if r['status'] == 'completed'])
    pending_referrals = len([r for r in referrals if r['status'] == 'pending'])
    
    total_earned = sum(r.get('referrer_reward', 0) for r in referrals if r['status'] in ['completed', 'rewarded'])
    
    stats = {
        'total_referrals': total_referrals,
        'completed_referrals': completed_referrals,
        'pending_referrals': pending_referrals,
        'total_earned': total_earned,
        'available_balance': total_earned,
        'referral_code': referral_code_doc['referral_code'],
        'referral_link': referral_code_doc['referral_link']
    }
    
    return stats

@router.get("/history")
async def get_referral_history(request: Request):
    """Get user's referral history"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    referrals = await db.referrals.find({
        'referrer_id': user['user_id'],
        'tenant_id': user['tenant_id']
    }, {"_id": 0}).sort('created_at', -1).to_list(length=100)
    
    return {
        "success": True,
        "referrals": referrals,
        "total": len(referrals)
    }

@router.post("/validate-code")
async def validate_referral_code(referral_code: str, request: Request):
    """Validate referral code (used during registration)"""
    db = get_db(request)
    
    code = await db.referral_codes.find_one({
        'referral_code': referral_code,
        'is_active': True
    }, {"_id": 0})
    
    if not code:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    return {
        "valid": True,
        "referral_code": code['referral_code'],
        "referrer_id": code['user_id']
    }

@router.post("/track-referral")
async def track_referral(referral_data: ReferralCreate, request: Request):
    """Track a new referral (called when someone registers with referral code)"""
    db = get_db(request)
    
    # Validate referral code
    referral_code_doc = await db.referral_codes.find_one({
        'referral_code': referral_data.referrer_code,
        'is_active': True
    }, {"_id": 0})
    
    if not referral_code_doc:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    # Get referrer details
    referrer = await db.users.find_one({
        'id': referral_code_doc['user_id']
    }, {"_id": 0})
    
    if not referrer:
        raise HTTPException(status_code=404, detail="Referrer not found")
    
    # Check if referee already exists
    existing_referee = await db.users.find_one({
        'phone': referral_data.referee_phone,
        'tenant_id': referral_code_doc['tenant_id']
    }, {"_id": 0})
    
    if existing_referee:
        # Check if already referred
        existing_referral = await db.referrals.find_one({
            'referee_id': existing_referee['id'],
            'tenant_id': referral_code_doc['tenant_id']
        }, {"_id": 0})
        
        if existing_referral:
            raise HTTPException(status_code=400, detail="User already referred by someone")
    
    # Create referral tracking (status: pending until they complete first action)
    referral_id = str(uuid.uuid4())
    referral = {
        'id': referral_id,
        'referrer_id': referrer['id'],
        'referrer_name': referrer['name'],
        'referee_id': existing_referee['id'] if existing_referee else '',
        'referee_name': referral_data.referee_name or '',
        'referee_phone': referral_data.referee_phone,
        'referral_code': referral_data.referrer_code,
        'tenant_id': referral_code_doc['tenant_id'],
        'status': 'pending',
        'referrer_reward': 500.0,
        'referee_reward': 500.0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'completed_at': None,
        'rewarded_at': None
    }
    
    await db.referrals.insert_one(referral)
    
    # Update referral code stats
    await db.referral_codes.update_one(
        {'id': referral_code_doc['id']},
        {
            '$inc': {'total_referrals': 1}
        }
    )
    
    return {
        "success": True,
        "referral_id": referral_id,
        "message": "Referral tracked successfully",
        "referee_reward": 500.0
    }

@router.post("/complete-referral/{referral_id}")
async def complete_referral(referral_id: str, request: Request):
    """Mark referral as completed (when referee makes first booking/payment)"""
    db = get_db(request)
    user = await get_current_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get referral
    referral = await db.referrals.find_one({
        'id': referral_id,
        'status': 'pending'
    }, {"_id": 0})
    
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found or already completed")
    
    # Update referral status
    await db.referrals.update_one(
        {'id': referral_id},
        {
            '$set': {
                'status': 'completed',
                'completed_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update referral code stats
    await db.referral_codes.update_one(
        {'user_id': referral['referrer_id']},
        {
            '$inc': {'total_earned': referral['referrer_reward']}
        }
    )
    
    # Send notifications for both referrer and referee using Firebase service
    from services.firebase_notification_service import send_notification_to_user
    
    # Notification for referrer
    await send_notification_to_user(
        db=db,
        user_id=referral['referrer_id'],
        tenant_id=referral['tenant_id'],
        title='🎉 Referral Reward Earned!',
        message=f'Congratulations! {referral["referee_name"]} joined using your referral. You earned ₹{referral["referrer_reward"]}!',
        notification_type='success',
        priority='high',
        action_url='/referrals',
        action_label='View Referrals',
        metadata={
            'referral_id': referral_id,
            'reward': referral['referrer_reward']
        }
    )
    
    # Notification for referee
    if referral['referee_id']:
        await send_notification_to_user(
            db=db,
            user_id=referral['referee_id'],
            tenant_id=referral['tenant_id'],
            title='🎁 Welcome Bonus!',
            message=f'Welcome to ExlainERP! You received ₹{referral["referee_reward"]} bonus from your referral!',
            notification_type='success',
            priority='normal',
            action_url='/dashboard',
            action_label='View Dashboard',
            metadata={
                'referral_id': referral_id,
                'reward': referral['referee_reward']
            }
        )
    
    return {
        "success": True,
        "message": "Referral completed and rewards credited"
    }

@router.get("/leaderboard")
async def get_referral_leaderboard(request: Request, limit: int = 10):
    """Get top referrers leaderboard"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get top referrers in same tenant
    leaderboard = await db.referral_codes.find({
        'tenant_id': user['tenant_id'],
        'is_active': True
    }, {"_id": 0}).sort('total_referrals', -1).limit(limit).to_list(length=limit)
    
    # Get user details for each
    for entry in leaderboard:
        user_doc = await db.users.find_one({'id': entry['user_id']}, {"_id": 0})
        entry['user_name'] = user_doc.get('name', 'Anonymous') if user_doc else 'Anonymous'
        entry['user_role'] = user_doc.get('role_id', '') if user_doc else ''
    
    return {
        "success": True,
        "leaderboard": leaderboard
    }

@router.get("/share-templates")
async def get_share_templates(request: Request):
    """Get pre-built share message templates"""
    user = await get_current_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user's referral code
    code_doc = await get_my_referral_code(request)
    
    templates = [
        {
            "id": "whatsapp_telugu",
            "platform": "whatsapp",
            "language": "telugu",
            "message": f"""🏠 నమస్కారం!

నేను ExlainERP app use చేస్తున్నాను - Real Estate management చాలా easy అవుతుంది!

ప్రయోజనాలు:
✅ Property search సులభం
✅ Booking tracking automatic
✅ Payment reminders
✅ Commission calculation

మీరు కూడా try చేయండి: {code_doc['referral_link']}

ప్రత్యేక discount: ₹500 OFF 🎁
నాకు కూడా ₹500 reward వస్తుంది!

- {user.get('name')}"""
        },
        {
            "id": "whatsapp_english",
            "platform": "whatsapp",
            "language": "english",
            "message": f"""🏠 Hi there!

I'm using ExlainERP for real estate management and it's amazing!

Benefits:
✅ Easy property search
✅ Automatic booking tracking
✅ Payment reminders
✅ Commission calculator

Try it here: {code_doc['referral_link']}

Special offer: ₹500 OFF 🎁
I'll also earn ₹500 reward!

- {user.get('name')}"""
        },
        {
            "id": "sms_short",
            "platform": "sms",
            "language": "english",
            "message": f"""ExlainERP - Real Estate made easy! Join now & get ₹500 OFF: {code_doc['referral_link']} - {user.get('name')}"""
        },
        {
            "id": "email",
            "platform": "email",
            "language": "english",
            "subject": "Join ExlainERP & Get ₹500 Bonus!",
            "message": f"""Hello!

I wanted to share something exciting with you.

I've been using ExlainERP for managing real estate, and it has made everything so much easier - from property listings to bookings to payments.

I thought you might find it useful too!

🎁 Special Offer: Use my referral link to get ₹500 OFF:
{code_doc['referral_link']}

Benefits:
• Easy property management
• Automated booking system
• Payment tracking & reminders
• Commission calculator
• Mobile app access

Give it a try - it's really helpful!

Best regards,
{user.get('name')}"""
        }
    ]
    
    return {
        "success": True,
        "templates": templates,
        "referral_code": code_doc['referral_code'],
        "referral_link": code_doc['referral_link']
    }
