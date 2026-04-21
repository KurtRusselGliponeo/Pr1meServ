# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cosaf-flow.spec.ts >> COSAF Reassignment Pipeline >> simulates admin reassignment, agent upload, and manager rejection
- Location: tests\phase-6\e2e\cosaf-flow.spec.ts:349:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Admin reassignment board/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/Admin reassignment board/i)

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e9]:
        - generic [ref=e10]:
            - generic [ref=e11]:
                - generic [ref=e12]:
                    - img [ref=e13]
                    - text: PRU Life UK
                - heading "A cleaner command surface for branch operations." [level=1] [ref=e15]
                - paragraph [ref=e16]: Sign in to review client movements, monitor performance, and manage the branch workspace from one polished system.
            - generic [ref=e17]:
                - generic [ref=e19]:
                    - img [ref=e21]
                    - generic [ref=e24]:
                        - paragraph [ref=e25]: Protected access
                        - paragraph [ref=e26]: Role-aware routes and session recovery keep the workspace secure.
                - generic [ref=e28]:
                    - img [ref=e30]
                    - generic [ref=e34]:
                        - paragraph [ref=e35]: Operational workflows
                        - paragraph [ref=e36]: Move between COSAF, metrics, and administration without losing context.
                - generic [ref=e38]:
                    - img [ref=e40]
                    - generic [ref=e42]:
                        - paragraph [ref=e43]: Built for clarity
                        - paragraph [ref=e44]: Intentional spacing, softer depth, and calmer visual hierarchy reduce friction.
        - generic [ref=e45]:
            - generic [ref=e46]:
                - generic [ref=e47]:
                    - img [ref=e49]
                    - generic [ref=e52]:
                        - paragraph [ref=e53]: A1 Prime
                        - generic [ref=e54]: Welcome back
                - paragraph [ref=e55]: Sign in to access branch management, performance monitoring, and protected dashboard data.
            - generic [ref=e56]:
                - generic [ref=e57]:
                    - generic [ref=e58]:
                        - text: Email address
                        - generic [ref=e59]:
                            - img
                            - textbox "agent@a1prime.com" [ref=e60]
                    - generic [ref=e61]:
                        - generic [ref=e62]:
                            - generic [ref=e63]: Password
                            - link "Reset later" [ref=e64] [cursor=pointer]:
                                - /url: '#'
                        - generic [ref=e65]:
                            - img
                            - textbox "Enter your password" [ref=e66]
                    - button "Sign in" [ref=e67] [cursor=pointer]
                - generic [ref=e68]: Use your assigned company credentials to continue to the workspace.
    - button "Open Next.js Dev Tools" [ref=e74] [cursor=pointer]:
        - img [ref=e75]
    - alert [ref=e78]
```

# Test source

```ts
  261 |       await fulfillJson(route, {
  262 |         documentId: '123e4567-e89b-12d3-a456-426614174000',
  263 |         webViewLink: 'https://storage.local/mock-upload',
  264 |       });
  265 |       return;
  266 |     }
  267 |
  268 |     if (path.endsWith('/documents/cosaf-upload-complete') && method === 'POST') {
  269 |       const payload = route.request().postDataJSON() as { clientProfileId: string };
  270 |       const client = state.clients.find((item) => item.id === payload.clientProfileId);
  271 |
  272 |       if (client) {
  273 |         client.caseStatus = 'Forms Submitted';
  274 |         const assignedAgent = state.agents.find((agent) => agent.id === client.assignedAgentId);
  275 |
  276 |         state.approvals.splice(0, state.approvals.length, {
  277 |           id: '88888888-8888-4888-8888-888888888888',
  278 |           clientProfileId: client.id,
  279 |           policyNumber: client.policyNumber,
  280 |           assignedAgentName: assignedAgent?.displayName ?? 'Unassigned',
  281 |           status: 'PENDING',
  282 |           createdAtUtc: '2026-04-21T02:00:00.000Z',
  283 |         });
  284 |       }
  285 |
  286 |       await fulfillJson(route, { success: true });
  287 |       return;
  288 |     }
  289 |
  290 |     if (path.endsWith('/cosaf-approvals') && method === 'GET') {
  291 |       await fulfillJson(route, {
  292 |         data: state.approvals.filter((approval) => approval.status === 'PENDING'),
  293 |       });
  294 |       return;
  295 |     }
  296 |
  297 |     if (path.endsWith('/approve') && method === 'POST') {
  298 |       const approvalId = path.split('/').at(-2);
  299 |       const approval = state.approvals.find((item) => item.id === approvalId);
  300 |
  301 |       if (approval) {
  302 |         approval.status = 'APPROVED';
  303 |         const client = state.clients.find((item) => item.id === approval.clientProfileId);
  304 |         if (client) {
  305 |           client.caseStatus = 'BM Signed';
  306 |         }
  307 |       }
  308 |
  309 |       await fulfillJson(route, { success: true });
  310 |       return;
  311 |     }
  312 |
  313 |     if (path.endsWith('/reject') && method === 'POST') {
  314 |       const approvalId = path.split('/').at(-2);
  315 |       const approval = state.approvals.find((item) => item.id === approvalId);
  316 |
  317 |       if (approval) {
  318 |         approval.status = 'REJECTED';
  319 |       }
  320 |
  321 |       await fulfillJson(route, { success: true });
  322 |       return;
  323 |     }
  324 |
  325 |     await fulfillJson(route, {});
  326 |   });
  327 |
  328 |   await context.route('https://storage.local/mock-upload', async (route) => {
  329 |     await route.fulfill({
  330 |       status: 200,
  331 |       body: '',
  332 |     });
  333 |   });
  334 | }
  335 |
  336 | async function openRolePage(
  337 |   browserContext: BrowserContext,
  338 |   role: Role,
  339 |   state: ReturnType<typeof createWorkflowState>,
  340 |   path: string,
  341 | ) {
  342 |   await attachWorkflowMocks(browserContext, role, state);
  343 |   const page = await browserContext.newPage();
  344 |   await page.goto(path);
  345 |   return page;
  346 | }
  347 |
  348 | test.describe('COSAF Reassignment Pipeline', () => {
  349 |   test('simulates admin reassignment, agent upload, and manager rejection', async ({ browser }) => {
  350 |     const state = createWorkflowState();
  351 |
  352 |     // Step A: The Admin Assignment
  353 |     const adminContext = await browser.newContext();
  354 |     const adminPage = await openRolePage(
  355 |       adminContext,
  356 |       'Admin',
  357 |       state,
  358 |       '/dashboard/cosaf/reassign',
  359 |     );
  360 |
> 361 |     await expect(adminPage.getByText(/Admin reassignment board/i)).toBeVisible();
      |                                                                    ^ Error: expect(locator).toBeVisible() failed
  362 |
  363 |     // Select agent
  364 |     await adminPage.getByText(/Jamie Agent/i).first().click();
  365 |
  366 |     // Select client
  367 |     await adminPage.getByText(/Taylor Santos/i).first().click();
  368 |
  369 |     // Preflight check
  370 |     await adminPage.getByRole('button', { name: /Review reassignment/i }).click();
  371 |
  372 |     // Confirm Assignment
  373 |     await adminPage.getByRole('button', { name: /Confirm reassignment/i }).click();
  374 |
  375 |     await adminContext.close();
  376 |
  377 |     expect(state.clients[0]?.assignedAgentId).toBe(state.agents[1]?.id);
  378 |     expect(state.clients[0]?.caseStatus).toBe('For Approval');
  379 |
  380 |     // Step B: The Agent Upload
  381 |     const agentContext = await browser.newContext();
  382 |     const agentPage = await openRolePage(agentContext, 'Agent', state, '/dashboard/cosaf');
  383 |
  384 |     await expect(agentPage.getByText(/Agent upload portal/i)).toBeVisible();
  385 |     await agentPage.getByText(/Taylor Santos/i).first().click();
  386 |
  387 |     // Simulate File Upload
  388 |     await agentPage
  389 |       .locator('input[type="file"]')
  390 |       .setInputFiles({
  391 |         name: 'cosaf.pdf',
  392 |         mimeType: 'application/pdf',
  393 |         buffer: Buffer.from('mock cosaf data'),
  394 |       });
  395 |
  396 |     await agentPage.getByRole('button', { name: /Upload and mark PENDING_REVIEW/i }).click();
  397 |
  398 |     // Wait for the UI state to change (done)
  399 |     await expect(agentPage.getByText(/COSAF upload completed/i)).toBeVisible();
  400 |
  401 |     await agentContext.close();
  402 |
  403 |     expect(state.approvals).toHaveLength(1);
  404 |     expect(state.approvals[0]?.status).toBe('PENDING');
  405 |
  406 |     // Step C: The Branch Manager Rejection (The Edge Case)
  407 |     const managerContext = await browser.newContext();
  408 |     const managerPage = await openRolePage(managerContext, 'BranchManager', state, '/dashboard/cosaf');
  409 |
  410 |     await expect(managerPage.getByText(/Live COSAF approvals/i)).toBeVisible();
  411 |
  412 |     // Locate and click the "Reject" button
  413 |     await managerPage.getByRole('button', { name: /Reject/i }).click();
  414 |
  415 |     // Assert the Rejection Reason Modal Opens
  416 |     await expect(managerPage.getByText(/Reject COSAF submission/i)).toBeVisible();
  417 |
  418 |     // Attempt to submit empty reason - should fail Zod validation
  419 |     await managerPage.getByRole('button', { name: /Reject submission/i }).click();
  420 |     await expect(managerPage.getByText(/Enter at least 10 characters so the agent knows what to fix/i)).toBeVisible();
  421 |
  422 |     // Fill in valid reason
  423 |     await managerPage.getByLabel(/Rejection reason/i).fill('Missing signature on page 2');
  424 |
  425 |     // Submit Rejection
  426 |     await managerPage.getByRole('button', { name: /Reject submission/i }).click();
  427 |
  428 |     // Assert modal closes and queue updates
  429 |     await expect(managerPage.getByText(/COSAF submission rejected/i)).toBeVisible();
  430 |
  431 |     await managerContext.close();
  432 |
  433 |     // Verify state changes
  434 |     expect(state.approvals[0]?.status).toBe('REJECTED');
  435 |   });
  436 | });
  437 |
```
