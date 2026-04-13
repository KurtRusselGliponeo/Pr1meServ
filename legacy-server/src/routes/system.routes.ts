import { Router } from 'express';
import { getHealth, getMeta } from '../controllers/system.controller';

export const systemRouter = Router();

systemRouter.get('/health', getHealth);
systemRouter.get('/meta', getMeta);
