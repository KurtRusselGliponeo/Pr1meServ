import type { MigrationDefinition } from './types';

const ORPHAN_POOL_USER_ID = '00000000-0000-0000-0000-0000000000aa';
const ORPHAN_POOL_AGENT_ID = '00000000-0000-0000-0000-0000000000ab';

const up = [
  `
    INSERT INTO "UserAccounts" (
      "Id",
      "EmailHash",
      "Email",
      "PasswordHash",
      "FirstName",
      "LastName",
      "SystemRole",
      "NeedsPasswordReset",
      "CreatedAtUtc",
      "UpdatedAtUtc"
    )
    VALUES (
      '${ORPHAN_POOL_USER_ID}',
      'f0c6dd7d3d9f4fc6987df08d4e9f8af2b6246f76f0ef963fdb3eb2ebf1f12b14',
      'orphan.pool@system.local',
      'orphan-pool-disabled',
      'Orphan',
      'Pool',
      'Agent',
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT ("EmailHash") DO NOTHING;
  `,
  `
    INSERT INTO "AgentProfiles" (
      "Id",
      "UserId",
      "AgentCode",
      "DisplayName",
      "Status",
      "CreatedAtUtc",
      "UpdatedAtUtc"
    )
    VALUES (
      '${ORPHAN_POOL_AGENT_ID}',
      '${ORPHAN_POOL_USER_ID}',
      'ORPHAN_POOL',
      'Orphan Pool',
      'Terminated',
      NOW(),
      NOW()
    )
    ON CONFLICT ("AgentCode") DO NOTHING;
  `,
];

const down = [
  `
    DELETE FROM "AgentProfiles"
    WHERE "AgentCode" = 'ORPHAN_POOL';
  `,
  `
    DELETE FROM "UserAccounts"
    WHERE "Id" = '${ORPHAN_POOL_USER_ID}';
  `,
];

export const orphanPoolAgentMigration: MigrationDefinition = {
  id: '016_OrphanPoolAgent',
  async up(sql) {
    for (const statement of up) {
      await sql.unsafe(statement);
    }
  },
  async down(sql) {
    for (const statement of down) {
      await sql.unsafe(statement);
    }
  },
};
