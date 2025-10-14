import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import analyzeRouter from './routes/analyze.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Basic IP-based rate limiter to avoid abuse
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 200),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/analyze', analyzeRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
