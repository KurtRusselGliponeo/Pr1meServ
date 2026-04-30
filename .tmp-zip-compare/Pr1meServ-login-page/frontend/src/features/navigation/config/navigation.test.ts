import { describe, expect, it } from 'vitest';

import { getNavigationItemsForRole } from './navigation';

describe('getNavigationItemsForRole', () => {
  it('shows admin-only pages only for Admin', () => {
    const adminItems = getNavigationItemsForRole('Admin').map((item) => item.href);
    const branchManagerItems = getNavigationItemsForRole('BranchManager').map((item) => item.href);
    const agentItems = getNavigationItemsForRole('Agent').map((item) => item.href);

    expect(adminItems).toContain('/dashboard/admin/users');
    expect(adminItems).toContain('/dashboard/admin/notifications');
    expect(branchManagerItems).not.toContain('/dashboard/admin/users');
    expect(branchManagerItems).not.toContain('/dashboard/admin/notifications');
    expect(agentItems).not.toContain('/dashboard/admin/users');
    expect(agentItems).not.toContain('/dashboard/admin/notifications');
  });

  it('shows performance page for all supported roles that the backend allows', () => {
    expect(getNavigationItemsForRole('Admin').map((item) => item.href)).toContain(
      '/dashboard/performance',
    );
    expect(getNavigationItemsForRole('BranchManager').map((item) => item.href)).toContain(
      '/dashboard/performance',
    );
    expect(getNavigationItemsForRole('Agent').map((item) => item.href)).toContain(
      '/dashboard/performance',
    );
  });
});
