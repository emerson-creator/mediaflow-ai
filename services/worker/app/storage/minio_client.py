import logging
from contextlib import asynccontextmanager

import aioboto3

from app.config import settings

logger = logging.getLogger(__name__)

_session = aioboto3.Session()


@asynccontextmanager
async def s3_client():
    async with _session.client(
        "s3",
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_root_user,
        aws_secret_access_key=settings.minio_root_password,
        region_name="us-east-1",
    ) as client:
        yield client


async def download_object(bucket: str, object_key: str, dest_path: str) -> None:
    logger.info(f"Downloading s3://{bucket}/{object_key} -> {dest_path}")
    async with s3_client() as client:
        await client.download_file(bucket, object_key, dest_path)


async def upload_object(bucket: str, object_key: str, src_path: str) -> None:
    logger.info(f"Uploading {src_path} -> s3://{bucket}/{object_key}")
    async with s3_client() as client:
        await client.upload_file(src_path, bucket, object_key)