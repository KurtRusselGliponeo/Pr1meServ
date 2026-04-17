'use client';
import * as React from 'react';
import { UploadCloud } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="floating-card mb-6 bg-white/72 p-6 sm:p-8 dark:bg-card/82">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Document Repository</h1>
        <p className="mt-3 text-sm text-muted-foreground">Secure AWS S3 pre-signed uploads.</p>
      </section>
      
      <div className="floating-card flex flex-col items-center justify-center p-12 border-dashed border-2 border-brand/20 bg-brand/5 cursor-pointer">
        <UploadCloud className="h-12 w-12 text-brand/50 mb-4" />
        <p className="text-lg font-semibold">Drop PDF forms here to upload securely to S3</p>
        <p className="text-sm text-muted-foreground mt-2">Uploading handles auth implicitly via pre-signed signed links</p>
      </div>
    </div>
  );
}
