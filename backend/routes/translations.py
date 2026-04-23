"""
Translation API Routes
Provides endpoints for AI-powered translation
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from services.translation_service import translation_service

router = APIRouter(prefix="/translations", tags=["translations"])

class TranslateRequest(BaseModel):
    text: str
    target_language: str  # 'telugu' or 'hindi'

class BatchTranslateRequest(BaseModel):
    texts: List[str]
    target_language: str

class TranslateResponse(BaseModel):
    original: str
    translated: str
    language: str

class BatchTranslateResponse(BaseModel):
    translations: Dict[str, str]
    language: str

@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """
    Translate a single text to target language
    """
    try:
        if request.target_language.lower() not in ['telugu', 'hindi']:
            raise HTTPException(
                status_code=400,
                detail="Supported languages: telugu, hindi"
            )
        
        translated = await translation_service.translate_text(
            request.text,
            request.target_language
        )
        
        return TranslateResponse(
            original=request.text,
            translated=translated,
            language=request.target_language
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(e)}"
        )

@router.post("/translate-batch", response_model=BatchTranslateResponse)
async def translate_batch(request: BatchTranslateRequest):
    """
    Translate multiple texts in batch
    """
    try:
        if request.target_language.lower() not in ['telugu', 'hindi']:
            raise HTTPException(
                status_code=400,
                detail="Supported languages: telugu, hindi"
            )
        
        translations = await translation_service.translate_batch(
            request.texts,
            request.target_language
        )
        
        return BatchTranslateResponse(
            translations=translations,
            language=request.target_language
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch translation failed: {str(e)}"
        )

@router.get("/languages")
async def get_supported_languages():
    """
    Get list of supported languages
    """
    return {
        "languages": [
            {"code": "en", "name": "English", "native": "English"},
            {"code": "te", "name": "Telugu", "native": "తెలుగు"},
            {"code": "hi", "name": "Hindi", "native": "हिंदी"}
        ]
    }
