import { and, asc, eq, ilike, isNull, or } from 'drizzle-orm';

import type {
  AgentStatus,
  AgentLookupResponse,
  AgentProfile,
  DelistAgentResponse,
  ListAgentsQuery,
  UpdateAgentProfile,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import { agentProfiles, ape, clientProfiles, nap, systemAuditLogs, userAccounts } from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import { decryptEmail, encryptEmail, hashEmail, normalizeEmail } from '@/shared/lib/encryption';

const ORPHAN_POOL_AGENT_CODE = 'ORPHAN_POOL';

type AgentProfileRow = {
  id: string;
  userId: string;
  encryptedEmail: string;
  firstName: string;
  lastName: string;
  displayName: string;
  agentCode: string;
  status: AgentStatus;
  role: AgentProfile['role'];
  createdAtUtc: Date;
  updatedAtUtc: Date;
};

function mapAgentProfile(
  row: AgentProfileRow,
  auditTrail: AgentProfile['auditTrail'],
): AgentProfile {
  return {
    id: row.id,
    userId: row.userId,
    email: decryptEmail(row.encryptedEmail),
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    agentCode: row.agentCode,
    status: row.status,
    role: row.role,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
    auditTrail,
  };
}

/**
 * Provides agent profile queries and mutations.
 */
export class AgentsService {
  private async getAgentProfileRecord(agentId: string): Promise<AgentProfileRow | null> {
    const [record] = await db
      .select({
        id: agentProfiles.id,
        userId: userAccounts.id,
        encryptedEmail: userAccounts.encryptedEmail,
        firstName: userAccounts.firstName,
        lastName: userAccounts.lastName,
        displayName: agentProfiles.displayName,
        agentCode: agentProfiles.agentCode,
        status: agentProfiles.status,
        role: userAccounts.role,
        createdAtUtc: agentProfiles.createdAt,
        updatedAtUtc: agentProfiles.updatedAt,
      })
      .from(agentProfiles)
      .innerJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
      .where(
        and(
          eq(agentProfiles.id, agentId),
          isNull(agentProfiles.deletedAtUtc),
          isNull(userAccounts.deletedAtUtc),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  /**
   * Returns a single agent profile and recent audit trail entries.
   *
   * @param agentId Target agent profile id.
   * @returns The hydrated agent profile.
   * @throws {NotFoundError} When the agent profile does not exist.
   */
  async getAgentProfile(agentId: string): Promise<AgentProfile> {
    const record = await this.getAgentProfileRecord(agentId);

    if (!record) {
      throw new NotFoundError('Agent profile was not found.');
    }

    const auditRows = await db
      .select({
        id: systemAuditLogs.id,
        action: systemAuditLogs.action,
        createdAtUtc: systemAuditLogs.createdAt,
      })
      .from(systemAuditLogs)
      .where(
        and(eq(systemAuditLogs.entityName, 'AgentProfile'), eq(systemAuditLogs.entityId, agentId)),
      )
      .orderBy(asc(systemAuditLogs.createdAt));

    return mapAgentProfile(
      record,
      auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        actorName: 'System',
        timestampUtc: row.createdAtUtc.toISOString(),
        summary: row.action.replace(/\./g, ' '),
      })),
    );
  }

  async listAgents(query: ListAgentsQuery): Promise<AgentLookupResponse> {
    const conditions = [isNull(agentProfiles.deletedAtUtc), isNull(userAccounts.deletedAtUtc)];

    if (query.search) {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(agentProfiles.displayName, searchTerm),
          ilike(agentProfiles.agentCode, searchTerm),
          ilike(userAccounts.firstName, searchTerm),
          ilike(userAccounts.lastName, searchTerm),
        )!,
      );
    }

    const rows = await db
      .select({
        id: agentProfiles.id,
        displayName: agentProfiles.displayName,
        agentCode: agentProfiles.agentCode,
        status: agentProfiles.status,
        encryptedEmail: userAccounts.encryptedEmail,
      })
      .from(agentProfiles)
      .innerJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
      .where(and(eq(agentProfiles.status, 'Active'), ...conditions))
      .orderBy(asc(agentProfiles.displayName))
      .limit(query.limit);

    return {
      data: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        agentCode: row.agentCode,
        email: decryptEmail(row.encryptedEmail),
        status: row.status,
      })),
    };
  }

  /**
   * Updates agent-facing identity fields and records an audit log entry.
   *
   * @param agentId Target agent profile id.
   * @param input Validated profile update payload.
   * @param actorUserId Authenticated user id performing the update.
   * @returns The updated agent profile.
   */
  async updateAgentProfile(
    agentId: string,
    input: UpdateAgentProfile,
    actorUserId: string,
  ): Promise<AgentProfile> {
    return withDbTransaction('agents.update-profile', async (tx) => {
      const [existing] = await tx
        .select({
          agentId: agentProfiles.id,
          userId: userAccounts.id,
          encryptedEmail: userAccounts.encryptedEmail,
          firstName: userAccounts.firstName,
          lastName: userAccounts.lastName,
          displayName: agentProfiles.displayName,
          agentCode: agentProfiles.agentCode,
          status: agentProfiles.status,
          role: userAccounts.role,
          createdAtUtc: agentProfiles.createdAt,
          updatedAtUtc: agentProfiles.updatedAt,
        })
        .from(agentProfiles)
        .innerJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
        .where(
          and(
            eq(agentProfiles.id, agentId),
            isNull(agentProfiles.deletedAtUtc),
            isNull(userAccounts.deletedAtUtc),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Agent profile was not found.');
      }

      const normalizedEmail = normalizeEmail(input.email);
      const updatedAt = new Date();

      await tx
        .update(userAccounts)
        .set({
          encryptedEmail: encryptEmail(normalizedEmail),
          emailHash: hashEmail(normalizedEmail),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          updatedAt,
        })
        .where(eq(userAccounts.id, existing.userId));

      await tx
        .update(agentProfiles)
        .set({
          displayName: input.displayName.trim(),
          updatedAt,
        })
        .where(eq(agentProfiles.id, existing.agentId));

      await logSystemAudit(
        {
          action: 'agent-profile.updated',
          userId: actorUserId,
          entityName: 'AgentProfile',
          resourceId: agentId,
          oldValue: {
            email: decryptEmail(existing.encryptedEmail),
            firstName: existing.firstName,
            lastName: existing.lastName,
            displayName: existing.displayName,
          },
          newValue: {
            email: normalizedEmail,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            displayName: input.displayName.trim(),
          },
        },
        tx,
      );

      return this.getAgentProfile(agentId);
    });
  }

  async delistAgent(targetAgentCode: string, actorUserId: string): Promise<DelistAgentResponse> {
    const normalizedAgentCode = targetAgentCode.trim();

    if (!normalizedAgentCode) {
      throw new BusinessRuleError('Target agent code is required.');
    }

    if (normalizedAgentCode === ORPHAN_POOL_AGENT_CODE) {
      throw new BusinessRuleError('The orphan pool cannot be delisted.');
    }

    return withDbTransaction('agents.delist-agent', async (tx) => {
      const [existingAgent] = await tx
        .select({
          id: agentProfiles.id,
          userId: agentProfiles.userId,
          agentCode: agentProfiles.agentCode,
          status: agentProfiles.status,
        })
        .from(agentProfiles)
        .where(
          and(
            eq(agentProfiles.agentCode, normalizedAgentCode),
            isNull(agentProfiles.deletedAtUtc),
          ),
        )
        .limit(1);

      if (!existingAgent) {
        throw new NotFoundError('Agent profile was not found.');
      }

      if (existingAgent.status === 'Terminated') {
        throw new BusinessRuleError('This agent is already terminated.');
      }

      const updatedAt = new Date();

      const orphanedClientRows = await tx
        .update(clientProfiles)
        .set({
          assignedAgentId: null,
          caseStatus: 'Orphan',
          updatedAt,
        })
        .where(eq(clientProfiles.assignedAgentId, existingAgent.id))
        .returning({ id: clientProfiles.id });

      const migratedNapRows = await tx
        .update(nap)
        .set({
          agentCode: ORPHAN_POOL_AGENT_CODE,
          agentName: 'Orphan Pool',
          updatedAtUtc: updatedAt,
        })
        .where(eq(nap.agentCode, normalizedAgentCode))
        .returning({ id: nap.id });

      const migratedApeRows = await tx
        .update(ape)
        .set({
          agentCode: ORPHAN_POOL_AGENT_CODE,
          updatedAtUtc: updatedAt,
        })
        .where(eq(ape.agentCode, normalizedAgentCode))
        .returning({ id: ape.id });

      await tx
        .update(agentProfiles)
        .set({
          status: 'Terminated',
          updatedAt,
        })
        .where(eq(agentProfiles.id, existingAgent.id));

      await logSystemAudit(
        {
          action: 'agent.delisted',
          userId: actorUserId,
          entityName: 'AgentProfile',
          resourceId: existingAgent.id,
          oldValue: {
            agentCode: existingAgent.agentCode,
            status: existingAgent.status,
          },
          newValue: {
            agentCode: existingAgent.agentCode,
            status: 'Terminated',
            orphanPoolAgentCode: ORPHAN_POOL_AGENT_CODE,
            orphanedClientProfiles: orphanedClientRows.length,
            migratedNapRecords: migratedNapRows.length,
            migratedApeRecords: migratedApeRows.length,
          },
        },
        tx,
      );

      return {
        targetAgentCode: existingAgent.agentCode,
        agentStatus: 'Terminated',
        orphanedClientProfiles: orphanedClientRows.length,
        migratedNapRecords: migratedNapRows.length,
        migratedApeRecords: migratedApeRows.length,
      };
    });
  }
}

export const agentsService = new AgentsService();
