"""conftest.py — set env vars needed before iitd_iam modules are imported."""
import os

# Must be set before any iitd_iam import that triggers get_settings() at module level
os.environ.setdefault("IAM_DATABASE_URL", "postgresql://iam:iam@localhost:5432/iam")
