import { Router } from 'express';
import { systemRouter } from './system.routes';

export const apiRouter = Router();

apiRouter.use('/', systemRouter);
