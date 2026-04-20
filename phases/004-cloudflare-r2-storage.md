# ADR 004: Cloudflare R2 for Private File Storage

**Date:** 2026-04-20  
**Status:** Accepted  
**Deciders:** Backend team

---

## Context

The COSAF import workflow requires secure storage for uploaded branch import files (PDF, JPEG, PNG — up to 20 MB). Files must be:
- Stored privately (not publicly accessible via URL)
- Accessible via time-limited signed URLs (15 minutes for import review)
- S3-compatible so we can use the `@aws-sdk/client-s3` without a vendor lock-in

## Decision

We chose **Cloudflare R2** as the private object storage backend.

## Reasons

1. **Zero egress fees** — R2 does not charge for data egress. AWS S3 egress costs accumulate quickly for frequent signed URL downloads of large insurance documents.
2. **S3 API compatibility** — R2 is fully S3-compatible. Our `R2Service` uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` — switching to S3 in the future requires only a credential change, not a code change.
3. **Presigned URL support** — `getSignedObjectUrl` generates 15-minute URLs for secure client-side download without routing file bytes through the API server.
4. **Private buckets by default** — Files are inaccessible without a signed URL. No accidental public exposure.
5. **No separate CDN needed** — Cloudflare's network serves as the CDN layer automatically.

## Consequences

- Five environment variables are required: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ENDPOINT`. The endpoint must be the R2-specific `https://<account-id>.r2.cloudflarestorage.com` URL.
- The `R2Service` class lazy-initialises the S3 client on first use (`ensureInitialized()`). This prevents startup failures when R2 credentials are not configured in local development.
- File type is verified server-side using `file-type` (magic bytes detection) — not the `Content-Type` header — to prevent MIME type spoofing on uploads.

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| AWS S3 | Egress fees; more complex IAM policy management |
| Supabase Storage | Ties storage to Supabase auth; adds another vendor dependency |
| Local filesystem | Not viable for multi-instance deployments; no signed URL support |
| Google Cloud Storage | Less ergonomic S3-compat layer; higher per-operation cost |
