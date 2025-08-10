import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  logger.error(`Erreur ${req.method} ${req.url} : ${err.message}`);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
}
