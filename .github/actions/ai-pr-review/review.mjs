// AI PR Review using Claude
// Reads the git diff, asks Claude for a review, posts it as a PR comment.

import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Anthropic = require('/tmp/node_modules/@anthropic-ai/sdk');

const DIFF_PATH     = process.env.DIFF_PATH;
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const PR_NUMBER     = process.env.PR_NUMBER;
const REPO          = process.env.REPO;        // "owner/repo"
const API_KEY       = process.env.ANTHROPIC_API_KEY;

if (!DIFF_PATH || !GITHUB_TOKEN || !PR_NUMBER || !REPO || !API_KEY) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

// ── 1. Read diff ─────────────────────────────────────────────────────────────
const rawDiff = readFileSync(DIFF_PATH, 'utf8');

// Truncate very large diffs so we stay well inside context limits
const MAX_DIFF_CHARS = 30_000;
const diff = rawDiff.length > MAX_DIFF_CHARS
  ? rawDiff.slice(0, MAX_DIFF_CHARS) + '\n\n[diff truncated — showing first 30,000 chars]'
  : rawDiff;

if (!diff.trim()) {
  console.log('Diff is empty — skipping AI review.');
  process.exit(0);
}

// ── 2. Call Claude ────────────────────────────────────────────────────────────
const client = new Anthropic.default({ apiKey: API_KEY });

const SYSTEM_PROMPT = `You are a senior TypeScript/Node.js engineer reviewing a pull request for a
Fastify + Next.js + PostgreSQL (Drizzle ORM) branch-management application.

Focus on:
1. **Security** — auth gaps, missing role checks, SQL injection, unvalidated input, secrets in code.
2. **Correctness** — logic bugs, off-by-ones, race conditions, unhandled rejections.
3. **Type safety** — unsafe casts (\`as any\`, \`as never\`), missing null checks.
4. **Performance** — N+1 queries, missing indexes, unnecessary awaits in loops.
5. **Best practices** — Zod schema usage, transaction boundaries, audit log completeness.

Return a structured markdown report. Be specific — cite file names and line numbers where possible.
Keep praise brief; focus on actionable findings. Use these severity labels:
🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low / Suggestion`;

const USER_PROMPT = `Please review this pull request diff:\n\n\`\`\`diff\n${diff}\n\`\`\``;

console.log('Requesting AI review from Claude…');

let reviewBody;
try {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT }],
  });

  reviewBody = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
} catch (err) {
  console.error('Claude API error:', err.message);
  process.exit(1);
}

// ── 3. Post to GitHub ─────────────────────────────────────────────────────────
const [owner, repoName] = REPO.split('/');

const comment = [
  '## 🤖 AI Code Review',
  '',
  '> Automated review by Claude. This is a tool to assist human reviewers — not a replacement.',
  '',
  reviewBody,
  '',
  '---',
  `*Reviewed commit \`${process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown'}\`*`,
].join('\n');

// Find and replace existing bot review comment if present
const listRes = await fetch(
  `https://api.github.com/repos/${owner}/${repoName}/issues/${PR_NUMBER}/comments`,
  { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } },
);
const existingComments = await listRes.json();
const botComment = existingComments.find?.(c =>
  c.user?.type === 'Bot' && c.body?.includes('🤖 AI Code Review')
);

const url = botComment
  ? `https://api.github.com/repos/${owner}/${repoName}/issues/comments/${botComment.id}`
  : `https://api.github.com/repos/${owner}/${repoName}/issues/${PR_NUMBER}/comments`;

const method = botComment ? 'PATCH' : 'POST';

const postRes = await fetch(url, {
  method,
  headers: {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ body: comment }),
});

if (!postRes.ok) {
  const text = await postRes.text();
  console.error('Failed to post comment:', postRes.status, text);
  process.exit(1);
}

console.log(`AI review posted successfully (${method} ${url})`);
