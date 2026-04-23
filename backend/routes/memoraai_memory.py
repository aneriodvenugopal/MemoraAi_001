"""MemoraAI Business Memory AI Routes"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from services.memory_ai_service import BusinessMemoryAI
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/memory", tags=["memoraai-memory"])


def get_db(request: Request):
    return request.app.state.db


@router.get("/customer/{phone}")
async def get_customer_memory(phone: str, request: Request):
    """Get all memories for a customer"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    memory_ai = BusinessMemoryAI(db)
    memories = await memory_ai.recall_memories(tenant_id, phone, limit=50)
    context = await memory_ai.build_customer_context(tenant_id, phone)

    return {"memories": memories, "context": context, "count": len(memories)}


@router.post("/customer/{phone}/add")
async def add_customer_memory(phone: str, request: Request):
    """Manually add a memory for a customer"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    memory_ai = BusinessMemoryAI(db)
    memory = await memory_ai.store_memory(
        tenant_id=tenant_id,
        customer_phone=phone,
        memory_type=body.get("memory_type", "note"),
        content=body.get("content", ""),
        metadata=body.get("metadata", {}),
    )
    return {"message": "Memory added", "memory": memory}


@router.delete("/customer/{phone}")
async def clear_customer_memories(phone: str, request: Request):
    """Clear all memories for a customer"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    result = await db.business_memories.delete_many(
        {"tenant_id": tenant_id, "customer_phone": {"$regex": phone[-10:]}}
    )
    return {"message": f"Cleared {result.deleted_count} memories"}


@router.get("/stats")
async def memory_stats(request: Request):
    """Get memory statistics for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    total = await db.business_memories.count_documents({"tenant_id": tenant_id})

    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$memory_type", "count": {"$sum": 1}}},
    ]
    type_counts = {}
    async for doc in db.business_memories.aggregate(pipeline):
        type_counts[doc["_id"]] = doc["count"]

    unique_customers = await db.business_memories.distinct(
        "customer_phone", {"tenant_id": tenant_id}
    )

    return {
        "total_memories": total,
        "by_type": type_counts,
        "unique_customers": len(unique_customers),
    }
