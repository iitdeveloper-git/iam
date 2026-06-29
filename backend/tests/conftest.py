"""conftest.py — set env vars needed before iitd_iam modules are imported."""
import os

# Must be set before any iitd_iam import that triggers get_settings() at module level
os.environ.setdefault("IAM_DATABASE_URL", "postgresql://iam:iam@localhost:5432/iam")

from sqlalchemy.orm import DeclarativeBase  # noqa: E402
class Base(DeclarativeBase):
    pass

import iitd_iam.database as _db_module  # noqa: E402
_db_module.Base = Base  # type: ignore
