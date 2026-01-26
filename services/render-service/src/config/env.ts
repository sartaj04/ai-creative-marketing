/**
 * Environment configuration with validation
 * Supports separate credentials for S3 and Bedrock
 */
import { config } from 'dotenv';

// Load environment variables
config();

export const env = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),

    // AWS S3 Credentials
    // Falls back to generic AWS_* if specific S3 keys not provided
    s3: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
        bucket: process.env.AWS_S3_BUCKET || 'pixo-assets',
        region: process.env.AWS_S3_REGION || 'ap-south-1',
        cloudfrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
    },

    // AWS Bedrock Credentials (Claude)
    // Falls back to generic AWS_* if specific Bedrock keys not provided
    bedrock: {
        accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
        region: process.env.AWS_BEDROCK_REGION || 'us-east-1',
        modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
    },

    // Unsplash
    unsplash: {
        appId: process.env.UNSPLASH_APP_ID || '',
        accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
        secretKey: process.env.UNSPLASH_SECRET_KEY || '',
    },
} as const;

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
    const warnings: string[] = [];

    // Check S3 credentials
    if (!env.s3.accessKeyId || !env.s3.secretAccessKey) {
        warnings.push('S3 credentials missing - uploads will fail');
    }

    // Check Bedrock credentials (optional - just for /analyze)
    if (!env.bedrock.accessKeyId || !env.bedrock.secretAccessKey) {
        warnings.push('Bedrock credentials missing - /analyze endpoint will not work');
    }

    // Check Unsplash (optional)
    if (!env.unsplash.accessKey) {
        warnings.push('Unsplash key missing - /unsplash/search will not work');
    }

    if (warnings.length > 0) {
        console.warn('⚠️  Configuration warnings:');
        warnings.forEach((w) => console.warn(`   - ${w}`));
    }
}
