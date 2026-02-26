"""S3 storage service for media assets."""
import logging
import uuid
from io import BytesIO
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Abstracted storage service for uploading/managing media in S3."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy-initialize S3 client."""
        if self._client is None:
            self._client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION,
            )
        return self._client

    @property
    def bucket(self) -> str:
        return settings.AWS_S3_BUCKET

    def _generate_key(self, prefix: str, extension: str = "png") -> str:
        """Generate a unique S3 key."""
        return f"{prefix}/{uuid.uuid4().hex}.{extension}"

    async def upload_image(
        self,
        file_bytes: bytes,
        key: Optional[str] = None,
        content_type: str = "image/png",
        prefix: str = "media",
    ) -> tuple[str, str]:
        """Upload image bytes to S3.

        Args:
            file_bytes: Raw image bytes
            key: Optional specific S3 key. Auto-generated if None.
            content_type: MIME type of the image
            prefix: Key prefix for organization

        Returns:
            Tuple of (public_url, storage_key)
        """
        if key is None:
            ext = content_type.split("/")[-1] if "/" in content_type else "png"
            key = self._generate_key(prefix, ext)

        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
                CacheControl="public, max-age=31536000",
            )
            url = f"https://{self.bucket}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"
            logger.info(f"Uploaded image to S3: {key}")
            return url, key
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise

    async def upload_from_url(
        self,
        source_url: str,
        prefix: str = "media",
    ) -> tuple[str, str]:
        """Download an image from URL and upload to S3.

        Args:
            source_url: URL to download from
            prefix: Key prefix

        Returns:
            Tuple of (public_url, storage_key)
        """
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.get(source_url)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "image/png")

        return await self.upload_image(
            file_bytes=response.content,
            content_type=content_type,
            prefix=prefix,
        )

    async def delete_image(self, key: str) -> bool:
        """Delete an image from S3.

        Args:
            key: S3 object key

        Returns:
            True if deleted successfully
        """
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Deleted image from S3: {key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False

    async def delete_many(self, keys: list[str]) -> int:
        """Delete multiple images from S3 in a batch.

        Args:
            keys: List of S3 object keys

        Returns:
            Number of successfully deleted objects
        """
        if not keys:
            return 0

        try:
            response = self.client.delete_objects(
                Bucket=self.bucket,
                Delete={
                    "Objects": [{"Key": k} for k in keys],
                    "Quiet": True,
                },
            )
            errors = response.get("Errors", [])
            deleted = len(keys) - len(errors)
            if errors:
                logger.warning(f"Failed to delete {len(errors)} objects: {errors}")
            logger.info(f"Batch deleted {deleted}/{len(keys)} objects from S3")
            return deleted
        except ClientError as e:
            logger.error(f"Batch delete failed: {e}")
            return 0

    def generate_presigned_url(self, key: str, expiry: int = 3600, force_download: bool = False, filename: Optional[str] = None) -> str:
        """Generate a presigned URL for temporary access.

        Args:
            key: S3 object key
            expiry: URL expiry in seconds (default 1 hour)
            force_download: Whether to force the browser to download the file instead of displaying it inline
            filename: Override the downloaded filename (only if force_download=True)

        Returns:
            Presigned URL string
        """
        params = {"Bucket": self.bucket, "Key": key}
        
        if force_download:
            disposition = "attachment" 
            if filename:
                # Basic sanitization
                safe_filename = filename.replace('"', '\\"')
                disposition = f'attachment; filename="{safe_filename}"'
            params["ResponseContentDisposition"] = disposition

        return self.client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expiry,
        )


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Get or create the storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
