'use client';

import type { CosafApprovalListResponse } from '@a1prime/schemas';

export type { CosafApprovalListResponse };
export type CosafApprovalItem = CosafApprovalListResponse['data'][number];
