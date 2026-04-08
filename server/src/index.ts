import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 1. Load environment variables
dotenv.config();

// 2. Initialize Supabase Client (Define this BEFORE using it!)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROUTES ---

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'Server is healthy!' });
});

// Database Connection Test Route
app.get('/api/test-db', async (req: Request, res: Response) => {
  // The 'await' is only allowed INSIDE this async function
  const { data, error } = await supabase.from('clients').select('*');

  if (error) {
    return res.status(400).json({ 
      status: 'FAILED', 
      message: 'Database connection failed.', 
      details: error 
    });
  }

  res.status(200).json({ 
    status: 'SUCCESS', 
    message: 'Successfully connected to Supabase!',
    data 
  });
});

// --- START SERVER ---
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});