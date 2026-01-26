# Pixo Render Service

Node.js Express service for template rendering and AI analysis.

## Features

- **POST /analyze** - Upload image, Claude (AWS Bedrock) generates Satori template JSON
- **POST /render** - Render Satori template to PNG, upload to S3
- **GET /unsplash/search** - Search background images from Unsplash

## Tech Stack

- Express.js + TypeScript
- Satori + @resvg/resvg-js (SVG-to-PNG rendering)
- AWS SDK (Bedrock Runtime, S3)
- unsplash-js

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_S3_BUCKET` - S3 bucket for uploads

Optional:
- `UNSPLASH_ACCESS_KEY` - For background image search
- `AWS_BEDROCK_REGION` - For image analysis with Claude

### 3. Run Development Server

```bash
npm run dev
```

The service will start on `http://localhost:3001`

### 4. Test the Service

Visit `http://localhost:3001/render/test` to see a test render.

## API Endpoints

### POST /analyze

Upload an image to generate template JSON using Claude.

```bash
curl -X POST http://localhost:3001/analyze \
  -F "image=@path/to/image.png" \
  -F "width=1080" \
  -F "height=1080"
```

### POST /render

Render template JSON to PNG and upload to S3.

```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -d '{
    "template": {
      "type": "div",
      "props": {
        "style": {
          "display": "flex",
          "width": "100%",
          "height": "100%",
          "backgroundColor": "#1a1a2e"
        }
      },
      "children": []
    },
    "width": 1080,
    "height": 1080
  }'
```

### POST /render/preview

Render template without uploading to S3 (returns base64).

### GET /render/test

Returns a test PNG to verify rendering works.

### GET /unsplash/search

Search for background images.

```bash
curl "http://localhost:3001/unsplash/search?query=abstract+background&perPage=5"
```

## Docker

### Build

```bash
docker build -t pixo-render-service .
```

### Run

```bash
docker run -p 3001:3001 \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  -e AWS_S3_BUCKET=pixo-assets \
  pixo-render-service
```

## Integration with Python Backend

The Python FastAPI backend can call this service:

```python
import httpx

async def render_template(template_json: dict, width: int, height: int) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://render-service:3001/render",
            json={"template": template_json, "width": width, "height": height}
        )
        return response.json()["url"]
```

## License

Proprietary - Pixo
