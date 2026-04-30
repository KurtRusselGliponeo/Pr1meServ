import type { MigrationDefinition } from './types';

const up = [
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
        CREATE TYPE agent_status AS ENUM ('Active', 'Terminated');
      END IF;
    END
    $$;
  `,
  `
    ALTER TABLE "AgentProfiles"
    ADD COLUMN IF NOT EXISTS "Status" agent_status NOT NULL DEFAULT 'Active';
  `,
  `
    ALTER TABLE "AgentProfiles"
    ALTER COLUMN "Status" SET DEFAULT 'Active';
  `,
];

const down = [
  `
    ALTER TABLE "AgentProfiles"
    DROP COLUMN IF EXISTS "Status";
  `,
  `
    DROP TYPE IF EXISTS agent_status;
  `,
];

export const agentStatusesMigration: MigrationDefinition = {
  id: '015_AgentStatuses',
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
