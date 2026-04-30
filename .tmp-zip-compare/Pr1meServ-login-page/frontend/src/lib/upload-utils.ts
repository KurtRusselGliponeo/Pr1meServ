'use client';

import imageCompression from 'browser-image-compression';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserSupabaseClient: SupabaseClient | null = null;

function getSupabaseBrowserClient() {
  if (browserSupabaseClient) {
    return browserSupabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for uploads.',
    );
  }

  browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserSupabaseClient;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').toLowerCase();
}

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
    alwaysKeepResolution: true,
    fileType: file.type,
  });
}

export async function compressAndUploadImage({
  file,
  bucket,
  path,
  cacheControl = '3600',
  upsert = false,
}: {
  file: File;
  bucket: string;
  path: string;
  cacheControl?: string;
  upsert?: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const compressedFile = await compressImage(file);
  const normalizedPath = path
    .split('/')
    .filter(Boolean)
    .map((segment, index, segments) =>
      index === segments.length - 1 ? sanitizeFileName(segment) : segment,
    )
    .join('/');

  const { data, error } = await supabase.storage.from(bucket).upload(normalizedPath, compressedFile, {
    cacheControl,
    upsert,
    contentType: compressedFile.type || file.type,
  });

  if (error) {
    throw error;
  }

  return {
    data,
    path: normalizedPath,
    file: compressedFile,
  };
}
