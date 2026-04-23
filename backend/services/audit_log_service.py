from datetime import datetime, timezone
from typing import Optional, Dict, List
from models.audit_log import AuditLog, AuditLogCreate

class AuditLogService:
    def __init__(self, db):
        self.db = db
        self.collection = db.audit_logs
    
    async def log(self, 
                  auditable_type: str,
                  auditable_id: str,
                  event: str,
                  module: str,
                  user_id: Optional[str] = None,
                  old_values: Optional[Dict] = None,
                  new_values: Optional[Dict] = None,
                  tenant_id: Optional[str] = None,
                  project_id: Optional[str] = None,
                  ip_address: Optional[str] = None,
                  user_agent: Optional[str] = None) -> AuditLog:
        """Create an audit log entry"""
        
        # Calculate changed fields
        changed_fields = []
        if old_values and new_values:
            changed_fields = [k for k in new_values.keys() if old_values.get(k) != new_values.get(k)]
        
        # Generate human-readable description
        description = self._generate_description(auditable_type, event, changed_fields)
        
        audit_log = AuditLog(
            auditable_type=auditable_type,
            auditable_id=auditable_id,
            user_id=user_id,
            event=event,
            module=module,
            old_values=old_values,
            new_values=new_values,
            changed_fields=changed_fields,
            tenant_id=tenant_id,
            project_id=project_id,
            ip_address=ip_address,
            user_agent=user_agent,
            description=description
        )
        
        doc = audit_log.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await self.collection.insert_one(doc)
        return audit_log
    
    def _generate_description(self, auditable_type: str, event: str, changed_fields: List[str]) -> str:
        """Generate human-readable description"""
        if event == 'created':
            return f"Created new {auditable_type}"
        elif event == 'updated':
            if changed_fields:
                fields_str = ', '.join(changed_fields)
                return f"Updated {auditable_type}: {fields_str}"
            return f"Updated {auditable_type}"
        elif event == 'deleted':
            return f"Deleted {auditable_type}"
        elif event == 'restored':
            return f"Restored {auditable_type}"
        else:
            return f"{event.capitalize()} {auditable_type}"
    
    async def get_logs(self, 
                       auditable_type: Optional[str] = None,
                       auditable_id: Optional[str] = None,
                       tenant_id: Optional[str] = None,
                       project_id: Optional[str] = None,
                       module: Optional[str] = None,
                       limit: int = 100) -> List[AuditLog]:
        """Get audit logs with filters"""
        query = {}
        if auditable_type:
            query['auditable_type'] = auditable_type
        if auditable_id:
            query['auditable_id'] = auditable_id
        if tenant_id:
            query['tenant_id'] = tenant_id
        if project_id:
            query['project_id'] = project_id
        if module:
            query['module'] = module
        
        logs = await self.collection.find(query, {"_id": 0}).sort('created_at', -1).limit(limit).to_list(limit)
        
        # Convert ISO string timestamps back to datetime
        for log in logs:
            if isinstance(log['created_at'], str):
                log['created_at'] = datetime.fromisoformat(log['created_at'])
        
        return [AuditLog(**log) for log in logs]
