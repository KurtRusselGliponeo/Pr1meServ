# UI Planning Phase Prompts

This file contains ready-to-copy prompts based on [ui-planning.md](C:/Users/andre/4th%20year-OJT/FIrst%20project/2nd/Pr1meServ/ui-planning.md).

These prompts are written in the same style as structured implementation prompts so you can reuse them phase by phase.

They are documentation only. They do not directly change the system unless you give them to an AI assistant and ask it to implement the work.

---

## How to Use This File

- Copy only the phase prompt you want to work on.
- Change details if needed before sending it.
- Keep earlier phases locked if they are already finished.
- Require a clear report at the end of each phase.

Recommended professional role set for these prompts:

- Senior Frontend Engineer
- UI/UX Designer
- Performance-Focused Full-Stack Engineer
- QA-minded Implementer

---

## Phase 0 Prompt: Baseline Check and Problem Confirmation

```md
Act as a Senior Frontend Engineer, Performance-Focused Full-Stack Engineer, and QA-minded Technical Investigator.

You are continuing the UI improvement work for this system. The current goal is to confirm what is actually causing the slow and awkward experience before making visual changes.

Implement Phase 0 only: Baseline Check and Problem Confirmation.

Locked rules you must preserve:

- Do not redesign the UI yet.
- Do not make broad visual changes in this phase.
- Focus only on measurement, diagnosis, and confirmation of the real bottlenecks.
- Reuse the current repo structure and existing tooling.

Investigate the following:

1. Time from `npm run dev` until the login page is visible.
2. Time from opening the app until the dashboard shell is usable.
3. Time when switching between major dashboard pages.
4. Whether frontend startup, backend/API response time, auth/session flow, route prefetching, or repeated refetching is causing the main slowdown.
5. Whether loading states are too heavy or unclear.
6. Which pages or actions feel slowest in real use.

Implementation requirements:

- Reuse the current repo architecture and patterns.
- Keep the work focused on diagnosis and safe instrumentation only.
- Do not begin visual redesign in this phase.
- If measurements or logs are added, keep them minimal and relevant.
- Document findings clearly.

At the end, report:

- Completed
- Pending
- Suggestions
- measured slow points
- commands run for verification
- any setup or environment requirements discovered
```

---

## Phase 1 Prompt: Performance Stabilization and Fast Perceived Loading

```md
Act as a Senior Frontend Engineer, Performance-Focused Full-Stack Engineer, and QA-minded Implementer.

You are continuing the UI improvement work for this system. Phase 0 findings are already available and should be used as the basis for implementation.

Implement Phase 1 only: Performance Stabilization and Fast Perceived Loading.

Locked rules you must preserve:

- Do not start broad visual redesign yet.
- Prioritize responsiveness and perceived speed first.
- Do not break current authentication, routing, or role-based behavior.
- Reuse the current repo structure and patterns.

Build or improve the following:

1. Reduce delays before the login page appears.
2. Reduce delays when the dashboard first loads.
3. Improve page-to-page navigation responsiveness.
4. Review and optimize route prefetching behavior if it is too aggressive.
5. Reduce unnecessary refetching or repeated loading states.
6. Improve error, empty, and loading states so users are not stuck on unclear spinners.
7. Keep shell-level UI visible as much as possible while page content updates.

Implementation requirements:

- Reuse the current repo architecture and patterns.
- Apply fixes in a way that preserves current system behavior.
- Prefer real performance improvements before cosmetic loading tricks.
- Improve perceived loading without hiding actual errors.
- Add or update tests if behavior changes in a meaningful way.

At the end, report:

- Completed
- Pending
- Suggestions
- commands run for verification
- any migration/env vars/setup required
```

---

## Phase 2 Prompt: Dashboard Shell and Navigation Refinement

```md
Act as a Senior Frontend Engineer, UI/UX Designer, and QA-minded Implementer.

You are continuing the UI improvement work for this system. Earlier performance work is already completed or stable enough to proceed.

Implement Phase 2 only: Dashboard Shell and Navigation Refinement.

Locked rules you must preserve:

- Keep the current role-based navigation logic intact.
- Do not break current page access rules.
- Preserve the overall design language unless extension is needed.
- Do not rework earlier phases unless required to support the tasks below.

Build the following:

1. Refine the dashboard shell so it feels lighter and more intentional.
2. Make the collapsible desktop sidebar become a true slim rail when collapsed.
3. Keep the expanded sidebar for full labels and normal reading.
4. In collapsed mode, make the width close to logo + toggle + icon-only navigation.
5. Keep navigation icons centered and clear when labels are hidden.
6. Add a cleaner logo and top control area in the sidebar.
7. Ensure the main content area expands naturally when the sidebar collapses.
8. Keep spacing responsive so the layout does not look awkward on common laptop sizes.
9. Improve header-to-sidebar visual balance if needed.

Implementation requirements:

- Reuse the current repo architecture and patterns.
- Do not break mobile navigation while refining desktop navigation.
- Keep accessibility in mind for collapsed navigation states.
- Preserve navigation clarity when labels are hidden.
- Add or update tests if interaction behavior changes.

At the end, report:

- Completed
- Pending
- Suggestions
- commands run for verification
- any setup required
```

---

## Phase 3 Prompt: Documentation Page and Upload Experience Upgrade

```md
Act as a Senior Frontend Engineer, UI/UX Designer, and QA-minded Implementer.

You are continuing the UI improvement work for this system. Phase 2 is already stable enough to support page-level UI enhancement.

Implement Phase 3 only: Documentation Page and Upload Experience Upgrade.

Locked rules you must preserve:

- Reuse the current documents workflow and existing backend integration.
- Do not break current upload behavior, categories, or access restrictions.
- Use the provided design references as inspiration only, not as an exact copy.
- Preserve the current design language unless extension is needed.

Build the following:

1. Upgrade the documents page so it feels like a stronger document workspace.
2. Improve the page header and primary upload action.
3. Improve the grouping of search, filters, and results.
4. Add stronger empty and no-results states.
5. Improve the upload modal layout and visual hierarchy.
6. Clearly support idle, drag-over, selected-file, uploading, and uploaded states.
7. Improve file guidance and upload clarity.
8. Keep the page usable and responsive on desktop and smaller widths.

Implementation requirements:

- Reuse the current repo architecture and patterns.
- Extend the current documents UI rather than replacing working logic.
- Do not leave placeholder upload states if new UI states are introduced.
- Keep accessibility and clarity high for upload interactions.
- Add or update tests for changed document upload behavior where appropriate.

At the end, report:

- Completed
- Pending
- Suggestions
- commands run for verification
- any setup required
```

---

## Phase 4 Prompt: Core UI Consistency Pass

```md
Act as a Senior Frontend Engineer, UI/UX Designer, Design Systems Engineer, and QA-minded Implementer.

You are continuing the UI improvement work for this system. The shared shell and key page improvements are already in place.

Implement Phase 4 only: Core UI Consistency Pass.

Locked rules you must preserve:

- Do not introduce a completely new design system.
- Standardize the existing UI instead of rebuilding everything.
- Keep existing workflows intact unless improvement is necessary.
- Do not rework earlier phases unless required to support the tasks below.

Build the following:

1. Standardize spacing rules across headers, cards, tables, forms, and modals.
2. Standardize button sizing, icon spacing, badges, and common controls.
3. Refine typography hierarchy for titles, subtitles, helper text, and table text.
4. Review border radius, shadows, and panel treatment for consistency.
5. Fix obvious visual quality issues such as awkward spacing, broken characters, and inconsistent labels.
6. Ensure the UI feels like one system instead of a mix of unrelated parts.

Implementation requirements:

- Reuse the current repo architecture and component patterns.
- Make consistency improvements in a measured and maintainable way.
- Avoid unnecessary churn in stable components.
- Keep the existing product tone unless a clearer extension is needed.
- Add or update tests if shared interaction behavior changes.

At the end, report:

- Completed
- Pending
- Suggestions
- commands run for verification
- any setup required
```

---

## Phase 5 Prompt: Role-Based UX Cleanup

```md
Act as a Senior Frontend Engineer, UI/UX Designer, Product Designer, and QA-minded Implementer.

You are continuing the UI improvement work for this system. Shared UI improvements are already stable enough to support role-based refinement.

Implement Phase 5 only: Role-Based UX Cleanup.

Locked rules you must preserve:

- Roles are strictly Agent, BranchManager, and Admin.
- Agent sees only own data.
- BranchManager sees only branch-wide data for their own branch.
- Admin has cross-branch access.
- Do not break existing role-based access behavior.
- Do not rework earlier phases unless required to support the tasks below.

Build the following:

1. Refine Admin-facing UI for stronger search, filtering, and information density where appropriate.
2. Refine BranchManager-facing UI for branch oversight and action clarity.
3. Refine Agent-facing UI to be simpler, more task-oriented, and less cluttered.
4. Reduce non-essential actions where they distract from the core workflow.
5. Make primary actions easier to find for each role.
6. Keep all views aligned with existing access restrictions.

Implementation requirements:

- Reuse the current repo architecture and patterns.
- Preserve backend and service-level RBAC behavior.
- Do not rely only on frontend hiding for role-specific behavior.
- Keep UX improvements aligned with real role responsibilities.
- Add or update tests for role-based visibility or behavior if needed.

At the end, report:

- Completed
- Pending
- Suggestions
- commands run for verification
- any migration/env vars/setup required
```

---

## Phase 6 Prompt: Final QA, Responsive Review, and Rollout

```md
Act as a QA-minded Frontend Engineer, Senior Full-Stack Engineer, and Technical Project Closer.

You are continuing the UI improvement work for this system. The implementation phases are already complete enough to enter final review.

Implement Phase 6 only: Final QA, Responsive Review, and Rollout Preparation.

Locked rules you must preserve:

- Do not introduce broad new feature work in this phase.
- Focus on verification, bug-fixing, responsive review, and rollout safety.
- Do not rework earlier phases unless required to fix confirmed issues.

Build or verify the following:

1. Check desktop responsiveness, especially common laptop widths.
2. Check collapsed sidebar behavior across pages.
3. Check wide table and form layouts after the shell changes.
4. Check loading, success, empty, and error states across key pages.
5. Verify role-based navigation visibility and page access behavior.
6. Confirm that performance is improved compared with the initial baseline.
7. Fix high-priority regressions discovered during this review.

Implementation requirements:

- Reuse the current repo architecture and testing patterns.
- Prefer targeted fixes over broad refactors in this phase.
- Verify both usability and stability.
- Record rollout concerns clearly if anything should be staged carefully.

At the end, report:

- Completed
- Pending
- Suggestions
- commands run for verification
- rollout notes
- any known risks or blockers
```

---

## Simple Copy Workflow

If you want to use this in the cleanest way:

1. Read [ui-planning.md](C:/Users/andre/4th%20year-OJT/FIrst%20project/2nd/Pr1meServ/ui-planning.md)
2. Copy the exact prompt for the phase you want
3. Paste it into Codex
4. Review the `Completed`, `Pending`, and `Suggestions` report before moving to the next phase

That way, the work stays controlled and not sabay-sabay.
