"""
AWS S3 Storage Service.
"""
from typing import Optional
import io
import uuid

import boto3
from botocore.exceptions import ClientError

from app.config import settings


def get_s3_client():
    """Get configured S3 client."""
    return boto3.client(
        's3',
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_s3_region
    )


async def upload_image(
    buffer: bytes,
    user_id: str,
    filename: str
) -> str:
    """
    Upload an image to S3.
    
    Args:
        buffer: Image bytes
        user_id: User UUID for path organization
        filename: Filename to use
        
    Returns:
        CloudFront or S3 URL of the uploaded image
    """
    s3 = get_s3_client()
    
    # Create key with user_id prefix
    key = f"assets/{user_id}/{filename}"
    
    try:
        s3.upload_fileobj(
            io.BytesIO(buffer),
            settings.aws_s3_bucket,
            key,
            ExtraArgs={
                'ContentType': 'image/png',
                'CacheControl': 'max-age=31536000',  # 1 year
                'ACL': 'public-read'
            }
        )
        
        # Return CloudFront URL if configured, otherwise S3 URL
        if settings.aws_cloudfront_domain:
            return f"https://{settings.aws_cloudfront_domain}/{key}"
        else:
            return f"https://{settings.aws_s3_bucket}.s3.{settings.aws_s3_region}.amazonaws.com/{key}"
            
    except ClientError as e:
        raise Exception(f"Failed to upload to S3: {str(e)}")


async def generate_download_link(
    asset_ids: list[str],
    user_id: str
) -> str:
    """
    Create a ZIP file with multiple assets and return presigned URL.
    
    Args:
        asset_ids: List of asset UUIDs to include
        user_id: User UUID
        
    Returns:
        Presigned URL for downloading the ZIP (1 hour expiry)
    """
    import zipfile
    from io import BytesIO
    
    s3 = get_s3_client()
    
    # Create in-memory ZIP file
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for asset_id in asset_ids:
            # Get asset from database and download from S3
            # This is a placeholder - actual implementation would:
            # 1. Query database for asset image_url
            # 2. Download image from S3
            # 3. Add to ZIP
            pass
    
    zip_buffer.seek(0)
    
    # Upload ZIP to S3
    zip_key = f"downloads/{user_id}/{uuid.uuid4()}.zip"
    
    s3.upload_fileobj(
        zip_buffer,
        settings.aws_s3_bucket,
        zip_key,
        ExtraArgs={
            'ContentType': 'application/zip'
        }
    )
    
    # Generate presigned URL (1 hour expiry)
    presigned_url = s3.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.aws_s3_bucket,
            'Key': zip_key
        },
        ExpiresIn=3600
    )
    
    return presigned_url


async def delete_image(key: str) -> bool:
    """
    Delete an image from S3.
    
    Args:
        key: S3 object key
        
    Returns:
        True if deleted successfully
    """
    s3 = get_s3_client()
    
    try:
        s3.delete_object(
            Bucket=settings.aws_s3_bucket,
            Key=key
        )
        return True
    except ClientError:
        return False


# === TEMPLATE ASSET FUNCTIONS ===

async def upload_template_asset(
    buffer: bytes,
    template_id: str,
    filename: str,
    asset_type: str = "source"
) -> str:
    """
    Upload a template asset to S3.
    
    Args:
        buffer: File bytes
        template_id: Template UUID for path organization
        filename: Filename to use
        asset_type: Type of asset - "source", "preview", "dummy_render"
        
    Returns:
        CloudFront or S3 URL of the uploaded asset
    """
    s3 = get_s3_client()
    
    # Create key with template_id prefix and asset type
    key = f"templates/{template_id}/{asset_type}/{filename}"
    
    # Determine content type
    content_type = "image/png"
    if filename.endswith(".css"):
        content_type = "text/css"
    elif filename.endswith(".html"):
        content_type = "text/html"
    elif filename.endswith(".json"):
        content_type = "application/json"
    elif filename.endswith(".jpg") or filename.endswith(".jpeg"):
        content_type = "image/jpeg"
    elif filename.endswith(".svg"):
        content_type = "image/svg+xml"
    elif filename.endswith(".mp4"):
        content_type = "video/mp4"
    
    try:
        s3.upload_fileobj(
            io.BytesIO(buffer),
            settings.aws_s3_bucket,
            key,
            ExtraArgs={
                'ContentType': content_type,
                'CacheControl': 'max-age=31536000',  # 1 year
                'ACL': 'public-read'
            }
        )
        
        # Return CloudFront URL if configured, otherwise S3 URL
        if settings.aws_cloudfront_domain:
            return f"https://{settings.aws_cloudfront_domain}/{key}"
        else:
            return f"https://{settings.aws_s3_bucket}.s3.{settings.aws_s3_region}.amazonaws.com/{key}"
            
    except ClientError as e:
        raise Exception(f"Failed to upload template asset to S3: {str(e)}")


async def upload_template_preview(
    buffer: bytes,
    template_id: str,
    aspect_ratio: str = "1_1"
) -> str:
    """
    Upload a template preview render to S3.
    
    Args:
        buffer: PNG image bytes
        template_id: Template UUID
        aspect_ratio: Aspect ratio string (e.g., "1_1", "9_16")
        
    Returns:
        URL of the uploaded preview
    """
    filename = f"preview_{aspect_ratio}.png"
    return await upload_template_asset(
        buffer=buffer,
        template_id=template_id,
        filename=filename,
        asset_type="preview"
    )


async def list_template_assets(template_id: str) -> list:
    """
    List all assets for a template.
    
    Args:
        template_id: Template UUID
        
    Returns:
        List of asset keys
    """
    s3 = get_s3_client()
    
    prefix = f"templates/{template_id}/"
    
    try:
        response = s3.list_objects_v2(
            Bucket=settings.aws_s3_bucket,
            Prefix=prefix
        )
        
        assets = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            assets.append({
                'key': key,
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat(),
                'url': f"https://{settings.aws_s3_bucket}.s3.{settings.aws_s3_region}.amazonaws.com/{key}"
            })
        
        return assets
        
    except ClientError:
        return []


async def delete_template_assets(template_id: str) -> bool:
    """
    Delete all assets for a template.
    
    Args:
        template_id: Template UUID
        
    Returns:
        True if deleted successfully
    """
    s3 = get_s3_client()
    
    prefix = f"templates/{template_id}/"
    
    try:
        # List all objects with prefix
        response = s3.list_objects_v2(
            Bucket=settings.aws_s3_bucket,
            Prefix=prefix
        )
        
        # Delete each object
        for obj in response.get('Contents', []):
            s3.delete_object(
                Bucket=settings.aws_s3_bucket,
                Key=obj['Key']
            )
        
        return True
        
    except ClientError:
        return False

