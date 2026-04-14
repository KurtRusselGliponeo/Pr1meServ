import type { Sql } from 'postgres';

export interface MigrationDefinition {
  id: string;
  up: (sql: Sql) => Promise<void>;
  down: (sql: Sql) => Promise<void>;
}
