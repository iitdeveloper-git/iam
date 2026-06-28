from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class CurrentPrincipal:
    subject: str
    issuer: str
    email: str | None = None
    user_id: UUID | None = None
    roles: set[str] = field(default_factory=lambda: {"user"})
    permissions: set[str] = field(default_factory=set)

