import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.database import async_session_maker

async def check_db():
    async with async_session_maker() as db:
        print("Checking draft_format enum labels:")
        result = await db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'draft_format'"))
        for row in result:
            print(f"  {row[0]}")
            
        print("\nChecking draft_action enum labels:")
        result = await db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'draft_action'"))
        for row in result:
            print(f"  {row[0]}")

        print("\nChecking distinct format values in drafts table:")
        try:
            result = await db.execute(text("SELECT distinct format FROM drafts"))
            for row in result:
                print(f"  '{row[0]}'")
        except Exception as e:
            print(f"  Error querying drafts: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
