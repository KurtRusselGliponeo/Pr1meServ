import { z } from 'zod';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const clientProfileImportSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, {
      message: 'Please choose a file to import.',
    })
    .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
      message: 'The file must be 5MB or smaller.',
    })
    .refine((file) => ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]), {
      message: 'Only CSV and XLSX files are supported.',
    }),
});

export type ClientProfileImportFormValues = z.infer<typeof clientProfileImportSchema>;
