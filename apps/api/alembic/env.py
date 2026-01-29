"""Alembic migration environment configuration."""
import asyncio
import os
from logging.config import fileConfig
from pathlib import Path

# Load .env file before importing settings
from dotenv import load_dotenv
# Look for .env file relative to this file (alembic/env.py -> apps/api/.env)
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"[Alembic] Loaded .env from: {env_path}")
else:
    # Try current directory and parent directories
    load_dotenv(override=True)
    print(f"[Alembic] Tried to load .env from current directory")

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.core.database import Base

# Import all models to ensure they're registered with Base
from app.models import (
    User,
    Profile,
    ProfileSource,
    IdentityGraph,
    StyleProfile,
    ExtractedDocument,
    Opportunity,
    Draft,
    DraftEvent,
    Schedule,
    Template,
    TemplateUsage,
    AgentRun,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override sqlalchemy.url with actual database URL
database_url = settings.DATABASE_URL
if not database_url:
    raise ValueError("DATABASE_URL not set in environment variables")

# Debug: print first 50 chars of URL (without password)
print(f"[Alembic] Using DATABASE_URL: {database_url.split('@')[0]}@...")

config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
