"""
TutorAI API Routes - Educational Video Generation Admin Tool
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import FileResponse
from typing import Optional, List
from pydantic import BaseModel
import csv
import io
import os

router = APIRouter(prefix="/tutorai", tags=["TutorAI"])

# Import auth middleware
from middleware.auth import get_current_user


# Pydantic Models
class GenerateScriptRequest(BaseModel):
    concept_name: str
    class_level: str
    subject: str
    language: str


class GenerateVideoRequest(BaseModel):
    script: str
    language: str
    avatar_style: str
    concept_name: str
    class_level: str
    subject: str


class GenerateQuizRequest(BaseModel):
    script: str
    concept_name: str
    class_level: str
    subject: str
    language: str


class UpdateVideoRequest(BaseModel):
    youtube_uploaded: Optional[bool] = None
    youtube_url: Optional[str] = None


# Admin check helper
def check_admin(current_user: dict):
    """Check if user is admin or super_admin"""
    role = current_user.get("role", "")
    if role not in ["admin", "super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return True


# ============= API Endpoints =============

@router.post("/generate-script")
async def generate_script(
    request: GenerateScriptRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate educational video script using Claude AI"""
    check_admin(current_user)
    
    from services.tutorai_service import TutorAIService
    
    result = await TutorAIService.generate_script(
        concept_name=request.concept_name,
        class_level=request.class_level,
        subject=request.subject,
        language=request.language
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Script generation failed"))
    
    return result


@router.post("/generate-video")
async def generate_video(
    request: GenerateVideoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate video using HeyGen API"""
    check_admin(current_user)
    
    from services.tutorai_service import TutorAIService
    
    result = await TutorAIService.generate_video(
        script=request.script,
        language=request.language,
        avatar_style=request.avatar_style,
        concept_name=request.concept_name,
        class_level=request.class_level,
        subject=request.subject
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Video generation failed"))
    
    return result


@router.get("/video-status/{heygen_video_id}")
async def check_video_status(
    heygen_video_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check video generation status from HeyGen"""
    check_admin(current_user)
    
    from services.tutorai_service import TutorAIService
    
    result = await TutorAIService.check_video_status(heygen_video_id)
    return result


@router.post("/generate-quiz-pdf")
async def generate_quiz_pdf(
    request: GenerateQuizRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate quiz PDF from script"""
    check_admin(current_user)
    
    from services.tutorai_service import TutorAIService
    
    result = await TutorAIService.generate_quiz_pdf(
        script=request.script,
        concept_name=request.concept_name,
        class_level=request.class_level,
        subject=request.subject,
        language=request.language
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Quiz PDF generation failed"))
    
    return result


@router.get("/download-pdf/{filename}")
async def download_pdf(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Download generated quiz PDF"""
    check_admin(current_user)
    
    pdf_path = f"/tmp/{filename}"
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename
    )


@router.get("/videos")
async def get_all_videos(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get all generated videos"""
    check_admin(current_user)
    
    from services.tutorai_service import TutorAIService
    
    videos = await TutorAIService.get_all_videos(limit=limit, skip=skip)
    return {"success": True, "videos": videos, "count": len(videos)}


@router.put("/videos/{video_id}")
async def update_video(
    video_id: str,
    request: UpdateVideoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update video record (e.g., mark as uploaded to YouTube)"""
    check_admin(current_user)
    
    from services.tutorai_service import TutorAIService
    
    update_data = {}
    if request.youtube_uploaded is not None:
        update_data["youtube_uploaded"] = request.youtube_uploaded
    if request.youtube_url is not None:
        update_data["youtube_url"] = request.youtube_url
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    success = await TutorAIService.update_video(video_id, update_data)
    
    if not success:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {"success": True, "message": "Video updated"}


@router.post("/batch-upload")
async def batch_upload(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload CSV for batch processing"""
    check_admin(current_user)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        rows = list(reader)
        
        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty")
        
        # Validate required columns
        required_cols = ['concept_name', 'class_level', 'subject']
        first_row_keys = rows[0].keys()
        missing_cols = [col for col in required_cols if col not in first_row_keys]
        
        if missing_cols:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_cols)}"
            )
        
        from services.tutorai_service import TutorAIService
        results = await TutorAIService.process_batch_csv(rows)
        
        return {
            "success": True,
            "processed": len(results),
            "results": results
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV file encoding")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_config(
    current_user: dict = Depends(get_current_user)
):
    """Get TutorAI configuration options"""
    check_admin(current_user)
    
    return {
        "class_levels": [f"Class {i}" for i in range(1, 11)],
        "subjects": ["Science", "Maths", "Telugu", "Social", "English"],
        "languages": ["Telugu", "Hindi", "English"],
        "avatar_styles": [
            {"id": "male_teacher", "name": "Male Teacher"},
            {"id": "female_teacher", "name": "Female Teacher"}
        ],
        "heygen_configured": bool(os.getenv('HEYGEN_API_KEY')),
        "llm_configured": bool(os.getenv('EMERGENT_LLM_KEY'))
    }


@router.post("/webhook/heygen")
async def heygen_webhook(request: Request):
    """
    HeyGen webhook callback - receives video completion notifications
    Set this URL in HeyGen dashboard: https://www.memoraai.in/api/tutorai/webhook/heygen
    """
    try:
        body = await request.json()
        print(f"📹 HeyGen Webhook received: {body}")
        
        event_type = body.get("event_type")
        video_id = body.get("video_id") or body.get("data", {}).get("video_id")
        
        if event_type == "avatar_video.success" or body.get("status") == "completed":
            video_url = body.get("video_url") or body.get("data", {}).get("video_url")
            
            if video_id and video_url:
                from motor.motor_asyncio import AsyncIOMotorClient
                client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
                db = client[os.getenv('DB_NAME', 'test_database')]
                
                await db.tutorai_generated_videos.update_one(
                    {"heygen_video_id": video_id},
                    {"$set": {
                        "status": "completed",
                        "video_url": video_url,
                        "download_url": video_url,
                        "completed_at": body.get("timestamp")
                    }}
                )
                print(f"✅ Video {video_id} marked as completed")
        
        elif event_type == "avatar_video.fail" or body.get("status") == "failed":
            error = body.get("error") or body.get("data", {}).get("error", "Unknown error")
            
            if video_id:
                from motor.motor_asyncio import AsyncIOMotorClient
                client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
                db = client[os.getenv('DB_NAME', 'test_database')]
                
                await db.tutorai_generated_videos.update_one(
                    {"heygen_video_id": video_id},
                    {"$set": {"status": "failed", "error": str(error)}}
                )
                print(f"❌ Video {video_id} failed: {error}")
        
        return {"success": True, "message": "Webhook received"}
        
    except Exception as e:
        print(f"❌ Webhook error: {str(e)}")
        return {"success": False, "error": str(e)}
