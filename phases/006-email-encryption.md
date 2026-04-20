# ADR 006: AES-256-GCM Encryption for PII (Email Addresses)

**Date:** 2026-04-20  
**Status:** Accepted  
**Deciders:** Backend team, Security review

---

## Context

The system stores user email addresses, which are personally identifiable information (PII) under GDPR and the Philippine Data Privacy Act. A data breach exposing the `UserAccounts` table must not leak plaintext email addresses.

We also need to look up users by email (login flow), which rules out one-way hashing alone.

## Decision

We use a **two-column strategy**:

1. **`EmailHash`** — SHA-256 hex hash of the normalised email. Used for deterministic lookups (`WHERE EmailHash = $1`). Cannot be reversed to recover the email.
2. **`Email` (stored as `encryptedEmail`)** — AES-256-GCM ciphertext of the normalised email. Used to recover the plaintext email for display, JWT payloads, and outbound email delivery.

The encryption key is derived from `ENCRYPTION_KEY` (preferred) or `JWT_SECRET` (fallback) via `crypto.createHash('sha256')` to produce a 32-byte key.

## Reasons

1. **GDPR compliance** — Encrypted at-rest PII satisfies Article 32 (security of processing). A stolen database backup without the encryption key is useless.
2. **Deterministic lookup** — SHA-256 hash allows `WHERE EmailHash = hashEmail(input)` without decrypting every row. Login is O(1) via the unique index on `EmailHash`.
3. **AES-256-GCM** — Authenticated encryption. The auth tag prevents ciphertext tampering. GCM is NIST-approved and hardware-accelerated on modern CPUs.
4. **IV per encryption** — `crypto.randomBytes(16)` generates a fresh IV for every `encryptEmail()` call. The same email encrypted twice produces different ciphertext, preventing frequency analysis.
5. **Serialised payload** — The encrypted email is stored as `iv.authTag.ciphertext` in a single `TEXT` column — no schema changes needed if we rotate keys.

## Consequences

- Every read of a user's email requires a `decryptEmail()` call. This is fast (microseconds) but means email addresses are never in plaintext in the DB.
- Key rotation requires re-encrypting all `Email` column values. A migration script must be written before any key change.
- The `ENCRYPTION_KEY` environment variable must be treated as a secret and rotated independently from `JWT_SECRET`. Store it in a secrets manager (Infisical, Vault, or GitHub Secrets) — never in `.env` files committed to version control.
- Email normalisation (`trim().toLowerCase()`) is applied before both hashing and encryption to ensure `Agent@Example.COM` and `agent@example.com` produce the same hash.

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| Plaintext email storage | Fails GDPR Article 32; unacceptable for insurance industry data |
| bcrypt hash only | Non-reversible — cannot recover email for sending notifications |
| Column-level DB encryption (pgcrypto) | Encryption key lives in the DB — compromised DB = compromised key |
| Envelope encryption (KMS) | Correct for large-scale systems; adds cloud vendor dependency and latency for our current scale |
