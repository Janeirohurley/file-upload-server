import express from 'express';
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
import { swaggerSpec, swaggerUi } from './swagger';

dotenv.config();

const app = express();

const accessLogStream = fs.createWriteStream(path.join(__dirname, '../logs/access.log'), { flags: 'a' });

app.use(morgan('combined', { stream: accessLogStream }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(expressStatusMonitor());
}

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

app.use(errorHandler);

export default app;