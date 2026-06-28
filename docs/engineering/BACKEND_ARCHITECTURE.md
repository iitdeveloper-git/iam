# Backend Architecture

The backend uses FastAPI, Pydantic v2, SQLAlchemy 2 and Alembic. Domain logic should stay outside route handlers and external integrations should be isolated behind typed modules.

