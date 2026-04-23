from datetime import datetime, timezone

def to_iso(dt: datetime) -> str:
    """Convert datetime to ISO string"""
    if dt:
        return dt.isoformat()
    return None

def from_iso(iso_str: str) -> datetime:
    """Convert ISO string to datetime"""
    if iso_str:
        return datetime.fromisoformat(iso_str)
    return None

def serialize_doc(doc: dict) -> dict:
    """Serialize document for MongoDB storage"""
    if not doc:
        return doc
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized

def deserialize_doc(doc: dict, datetime_fields: list = None) -> dict:
    """Deserialize document from MongoDB"""
    if not doc:
        return doc
    
    if datetime_fields is None:
        datetime_fields = ['created_at', 'updated_at', 'deleted_at', 'timestamp', 'otp_expires_at', 'last_login']
    
    for field in datetime_fields:
        if field in doc and isinstance(doc[field], str):
            doc[field] = datetime.fromisoformat(doc[field])
    
    return doc
