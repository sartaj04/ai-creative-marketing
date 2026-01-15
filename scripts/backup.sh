#!/bin/bash
# Pixo Backup Script
# Usage: ./backup.sh

set -e

BACKUP_DIR="/backups/pixo"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${BACKUP_S3_BUCKET:-pixo-backups}"

echo "🗄️ Starting Pixo backup at $TIMESTAMP..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
echo "📦 Backing up PostgreSQL..."
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U pixo pixo_db | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Redis backup (optional)
echo "📦 Backing up Redis..."
docker-compose -f docker-compose.prod.yml exec -T redis \
    redis-cli -a "$REDIS_PASSWORD" BGSAVE

# Upload to S3 if configured
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    echo "☁️ Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" "s3://$S3_BUCKET/database/"
    
    # Keep only last 30 days on S3
    aws s3 ls "s3://$S3_BUCKET/database/" | \
        awk '{print $4}' | \
        head -n -30 | \
        xargs -I {} aws s3 rm "s3://$S3_BUCKET/database/{}"
fi

# Cleanup old local backups (keep 7 days)
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "✅ Backup complete: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"
