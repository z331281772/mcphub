import express, { Request, Response, NextFunction } from 'express';
import path from 'path';

export const errorHandler = (
  err: Error, 
  _req: Request, 
  res: Response, 
  _next: NextFunction
): void => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export const initMiddlewares = (app: express.Application): void => {
  app.use(express.static('public'));

  app.use((req, res, next) => {
    if (req.path !== '/sse' && req.path !== '/messages') {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  app.use(errorHandler);
};
