
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import uploadRoutes from './routes/uploadRoutes';
import authRoutes from './routes/authRoutes';
import monitoringRoutes from './routes/monitoringRoutes'; // Nouvelle route
import { errorHandler } from './middlewares/errorHandler';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import expressStatusMonitor from 'express-status-monitor';
import { getSwaggerSpec, swaggerUi } from './swagger';
import expressWinston from 'express-winston';
import { format, transports } from 'winston';
import { requestMonitorMiddleware } from './utils/reqMonitor';

dotenv.config();

const app = express();

const accessLogStream = fs.createWriteStream(path.join(__dirname, '../logs/access.log'), { flags: 'a' });

app.use(morgan('combined', { stream: accessLogStream }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(requestMonitorMiddleware);
// Serve static files from uploads directory for public access
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(expressWinston.logger({
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/requests.log' })
  ],
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json()
  ),
  meta: true,
  msg: '{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  requestWhitelist: ['method', 'url', 'headers', 'query', 'body'],
  responseWhitelist: ['statusCode'],
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(expressStatusMonitor());
}

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use('/api-docs', swaggerUi.serve, (req: Request, res: Response, next: NextFunction) => {
  const protocol = req.protocol; // "http" ou "https"
  const host = req.get('host');  // ex: localhost:3000 ou api.monsite.com
  const baseUrl = process.env.API_BASE_URL || `${protocol}://${host}/api/v1`;

  const swaggerSpec = getSwaggerSpec(baseUrl);
  swaggerUi.setup(swaggerSpec)(req, res, next);
});

// Routes
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/monitoring', monitoringRoutes); // Ajout de la route

app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API');
});

if (process.env.NODE_ENV !== 'test') {
  app.get('/status', expressStatusMonitor()); // Route pour express-status-monitor
}

app.use(expressWinston.errorLogger({
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/errors.log' }),
  ],
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json()
  ),
}));

app.use(errorHandler);

export default app;