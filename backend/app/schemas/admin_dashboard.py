"""
Pydantic schemas for admin dashboard statistics.
"""
from pydantic import BaseModel
from typing import Dict, Any


class AdminStatsResponse(BaseModel):
    """Overall system statistics for admin dashboard."""
    total_templates: int
    pending_approval: int
    approved_templates: int
    total_users: int
    
    # Optional system health indicators
    system_status: Dict[str, str] = {
        "s3_connection": "Active",
        "playwright_renderer": "Healthy",
        "normalization_ai": "Operational"
    }
