import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.status(200).json({
      message: 'Client Reassignment System API starter',
    });
  });

  app.use('/api/v1', apiRouter);

  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found.',
    });
  });

  return app;
};
