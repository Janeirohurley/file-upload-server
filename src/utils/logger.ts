// src/utils/logger.ts

import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ level, message, timestamp }) => `[${level.toUpperCase()}] ${timestamp} - ${message}`)
  ),
  transports: [
    new transports.Console(), // Affiche dans le terminal
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // erreurs uniquement
    new transports.File({ filename: 'logs/combined.log' }) // tout
  ]
});
