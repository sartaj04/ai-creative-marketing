import asyncio
import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.tasks.content_agency import run_content_agency_task

if __name__ == "__main__":
    profile_id = "889b487d-20d0-4fa3-9b2d-15987298b312"
    print(f"Triggering content agency task for profile {profile_id}...")
    try:
        # We need to run this in an event loop since the task function calls async code
        # But wait, run_content_agency_task is not async, it wraps async code.
        # Let's check app/tasks/content_agency.py to be sure.
        # It calls asyncio.run(_run_content_agency(profile_id))
        
        result = run_content_agency_task(profile_id)
        print(f"Task result: {result}")
    except Exception as e:
        print(f"Error triggering task: {e}")
