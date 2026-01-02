"""
BrandScale AI - Celery Tasks
Background job definitions for scraping, generation, and rendering.
"""
import asyncio
from typing import Any, Dict, List, Optional

from celery import shared_task, current_task
from loguru import logger

from app.workers.celery_app import celery_app


def run_async(coro):
    """Helper to run async code in sync Celery tasks."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def update_progress(progress: int, message: str):
    """Update task progress for tracking."""
    current_task.update_state(
        state="PROGRESS",
        meta={"progress": progress, "message": message}
    )


@celery_app.task(
    bind=True,
    name="app.workers.tasks.scrape_job",
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
)
def scrape_job(
    self,
    url: str,
    profile_type: str,
    user_id: int,
    profile_id: int
) -> Dict[str, Any]:
    """
    Background job for web scraping.
    
    Args:
        url: Website URL to scrape
        profile_type: Type of profile (ecommerce/saas/personal)
        user_id: User ID
        profile_id: Profile ID to update
    
    Returns:
        Dict with brand_assets and voice_profile
    """
    logger.info(f"Starting scrape job for {url} (profile: {profile_id})")
    
    async def _scrape():
        from app.config import ProfileType
        from app.database import get_db_context
        from app.models.brand_profile import BrandProfile
        from app.services.scraper import web_scraper
        from sqlalchemy import select
        
        try:
            update_progress(10, "Initializing scraper")
            
            # Convert string to enum
            ptype = ProfileType(profile_type)
            
            update_progress(20, "Fetching website")
            
            # Scrape the website
            result = await web_scraper.scrape(url, ptype)
            
            update_progress(70, "Processing brand assets")
            
            # Update the profile in database
            async with get_db_context() as db:
                stmt = select(BrandProfile).where(BrandProfile.id == profile_id)
                profile = (await db.execute(stmt)).scalar_one_or_none()
                
                if profile:
                    profile.brand_assets = result.get("brand_assets", {})
                    profile.voice_profile = result.get("voice_profile", {})
                    profile.scrape_status = "completed"
                    profile.scrape_error = None
                    await db.commit()
                    
                    update_progress(90, "Saving results")
                    logger.info(f"Scrape completed for profile {profile_id}")
            
            update_progress(100, "Complete")
            
            return {
                "success": True,
                "profile_id": profile_id,
                "brand_assets": result.get("brand_assets", {}),
                "voice_profile": result.get("voice_profile", {}),
            }
            
        except Exception as e:
            logger.error(f"Scrape job failed for {url}: {e}")
            
            # Update profile with error
            async with get_db_context() as db:
                stmt = select(BrandProfile).where(BrandProfile.id == profile_id)
                profile = (await db.execute(stmt)).scalar_one_or_none()
                
                if profile:
                    profile.scrape_status = "failed"
                    profile.scrape_error = str(e)
                    await db.commit()
            
            raise
    
    return run_async(_scrape())


@celery_app.task(
    bind=True,
    name="app.workers.tasks.generate_job",
    max_retries=3,
    default_retry_delay=120,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def generate_job(
    self,
    profile_id: int,
    user_id: int,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Background job for AI copy generation.
    
    Args:
        profile_id: Brand profile ID
        user_id: User ID
        config: Generation configuration
    
    Returns:
        Dict with generated copy variants and asset IDs
    """
    logger.info(f"Starting generation job for profile {profile_id}")
    
    async def _generate():
        from app.config import AspectRatio, Platform
        from app.database import get_db_context
        from app.models.brand_profile import BrandProfile
        from app.models.generated_asset import GeneratedAsset
        from app.models.template import Template
        from app.services.generator import copy_generator
        from app.services.renderer import template_renderer
        from sqlalchemy import select
        
        try:
            update_progress(5, "Loading brand profile")
            
            # Get brand profile
            async with get_db_context() as db:
                stmt = select(BrandProfile).where(BrandProfile.id == profile_id)
                profile = (await db.execute(stmt)).scalar_one_or_none()
                
                if not profile:
                    raise ValueError(f"Profile {profile_id} not found")
                
                brand_context = profile.get_brand_context()
                profile_type = profile.profile_type
            
            update_progress(15, "Generating copy variants")
            
            # Generate copy
            copy_variants = await copy_generator.generate(
                profile_type=profile_type,
                brand_context=brand_context,
                config=config
            )
            
            update_progress(40, f"Generated {len(copy_variants)} copy variants")
            
            # Get templates for rendering
            platforms = config.get("platforms", [Platform.INSTAGRAM_FEED.value])
            aspect_ratios = config.get("aspect_ratios", ["1:1"])
            template_ids = config.get("template_ids", [])
            
            async with get_db_context() as db:
                # Get templates
                if template_ids:
                    stmt = select(Template).where(
                        Template.id.in_(template_ids),
                        Template.is_active == True
                    )
                else:
                    stmt = select(Template).where(
                        Template.segment == profile_type,
                        Template.is_active == True
                    ).limit(5)
                
                templates = (await db.execute(stmt)).scalars().all()
                
                if not templates:
                    logger.warning("No templates found, returning copy only")
                    return {
                        "success": True,
                        "profile_id": profile_id,
                        "copy_variants": copy_variants,
                        "assets": [],
                    }
            
            update_progress(50, "Rendering assets")
            
            created_assets = []
            total_renders = len(copy_variants) * len(templates)
            rendered = 0
            
            async with get_db_context() as db:
                for template in templates:
                    for idx, copy in enumerate(copy_variants):
                        try:
                            # Create asset record
                            asset = GeneratedAsset(
                                user_id=user_id,
                                profile_id=profile_id,
                                template_id=template.id,
                                platform=Platform(platforms[0]) if platforms else Platform.INSTAGRAM_FEED,
                                aspect_ratio=aspect_ratios[0] if aspect_ratios else "1:1",
                                copy_text=copy,
                                status="processing",
                                generation_job_id=self.request.id,
                            )
                            db.add(asset)
                            await db.flush()
                            
                            # Prepare template data
                            template_data = {
                                "headline": copy.get("headline", ""),
                                "subheadline": copy.get("subheadline", ""),
                                "body": copy.get("body", ""),
                                "cta": copy.get("cta", "Shop Now"),
                                "logo": brand_context.get("logo"),
                                "brand_color": brand_context.get("colors", {}).get("primary", "#000000"),
                                "product_image": (brand_context.get("products", [{}])[0].get("image_url") 
                                                if brand_context.get("products") else None),
                            }
                            
                            # Render and upload
                            ratio = AspectRatio(aspect_ratios[0]) if aspect_ratios else AspectRatio.SQUARE
                            
                            url = await template_renderer.render_and_upload(
                                template_html=template.html_code,
                                template_css=template.css_code,
                                data=template_data,
                                aspect_ratio=ratio,
                                user_id=user_id,
                                profile_id=profile_id,
                                asset_id=asset.id
                            )
                            
                            # Update asset
                            asset.image_url = url
                            asset.status = "completed" if url else "failed"
                            
                            created_assets.append({
                                "asset_id": asset.id,
                                "image_url": url,
                                "copy": copy,
                            })
                            
                            rendered += 1
                            progress = 50 + int((rendered / total_renders) * 45)
                            update_progress(progress, f"Rendered {rendered}/{total_renders} assets")
                            
                        except Exception as e:
                            logger.error(f"Failed to render asset: {e}")
                            continue
                
                await db.commit()
            
            update_progress(100, "Complete")
            
            return {
                "success": True,
                "profile_id": profile_id,
                "copy_variants": copy_variants,
                "assets": created_assets,
                "total_assets": len(created_assets),
            }
            
        except Exception as e:
            logger.error(f"Generation job failed: {e}")
            raise
    
    return run_async(_generate())


@celery_app.task(
    bind=True,
    name="app.workers.tasks.render_job",
    max_retries=3,
    default_retry_delay=30,
)
def render_job(
    self,
    template_id: int,
    data: Dict[str, Any],
    aspect_ratios: List[str],
    user_id: int,
    profile_id: int,
    asset_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Background job for template rendering.
    
    Args:
        template_id: Template ID to render
        data: Template data dictionary
        aspect_ratios: List of aspect ratios to render
        user_id: User ID
        profile_id: Profile ID
        asset_id: Optional existing asset ID to update
    
    Returns:
        Dict with rendered URLs per aspect ratio
    """
    logger.info(f"Starting render job for template {template_id}")
    
    async def _render():
        from app.config import AspectRatio
        from app.database import get_db_context
        from app.models.generated_asset import GeneratedAsset
        from app.models.template import Template
        from app.services.renderer import template_renderer
        from sqlalchemy import select
        
        try:
            update_progress(10, "Loading template")
            
            # Get template
            async with get_db_context() as db:
                stmt = select(Template).where(Template.id == template_id)
                template = (await db.execute(stmt)).scalar_one_or_none()
                
                if not template:
                    raise ValueError(f"Template {template_id} not found")
            
            update_progress(20, "Rendering images")
            
            results = {}
            total = len(aspect_ratios)
            
            for idx, ratio_str in enumerate(aspect_ratios):
                try:
                    ratio = AspectRatio(ratio_str)
                    
                    # Create or get asset ID
                    current_asset_id = asset_id
                    if not current_asset_id:
                        async with get_db_context() as db:
                            asset = GeneratedAsset(
                                user_id=user_id,
                                profile_id=profile_id,
                                template_id=template_id,
                                aspect_ratio=ratio_str,
                                copy_text=data,
                                status="processing",
                            )
                            db.add(asset)
                            await db.flush()
                            current_asset_id = asset.id
                            await db.commit()
                    
                    # Render and upload
                    url = await template_renderer.render_and_upload(
                        template_html=template.html_code,
                        template_css=template.css_code,
                        data=data,
                        aspect_ratio=ratio,
                        user_id=user_id,
                        profile_id=profile_id,
                        asset_id=current_asset_id
                    )
                    
                    results[ratio_str] = {
                        "url": url,
                        "asset_id": current_asset_id,
                    }
                    
                    # Update asset status
                    async with get_db_context() as db:
                        stmt = select(GeneratedAsset).where(
                            GeneratedAsset.id == current_asset_id
                        )
                        asset = (await db.execute(stmt)).scalar_one_or_none()
                        if asset:
                            asset.image_url = url
                            asset.status = "completed" if url else "failed"
                            await db.commit()
                    
                except Exception as e:
                    logger.error(f"Failed to render {ratio_str}: {e}")
                    results[ratio_str] = {"error": str(e)}
                
                progress = 20 + int(((idx + 1) / total) * 75)
                update_progress(progress, f"Rendered {idx + 1}/{total}")
            
            update_progress(100, "Complete")
            
            return {
                "success": True,
                "template_id": template_id,
                "results": results,
            }
            
        except Exception as e:
            logger.error(f"Render job failed: {e}")
            raise
    
    return run_async(_render())


@celery_app.task(name="app.workers.tasks.cleanup_job")
def cleanup_job():
    """
    Periodic cleanup task for expired data.
    Can be scheduled with Celery Beat.
    """
    logger.info("Running cleanup job")
    
    async def _cleanup():
        from datetime import datetime, timedelta
        from app.database import get_db_context
        from app.models.generated_asset import GeneratedAsset
        from app.utils.s3 import s3_client
        from sqlalchemy import select, delete
        
        # Clean up failed assets older than 7 days
        cutoff = datetime.utcnow() - timedelta(days=7)
        
        async with get_db_context() as db:
            # Find old failed assets
            stmt = select(GeneratedAsset).where(
                GeneratedAsset.status == "failed",
                GeneratedAsset.created_at < cutoff
            )
            assets = (await db.execute(stmt)).scalars().all()
            
            deleted_count = 0
            for asset in assets:
                try:
                    # Delete from S3 if exists
                    if asset.image_url:
                        await s3_client.delete_object(asset.get_s3_key())
                    
                    await db.delete(asset)
                    deleted_count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete asset {asset.id}: {e}")
            
            await db.commit()
            
            logger.info(f"Cleanup complete: deleted {deleted_count} failed assets")
            
            return {"deleted": deleted_count}
    
    return run_async(_cleanup())
