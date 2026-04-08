import type { Request, Response } from 'express';
import { env } from '../config/env';
import { supabase } from '../lib/supabase';

export const getHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend starter is running.',
    timestamp: new Date().toISOString(),
  });
};

export const getMeta = (_req: Request, res: Response) => {
  res.status(200).json({
    appName: 'Client Reassignment System API',
    environment: env.nodeEnv,
    apiVersion: 'v1',
    supabaseConfigured: Boolean(supabase),
  });
};
