/**
 * Pixo Render Service
 * Node.js Express service for template rendering and AI analysis
 */
import express from 'express';
import cors from 'cors';
import { env, validateEnv } from './config/env.js';
import { logger } from './utils/logger.js';

// Import routes
import analyzeRouter from './routes/analyze.js';
import analyzeIterativeRouter from './routes/analyze-iterative.js';
import renderRouter from './routes/render.js';
import unsplashRouter from './routes/unsplash.js';

// Validate environment
validateEnv();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
        });
    });
    next();
});

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'pixo-render-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use('/analyze', analyzeRouter);
app.use('/analyze-iterative', analyzeIterativeRouter);
app.use('/render', renderRouter);
app.use('/unsplash', unsplashRouter);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
    });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({
        success: false,
        error: env.nodeEnv === 'development' ? err.message : 'Internal server error',
    });
});

// Start server
const PORT = env.port;
app.listen(PORT, () => {
    logger.info(`🚀 Pixo Render Service running on port ${PORT}`);
    logger.info(`Environment: ${env.nodeEnv}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Test render: http://localhost:${PORT}/render/test`);
});

export default app;
