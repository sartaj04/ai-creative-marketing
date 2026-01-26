/**
 * AWS S3 Storage Service
 * Handles uploading rendered images to S3
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Initialize S3 client with S3-specific credentials
const s3Client = new S3Client({
    region: env.s3.region,
    credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
    },
});

export interface UploadResult {
    url: string;
    key: string;
}

/**
 * Upload image buffer to S3
 */
export async function uploadToS3(
    buffer: Buffer,
    options: {
        key?: string;
        contentType?: string;
        prefix?: string;
    } = {}
): Promise<UploadResult> {
    const {
        contentType = 'image/png',
        prefix = 'renders',
    } = options;

    // Generate key if not provided
    const key = options.key || `${prefix}/${uuidv4()}.png`;

    logger.info('Uploading to S3', { bucket: env.s3.bucket, key });

    try {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: env.s3.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                CacheControl: 'max-age=31536000', // 1 year
                ACL: 'public-read',
            })
        );

        // Return CloudFront URL if configured, otherwise S3 URL
        const url = env.s3.cloudfrontDomain
            ? `https://${env.s3.cloudfrontDomain}/${key}`
            : `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${key}`;

        logger.info('Upload successful', { url });

        return { url, key };
    } catch (error) {
        logger.error('Failed to upload to S3', error);
        throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Upload rendered template image
 */
export async function uploadRenderedImage(
    buffer: Buffer,
    templateId?: string
): Promise<UploadResult> {
    const prefix = templateId
        ? `templates/${templateId}/renders`
        : 'renders';

    return uploadToS3(buffer, { prefix });
}

/**
 * Upload dummy render for QA validation
 */
export async function uploadDummyRender(
    buffer: Buffer,
    templateId: string
): Promise<UploadResult> {
    const key = `templates/${templateId}/dummy_render/${uuidv4()}.png`;
    return uploadToS3(buffer, { key });
}
