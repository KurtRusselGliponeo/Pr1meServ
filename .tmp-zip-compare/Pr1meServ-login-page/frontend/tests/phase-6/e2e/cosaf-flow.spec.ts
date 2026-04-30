import { expect, test, type BrowserContext, type Route } from '@playwright/test';

type Role = 'Admin' | 'Agent' | 'BranchManager';

type WorkflowUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
};

type WorkflowAgent = {
  id: string;
  displayName: string;
  agentCode: string;
  email: string;
};

type WorkflowClient = {
  id: string;
  assignedAgentId: string | null;
  firstName: string;
  lastName: string;
  policyNumber: string;
  caseStatus: string;
};

type WorkflowApproval = {
  id: string;
  clientProfileId: string;
  policyNumber: string;
  assignedAgentName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAtUtc: string;
};

function createWorkflowState() {
  const agents: WorkflowAgent[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      displayName: 'Alex Source',
      agentCode: 'AG-001',
      email: 'alex.source@a1prime.com',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      displayName: 'Jamie Agent',
      agentCode: 'AG-002',
      email: 'jamie.agent@a1prime.com',
    },
  ];

  const clients: WorkflowClient[] = [
    {
      id: '33333333-3333-4333-8333-333333333333',
      assignedAgentId: agents[0].id,
      firstName: 'Taylor',
      lastName: 'Santos',
      policyNumber: 'POL-0001',
      caseStatus: 'Orphan',
    },
  ];

  const approvals: WorkflowApproval[] = [];

  return { agents, clients, approvals };
}

function getUser(role: Role): WorkflowUser {
  if (role === 'Admin') {
    return {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'admin@a1prime.com',
      firstName: 'Ada',
      lastName: 'Admin',
      role,
    };
  }

  if (role === 'BranchManager') {
    return {
      id: '55555555-5555-4555-8555-555555555555',
      email: 'manager@a1prime.com',
      firstName: 'Morgan',
      lastName: 'Manager',
      role,
    };
  }

  return {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'agent@a1prime.com',
    firstName: 'Jamie',
    lastName: 'Agent',
    role,
  };
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.toLowerCase());
}

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

async function attachWorkflowMocks(
  context: BrowserContext,
  role: Role,
  state: ReturnType<typeof createWorkflowState>,
) {
  const user = getUser(role);

  await context.addCookies([
    {
      name: 'refresh_token',
      value: 'mock-refresh-token',
      url: 'http://localhost:3000',
    },
  ]);

  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path.endsWith('/auth/refresh') && method === 'POST') {
      await fulfillJson(route, { accessToken: `${role.toLowerCase()}-access-token` });
      return;
    }

    if (path.endsWith('/auth/login') && method === 'POST') {
      await fulfillJson(route, { accessToken: `${role.toLowerCase()}-access-token` });
      return;
    }

    if (path.endsWith('/auth/me') && method === 'GET') {
      await fulfillJson(route, {
        user: {
          ...user,
          createdAtUtc: '2026-04-21T00:00:00.000Z',
          updatedAtUtc: '2026-04-21T00:00:00.000Z',
        },
      });
      return;
    }

    if (path.endsWith('/agents') && method === 'GET') {
      const search = url.searchParams.get('search')?.trim() ?? '';
      const agents = state.agents.filter((agent) => {
        if (!search) {
          return true;
        }

        return (
          matchesSearch(agent.displayName, search) ||
          matchesSearch(agent.agentCode, search) ||
          matchesSearch(agent.email, search)
        );
      });

      await fulfillJson(route, {
        data: agents,
      });
      return;
    }

    if (path.endsWith('/client-profiles') && method === 'GET') {
      const status = url.searchParams.get('status');
      const agentId = url.searchParams.get('agentId');
      const search = url.searchParams.get('search')?.trim() ?? '';

      const clients = state.clients.filter((client) => {
        if (role === 'Agent' && client.assignedAgentId !== state.agents[1].id) {
          return false;
        }

        if (status && client.caseStatus !== status) {
          return false;
        }

        if (agentId && client.assignedAgentId !== agentId) {
          return false;
        }

        if (!search) {
          return true;
        }

        return (
          matchesSearch(client.firstName, search) ||
          matchesSearch(client.lastName, search) ||
          matchesSearch(client.policyNumber, search)
        );
      });

      await fulfillJson(route, {
        data: clients.map((client) => ({
          ...client,
          modalPremium: '1000.00',
          api: '50000.00',
          sumAssured: '1000000.00',
          commissionAmount: '2500.00',
          policyStatus: 'Active',
          createdAtUtc: '2026-04-21T00:00:00.000Z',
          updatedAtUtc: '2026-04-21T00:00:00.000Z',
        })),
        meta: {
          total: clients.length,
          page: 1,
          pageSize: 10,
          hasNextPage: false,
        },
      });
      return;
    }

    if (path.endsWith('/client-profiles/reassign/preflight') && method === 'POST') {
      const payload = route.request().postDataJSON() as {
        sourceAgentId: string;
        destinationAgentId: string | null;
        clientProfileIds: string[];
      };

      await fulfillJson(route, {
        ok: true,
        sourceAgentId: payload.sourceAgentId,
        destinationAgentId: payload.destinationAgentId,
        totalRequested: payload.clientProfileIds.length,
        validClientProfileIds: payload.clientProfileIds,
        issues: [],
      });
      return;
    }

    if (path.endsWith('/client-profiles/reassign') && method === 'POST') {
      const payload = route.request().postDataJSON() as {
        destinationAgentId: string | null;
        clientProfileIds: string[];
      };

      for (const clientId of payload.clientProfileIds) {
        const client = state.clients.find((item) => item.id === clientId);
        if (!client) {
          continue;
        }

        client.assignedAgentId = payload.destinationAgentId;
        client.caseStatus = payload.destinationAgentId ? 'For Approval' : 'Orphan';
      }

      await fulfillJson(route, {
        reassignedCount: payload.clientProfileIds.length,
      });
      return;
    }

    // Agent Upload Route (Backend GDrive Integration)
    if (path.endsWith('/documents/upload') && method === 'POST') {
      // Simulate successful upload and database insert
      await fulfillJson(route, {
        documentId: '123e4567-e89b-12d3-a456-426614174000',
        webViewLink: 'https://storage.local/mock-upload',
      });
      return;
    }

    if (path.endsWith('/documents/cosaf-upload-complete') && method === 'POST') {
      const payload = route.request().postDataJSON() as { clientProfileId: string };
      const client = state.clients.find((item) => item.id === payload.clientProfileId);

      if (client) {
        client.caseStatus = 'Forms Submitted';
        const assignedAgent = state.agents.find((agent) => agent.id === client.assignedAgentId);

        state.approvals.splice(0, state.approvals.length, {
          id: '88888888-8888-4888-8888-888888888888',
          clientProfileId: client.id,
          policyNumber: client.policyNumber,
          assignedAgentName: assignedAgent?.displayName ?? 'Unassigned',
          status: 'PENDING',
          createdAtUtc: '2026-04-21T02:00:00.000Z',
        });
      }

      await fulfillJson(route, { success: true });
      return;
    }

    if (path.endsWith('/cosaf-approvals') && method === 'GET') {
      await fulfillJson(route, {
        data: state.approvals.filter((approval) => approval.status === 'PENDING'),
      });
      return;
    }

    if (path.endsWith('/approve') && method === 'POST') {
      const approvalId = path.split('/').at(-2);
      const approval = state.approvals.find((item) => item.id === approvalId);

      if (approval) {
        approval.status = 'APPROVED';
        const client = state.clients.find((item) => item.id === approval.clientProfileId);
        if (client) {
          client.caseStatus = 'BM Signed';
        }
      }

      await fulfillJson(route, { success: true });
      return;
    }

    if (path.endsWith('/reject') && method === 'POST') {
      const approvalId = path.split('/').at(-2);
      const approval = state.approvals.find((item) => item.id === approvalId);

      if (approval) {
        approval.status = 'REJECTED';
      }

      await fulfillJson(route, { success: true });
      return;
    }

    await fulfillJson(route, {});
  });

  await context.route('https://storage.local/mock-upload', async (route) => {
    await route.fulfill({
      status: 200,
      body: '',
    });
  });
}

async function openRolePage(
  browserContext: BrowserContext,
  role: Role,
  state: ReturnType<typeof createWorkflowState>,
  path: string,
) {
  await attachWorkflowMocks(browserContext, role, state);
  const page = await browserContext.newPage();
  await page.goto(path);
  
  if (page.url().includes('/login')) {
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.waitForURL(`**${path}**`, { timeout: 10000 }).catch(() => {});
  }
  
  return page;
}

test.describe('COSAF Reassignment Pipeline', () => {
  test('simulates admin reassignment, agent upload, and manager rejection', async ({ browser }) => {
    const state = createWorkflowState();

    // Step A: The Admin Assignment
    const adminContext = await browser.newContext();
    const adminPage = await openRolePage(
      adminContext,
      'Admin',
      state,
      '/dashboard/cosaf/reassign',
    );

    await expect(adminPage.getByText(/Admin reassignment board/i)).toBeVisible();
    
    // Select agent
    await adminPage.getByText(/Jamie Agent/i).first().click();
    
    // Select client
    await adminPage.getByText(/Taylor Santos/i).first().click();
    
    // Preflight check
    await adminPage.getByRole('button', { name: /Review reassignment/i }).click();
    
    // Confirm Assignment
    await adminPage.getByRole('button', { name: /Confirm reassignment/i }).click();
    
    await adminContext.close();

    expect(state.clients[0]?.assignedAgentId).toBe(state.agents[1]?.id);
    expect(state.clients[0]?.caseStatus).toBe('For Approval');

    // Step B: The Agent Upload
    const agentContext = await browser.newContext();
    const agentPage = await openRolePage(agentContext, 'Agent', state, '/dashboard/cosaf');

    await expect(agentPage.getByText(/Agent upload portal/i)).toBeVisible();
    await agentPage.getByText(/Taylor Santos/i).first().click();
    
    // Simulate File Upload
    await agentPage
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'cosaf.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('mock cosaf data'),
      });
      
    await agentPage.getByRole('button', { name: /Upload and mark PENDING_REVIEW/i }).click();
    
    // Wait for the UI state to change (done)
    await expect(agentPage.getByText(/COSAF upload completed/i)).toBeVisible();

    await agentContext.close();

    expect(state.approvals).toHaveLength(1);
    expect(state.approvals[0]?.status).toBe('PENDING');

    // Step C: The Branch Manager Rejection (The Edge Case)
    const managerContext = await browser.newContext();
    const managerPage = await openRolePage(managerContext, 'BranchManager', state, '/dashboard/cosaf');

    await expect(managerPage.getByText(/Live COSAF approvals/i)).toBeVisible();
    
    // Locate and click the "Reject" button
    await managerPage.getByRole('button', { name: /Reject/i }).click();
    
    // Assert the Rejection Reason Modal Opens
    await expect(managerPage.getByText(/Reject COSAF submission/i)).toBeVisible();
    
    // Attempt to submit empty reason - should fail Zod validation
    await managerPage.getByRole('button', { name: /Reject submission/i }).click();
    await expect(managerPage.getByText(/Enter at least 10 characters so the agent knows what to fix/i)).toBeVisible();
    
    // Fill in valid reason
    await managerPage.getByLabel(/Rejection reason/i).fill('Missing signature on page 2');
    
    // Submit Rejection
    await managerPage.getByRole('button', { name: /Reject submission/i }).click();
    
    // Assert modal closes and queue updates
    await expect(managerPage.getByText(/COSAF submission rejected/i)).toBeVisible();
    
    await managerContext.close();

    // Verify state changes
    expect(state.approvals[0]?.status).toBe('REJECTED');
  });
});
