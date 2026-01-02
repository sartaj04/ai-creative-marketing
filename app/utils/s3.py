"""
BrandScale AI - AWS S3 Utilities
S3 upload, download, and presigned URL generation.
"""
import io
import os
from datetime import datetime
from typing import BinaryIO, List, Optional, Tuple
from urllib.parse import urljoin

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from loguru import logger

from app.config import settings


class S3Client:
    """
    AWS S3 client wrapper for asset storage.
    
    Folder structure: {user_id}/{profile_id}/{asset_id}.{extension}
    
    Usage:
        s3 = S3Client()
        url = await s3.upload_image(user_id=1, profile_id=2, asset_id=3, image_data=bytes)
        presigned_url = s3.get_presigned_url("1/2/3.png")
    """
    
    def __init__(self):
        """Initialize S3 client with configuration."""
        self.bucket = settings.aws_s3_bucket
        self.region = settings.aws_region
        self.cloudfront_domain = settings.aws_cloudfront_domain
        
        # Create boto3 client
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=self.region,
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "adaptive"}
            )
        )
    
    def _get_key(
        self,
        user_id: int,
        profile_id: int,
        asset_id: int,
        extension: str = "png"
    ) -> str:
        """Generate S3 object key."""
        return f"{user_id}/{profile_id}/{asset_id}.{extension}"
    
    def _get_public_url(self, key: str) -> str:
        """Get public URL for an object."""
        if self.cloudfront_domain:
            return f"https://{self.cloudfront_domain}/{key}"
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"
    
    async def upload_image(
        self,
        user_id: int,
        profile_id: int,
        asset_id: int,
        image_data: bytes,
        extension: str = "png",
        content_type: str = "image/png"
    ) -> str:
        """
        Upload an image to S3.
        
        Args:
            user_id: User ID
            profile_id: Brand profile ID
            asset_id: Asset ID
            image_data: Raw image bytes
            extension: File extension
            content_type: MIME type
        
        Returns:
            Public URL of uploaded image
        """
        key = self._get_key(user_id, profile_id, asset_id, extension)
        
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=image_data,
                ContentType=content_type,
                CacheControl="max-age=31536000",  # 1 year cache
                Metadata={
                    "user_id": str(user_id),
                    "profile_id": str(profile_id),
                    "asset_id": str(asset_id),
                    "uploaded_at": datetime.utcnow().isoformat(),
                }
            )
            
            logger.info(f"Uploaded image to S3: {key}")
            return self._get_public_url(key)
            
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise
    
    async def upload_file(
        self,
        key: str,
        file_data: BinaryIO,
        content_type: str = "application/octet-stream",
        metadata: Optional[dict] = None
    ) -> str:
        """
        Upload any file to S3.
        
        Args:
            key: S3 object key
            file_data: File-like object
            content_type: MIME type
            metadata: Optional metadata
        
        Returns:
            Public URL
        """
        try:
            extra_args = {
                "ContentType": content_type,
            }
            if metadata:
                extra_args["Metadata"] = {k: str(v) for k, v in metadata.items()}
            
            self.client.upload_fileobj(
                file_data,
                self.bucket,
                key,
                ExtraArgs=extra_args
            )
            
            logger.info(f"Uploaded file to S3: {key}")
            return self._get_public_url(key)
            
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {e}")
            raise
    
    async def download_image(self, key: str) -> bytes:
        """
        Download an image from S3.
        
        Args:
            key: S3 object key
        
        Returns:
            Raw image bytes
        """
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except ClientError as e:
            logger.error(f"Failed to download from S3: {e}")
            raise
    
    def get_presigned_url(
        self,
        key: str,
        expiration: int = 3600,
        method: str = "get_object"
    ) -> str:
        """
        Generate a presigned URL for temporary access.
        
        Args:
            key: S3 object key
            expiration: URL expiration in seconds
            method: S3 operation (get_object, put_object)
        
        Returns:
            Presigned URL string
        """
        try:
            url = self.client.generate_presigned_url(
                ClientMethod=method,
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise
    
    async def delete_object(self, key: str) -> bool:
        """
        Delete an object from S3.
        
        Args:
            key: S3 object key
        
        Returns:
            True if successful
        """
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Deleted object from S3: {key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False
    
    async def delete_user_assets(self, user_id: int) -> int:
        """
        Delete all assets for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            Number of objects deleted
        """
        try:
            # List all objects with user prefix
            paginator = self.client.get_paginator("list_objects_v2")
            pages = paginator.paginate(Bucket=self.bucket, Prefix=f"{user_id}/")
            
            deleted = 0
            for page in pages:
                if "Contents" in page:
                    objects = [{"Key": obj["Key"]} for obj in page["Contents"]]
                    if objects:
                        self.client.delete_objects(
                            Bucket=self.bucket,
                            Delete={"Objects": objects}
                        )
                        deleted += len(objects)
            
            logger.info(f"Deleted {deleted} objects for user {user_id}")
            return deleted
            
        except ClientError as e:
            logger.error(f"Failed to delete user assets: {e}")
            return 0
    
    async def list_objects(
        self,
        prefix: str,
        max_keys: int = 1000
    ) -> List[dict]:
        """
        List objects with a given prefix.
        
        Args:
            prefix: S3 key prefix
            max_keys: Maximum number of keys to return
        
        Returns:
            List of object metadata dicts
        """
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            objects = []
            for obj in response.get("Contents", []):
                objects.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"],
                    "url": self._get_public_url(obj["Key"]),
                })
            
            return objects
            
        except ClientError as e:
            logger.error(f"Failed to list objects: {e}")
            return []
    
    async def create_zip_archive(
        self,
        keys: List[str],
        archive_key: str
    ) -> str:
        """
        Create a ZIP archive of multiple objects.
        
        Args:
            keys: List of S3 object keys to include
            archive_key: Key for the resulting ZIP file
        
        Returns:
            Presigned URL for the ZIP archive
        """
        import zipfile
        
        try:
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for key in keys:
                    try:
                        data = await self.download_image(key)
                        filename = os.path.basename(key)
                        zf.writestr(filename, data)
                    except Exception as e:
                        logger.warning(f"Failed to add {key} to archive: {e}")
            
            zip_buffer.seek(0)
            
            await self.upload_file(
                key=archive_key,
                file_data=zip_buffer,
                content_type="application/zip",
                metadata={"type": "archive", "count": str(len(keys))}
            )
            
            # Return presigned URL (expires in 1 hour)
            return self.get_presigned_url(archive_key, expiration=3600)
            
        except Exception as e:
            logger.error(f"Failed to create ZIP archive: {e}")
            raise


# Global S3 client instance
s3_client = S3Client()
