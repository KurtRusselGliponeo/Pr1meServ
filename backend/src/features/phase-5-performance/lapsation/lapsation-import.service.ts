import { z } from 'zod';
import * as XLSX from 'xlsx';
import { LapsationUploadJobPayloadSchema, type LapsationUploadJobPayload } from '@a1prime/schemas';

import { BusinessRuleError } from '@/lib/errors';
import { importValidationService } from '@/features/imports/import-validation.service';

const REQUIRED_HEADERS = [
  'Agent ID',
  'Record Month',
  'Modal Premium',
  'API',
  'Sum Assured',
  'Commission Amount',
  'Policy Number',
  'Transaction Type',
  'Credit Status',
] as const;

const parsedLapsationRowSchema = z.object({
  'Agent ID': z.string().uuid(),
  'Record Month': z.string().regex(/^\d{4}-\d{2}$/, 'Record Month must use YYYY-MM.'),
  'Modal Premium': z.coerce.number().finite().nonnegative(),
  API: z.coerce.number().finite().nonnegative(),
  'Sum Assured': z.coerce.number().finite().nonnegative(),
  'Commission Amount': z.coerce.number().finite().nonnegative(),
  'Policy Number': z.string().uuid(),
  'Transaction Type': z.string().trim().min(1),
  'Credit Status': z.string().trim().min(1),
  'Lapse Date UTC': z.string().datetime().optional(),
  'Reinstated At UTC': z.string().datetime().optional(),
});

type ParsedLapsationRow = z.infer<typeof parsedLapsationRowSchema>;

function getFirstWorksheet(workbook: XLSX.WorkBook) {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new BusinessRuleError('Lapsation import workbook must contain at least one worksheet.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new BusinessRuleError('Lapsation import workbook worksheet could not be read.');
  }

  return worksheet;
}

function assertRequiredHeaders(headers: string[]) {
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new BusinessRuleError(
      `Lapsation import workbook is missing required headers: ${missingHeaders.join(', ')}.`,
    );
  }
}

function parseWorksheetRows(worksheet: XLSX.WorkSheet): ParsedLapsationRow[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: undefined,
    raw: false,
  });

  if (rows.length === 0) {
    throw new BusinessRuleError('Lapsation import workbook must include at least one data row.');
  }

  const headers = Object.keys(rows[0] ?? {});
  assertRequiredHeaders(headers);

  return rows.map((row, index) => {
    try {
      return parsedLapsationRowSchema.parse(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = error as {
          issues: Array<{ path: Array<string | number>; message: string }>;
        };
        const message = validationError.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        void importValidationService.recordIssue({
          sourceType: 'NAP',
          issueCode: 'INVALID_LAPSATION_ROW',
          details: `Lapsation row ${index + 2} is invalid: ${message}`,
          externalKey: String(row['Policy Number'] ?? row['Agent ID'] ?? index + 2),
          rawPayload: row,
        });
        throw new BusinessRuleError(`Lapsation row ${index + 2} is invalid: ${message}`);
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new BusinessRuleError(`Lapsation row ${index + 2} is invalid.`);
    }
  });
}

export class LapsationImportService {
  async processUpload(payload: LapsationUploadJobPayload): Promise<{ importedRows: number }> {
    const parsedPayload = LapsationUploadJobPayloadSchema.parse(payload);

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(Buffer.from(parsedPayload.workbookBase64, 'base64'), { type: 'buffer' });
    } catch {
      throw new BusinessRuleError('Uploaded lapsation workbook could not be parsed as Excel.');
    }

    const worksheet = getFirstWorksheet(workbook);
    const rows = parseWorksheetRows(worksheet);

    return { importedRows: rows.length };
  }
}

export const lapsationImportService = new LapsationImportService();
