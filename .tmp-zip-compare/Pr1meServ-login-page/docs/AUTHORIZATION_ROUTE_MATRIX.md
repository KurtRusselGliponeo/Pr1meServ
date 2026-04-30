# Authorization Route Matrix

This matrix documents the expected Phase 0 and Phase 1 route access for operationally sensitive areas.

## Users

| Route                                       | Admin | BranchManager | Agent | Notes                             |
| ------------------------------------------- | ----- | ------------- | ----- | --------------------------------- |
| `GET /api/v1/users`                         | Allow | Deny          | Deny  | Admin-only user list              |
| `POST /api/v1/users`                        | Allow | Deny          | Deny  | Admin-only user creation          |
| `PATCH /api/v1/users/:userId`               | Allow | Deny          | Deny  | Edit name/role only               |
| `DELETE /api/v1/users/:userId`              | Allow | Deny          | Deny  | Self-delete is explicitly blocked |
| `POST /api/v1/users/:userId/restore`        | Allow | Deny          | Deny  | Restore archived users            |
| `POST /api/v1/users/:userId/reset-password` | Allow | Deny          | Deny  | Queues temporary-password email   |

## Documents

| Route                                          | Admin | BranchManager | Agent | Notes                                             |
| ---------------------------------------------- | ----- | ------------- | ----- | ------------------------------------------------- |
| `POST /api/v1/documents/presigned-url`         | Allow | Allow         | Deny  | Upload initiation is governance-controlled        |
| `GET /api/v1/documents`                        | Allow | Allow         | Allow | Read-only library access                          |
| `GET /api/v1/documents/:id/history`            | Allow | Allow         | Allow | Read-only version history                         |
| `PATCH /api/v1/documents/:id/pin`              | Allow | Allow         | Deny  | Pinning is limited to Admin/BM                    |
| `POST /api/v1/documents/cosaf-upload-complete` | Allow | Allow         | Allow | Current workflow allows Agent completion callback |

## Notifications

| Route                            | Admin | BranchManager | Agent | Notes                              |
| -------------------------------- | ----- | ------------- | ----- | ---------------------------------- |
| `GET /api/v1/notifications/logs` | Allow | Deny          | Deny  | Admin-only operational log surface |

## Related Workflow Boundaries

| Route                                   | Admin | BranchManager | Agent | Notes                                             |
| --------------------------------------- | ----- | ------------- | ----- | ------------------------------------------------- |
| `GET /api/v1/client-profiles`           | Allow | Allow         | Allow | Shared operational list with downstream filtering |
| `POST /api/v1/client-profiles/import`   | Allow | Allow         | Deny  | Import remains Admin/BM only                      |
| `POST /api/v1/client-profiles/reassign` | Allow | Allow         | Deny  | Reassignment remains Admin/BM only                |

## Audit Expectations

- User lifecycle actions must log actor ID, target user ID, action, and state mutation.
- Password resets must not log raw credentials or tokens.
- Authorization failures should return a consistent forbidden response shape through the global error handler.
- Route changes in these areas should not merge without matching test coverage for allowed and denied paths.
