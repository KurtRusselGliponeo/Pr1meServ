'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileSpreadsheet, LoaderCircle, UploadCloud } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUploadNapFile } from '../hooks/use-upload-nap-file';

const allowedNapMimeTypes = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const napUploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Attach an .xlsx or .xls file before submitting.' })
    .refine((file) => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    }, 'Only Excel .xlsx or .xls files are accepted.')
    .refine((file) => {
      if (!file.type) {
        return true;
      }

      return allowedNapMimeTypes.has(file.type);
    }, 'PDFs, images, CSVs, and other file types are blocked for NAP imports.'),
});

type NapUploadFormValues = z.infer<typeof napUploadSchema>;

export function NapUploadPortal() {
  const [isDragging, setIsDragging] = React.useState(false);
  const uploadMutation = useUploadNapFile();
  const form = useForm<NapUploadFormValues>({
    resolver: zodResolver(napUploadSchema),
    defaultValues: {
      file: undefined,
    },
  });

  function assignFile(file: File | undefined) {
    if (!file) {
      return;
    }

    form.setValue('file', file, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  }

  return (
    <Card className="border border-brand/20 bg-white/72 dark:bg-card/82">
      <CardHeader className="bg-brand-gradient-soft">
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-white/85 p-3 text-brand shadow-soft">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <CardDescription>Admin NAP import</CardDescription>
            <CardTitle className="mt-1">Send NAP data into the processing queue</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await uploadMutation.mutateAsync(values.file);
                toast.success('NAP file has been sent to the processing queue.');
                form.reset();
              } catch {
                // Axios interceptor already surfaces the backend failure.
              }
            })}
          >
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>NAP spreadsheet</FormLabel>
                  <FormControl>
                    <label
                      className={cn(
                        'flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 py-8 text-center transition-all duration-200',
                        isDragging
                          ? 'border-brand bg-brand-gradient-soft shadow-float'
                          : 'border-brand/25 bg-background/70 hover:border-brand/45 hover:bg-brand-gradient-soft',
                      )}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                        assignFile(event.dataTransfer.files[0]);
                      }}
                    >
                      <FileSpreadsheet className="h-10 w-10 text-brand" />
                      <p className="mt-4 text-base font-semibold text-foreground">
                        Drop the NAP workbook here
                      </p>
                      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        Only Excel files are accepted. PDFs, images, and CSV files are blocked
                        immediately on the client.
                      </p>
                      <div className="mt-5 rounded-full border border-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-foreground">
                        {value ? value.name : 'Browse .xlsx or .xls'}
                      </div>
                      <input
                        {...field}
                        type="file"
                        accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          onChange(file);
                        }}
                      />
                    </label>
                  </FormControl>
                  <FormDescription>
                    Queue uploads are validated before processing. Use the latest NAP workbook from
                    operations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="min-h-12 rounded-full" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Sending to queue
                </>
              ) : (
                'Upload NAP workbook'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
