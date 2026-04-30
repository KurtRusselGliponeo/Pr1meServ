import { db } from '@/db/client';
import { importValidationIssues } from '@/schema';

type RecordImportIssueInput = {
  sourceType: 'NAP' | 'APE' | 'PER' | 'REC';
  issueCode: string;
  details: string;
  externalKey?: string | null;
  rawPayload?: unknown;
  severity?: 'error' | 'warning';
};

export class ImportValidationService {
  async recordIssue(input: RecordImportIssueInput): Promise<void> {
    await db.insert(importValidationIssues).values({
      sourceType: input.sourceType,
      issueCode: input.issueCode,
      severity: input.severity ?? 'error',
      externalKey: input.externalKey ?? null,
      details: input.details,
      rawPayload:
        input.rawPayload === undefined ? null : JSON.stringify(input.rawPayload, null, 2),
    });
  }
}

export const importValidationService = new ImportValidationService();
