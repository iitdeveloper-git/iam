import uuid
from typing import Any
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from iitd_iam.auth.identity import CurrentPrincipal
from iitd_iam.models import AuditEvent, User

async def log_audit_event(
    session: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    result: str = "success",
    principal: CurrentPrincipal | None = None,
    application_id: uuid.UUID | None = None,
    before_summary: dict[str, Any] | None = None,
    after_summary: dict[str, Any] | None = None,
    request: Request | None = None,
) -> AuditEvent:
    request_id = "unknown"
    source_ip = None
    user_agent = None
    
    if request:
        request_id = getattr(request.state, "request_id", "unknown")
        if request.client:
            source_ip = request.client.host
        user_agent = request.headers.get("user-agent")
        
    actor_type = "system"
    actor_user_id = None
    
    if principal:
        actor_type = "user"
        # Try to find the local database user record using the Keycloak user ID or email
        stmt = select(User).where(
            (User.keycloak_user_id == principal.subject) | 
            (User.identity_subject == principal.subject) |
            (User.email == principal.email)
        )
        actor_user = (await session.execute(stmt)).scalar_one_or_none()
        if actor_user:
            actor_user_id = actor_user.id
            
    event = AuditEvent(
        actor_type=actor_type,
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        application_id=application_id,
        request_id=request_id,
        source_ip=source_ip,
        user_agent=user_agent[:512] if user_agent else None,
        result=result,
        before_summary=before_summary,
        after_summary=after_summary,
    )
    session.add(event)
    return event
