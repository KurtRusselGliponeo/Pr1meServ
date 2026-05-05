import type { Metadata } from 'next';

import { PolicyInventoryPageClient } from '@/features/policies/components/policy-inventory-page-client';

export const metadata: Metadata = {
  title: 'Policy Inventory',
  description: 'Role-scoped policy inventory with paginated spreadsheet-style records.',
};

export default function PoliciesPage() {
  return <PolicyInventoryPageClient />;
}
