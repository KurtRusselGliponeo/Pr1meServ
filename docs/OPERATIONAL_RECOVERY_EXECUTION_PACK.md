# Operational Recovery Execution Pack

This pack converts the operational recovery plan into execution-ready artifacts for delivery, coordination, and release control.

## Included Documents

- [Operational Recovery Jira Backlog](./OPERATIONAL_RECOVERY_JIRA_BACKLOG.md)
- [Operational Recovery Technical Checklist](./OPERATIONAL_RECOVERY_TECHNICAL_CHECKLIST.md)
- [Operational Recovery Risk Matrix](./OPERATIONAL_RECOVERY_RISK_MATRIX.md)
- [Operational Recovery Release Plan](./OPERATIONAL_RECOVERY_RELEASE_PLAN.md)
- [Authorization Route Matrix](./AUTHORIZATION_ROUTE_MATRIX.md)

## Recommended Working Order

1. Start with the Jira backlog to align scope, owners, and acceptance criteria.
2. Use the technical checklist during implementation and PR review.
3. Review the risk matrix before Phase 0, Phase 2, and each release cut.
4. Use the release plan to define milestone gates, smoke tests, and rollback checks.

## Delivery Guardrails

- Do not start Phase 2 without Phase 1 authorization and audit decisions documented.
- Do not start Phase 5 deep optimization work until role-critical workflows are passing smoke tests.
- Treat worker heartbeat, queue visibility, and migration health as release blockers.
- Keep API, worker, and frontend changes grouped by workflow to reduce partial-rollout risk.
