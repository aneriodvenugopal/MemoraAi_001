"""
One-shot migration: backfill `whatsapp_tenant_mapping` from existing
`waba_configs`. Safe to run repeatedly (upserts, no destructive ops).

Run:
    cd /app/backend && python scripts/backfill_waba_mapping.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # Ensure indexes
    try:
        await db.whatsapp_tenant_mapping.create_index("phone_number_id", unique=True)
    except Exception as e:
        print(f"index create_index phone_number_id (mapping) note: {e}")
    try:
        await db.waba_configs.create_index("phone_number_id")
    except Exception as e:
        print(f"index create_index phone_number_id (waba_configs) note: {e}")

    upserts = 0
    skipped = 0
    cursor = db.waba_configs.find({}, {"_id": 0})
    async for cfg in cursor:
        pnid = cfg.get("phone_number_id")
        tid = cfg.get("tenant_id")
        if not pnid or not tid:
            skipped += 1
            continue
        await db.whatsapp_tenant_mapping.update_one(
            {"phone_number_id": pnid},
            {"$set": {
                "tenant_id": tid,
                "phone_number_id": pnid,
                "waba_id": cfg.get("waba_id", "") or "",
                "phone_number": cfg.get("phone_number", "") or "",
                "whatsapp_number": (cfg.get("phone_number") or "").lstrip("+"),
                "backfilled_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        upserts += 1
        print(f"  ✅ Mapped tenant={tid} ← pnid={pnid}")

    print(f"\nBackfill complete. upserted={upserts} skipped(no pnid/tenant)={skipped}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
