import { randomUUID } from 'crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { CreateUser, ListUsersQuery, ListUsersResponse, ManagedUser } from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import { agentProfiles, clientProfiles, systemAuditLogs, userAccounts } from '@/schema';
import { hashPassword } from '@/shared/lib/auth';
import { logSystemAudit } from '@/shared/lib/audit';
import { encryptEmail, hashEmail, normalizeEmail, decryptEmail } from '@/shared/lib/encryption';

type UserRow = {
  id: string;
  encryptedEmail: string;
  firstName: string;
  lastName: string;
  role: ManagedUser['role'];
  createdAtUtc: Date;
  updatedAtUtc: Date;
  deletedAtUtc: Date | null;
};

function mapManagedUser(row: UserRow): ManagedUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: decryptEmail(row.encryptedEmail),
    role: row.role,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
    deletedAtUtc: row.deletedAtUtc?.toISOString() ?? null,
  };
}

function buildAgentCode() {
  return `AG-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/**
 * Provides admin-facing user management operations.
 */
export class UsersService {
  /**
   * Returns a paginated user list.
   *
   * @param query Validated pagination and role filters.
   * @returns A paginated user response.
   */
  async listUsers(query: ListUsersQuery): Promise<ListUsersResponse> {
    const offset = (query.page - 1) * query.pageSize;
    const conditions = [];

    if (query.role) {
      conditions.push(eq(userAccounts.role, query.role));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: userAccounts.id,
          encryptedEmail: userAccounts.encryptedEmail,
          firstName: userAccounts.firstName,
          lastName: userAccounts.lastName,
          role: userAccounts.role,
          createdAtUtc: userAccounts.createdAt,
          updatedAtUtc: userAccounts.updatedAt,
          deletedAtUtc: userAccounts.deletedAtUtc,
        })
        .from(userAccounts)
        .where(whereClause)
        .orderBy(desc(userAccounts.createdAt))
        .limit(query.pageSize)
        .offset(offset),
      db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(userAccounts)
        .where(whereClause),
    ]);

    const total = totalRows[0]?.total ?? 0;

    return {
      data: rows.map(mapManagedUser),
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        hasNextPage: offset + rows.length < total,
      },
    };
  }

  /**
   * Creates a new user account and provisions an AgentProfile when needed.
   *
   * @param input Validated user-creation payload.
   * @param actorUserId Authenticated admin user id.
   * @returns The created managed user.
   * @throws {BusinessRuleError} When a user with the same email already exists.
   */
  async createUser(input: CreateUser, actorUserId: string): Promise<ManagedUser> {
    const normalizedEmail = normalizeEmail(input.email);
    const emailHashValue = hashEmail(normalizedEmail);

    const [existingUser] = await db
      .select({ id: userAccounts.id })
      .from(userAccounts)
      .where(eq(userAccounts.emailHash, emailHashValue))
      .limit(1);

    if (existingUser) {
      throw new BusinessRuleError('A user with that email already exists.');
    }

    return withDbTransaction('users.create', async (tx) => {
      const [createdUser] = await tx
        .insert(userAccounts)
        .values({
          emailHash: emailHashValue,
          encryptedEmail: encryptEmail(normalizedEmail),
          passwordHash: await hashPassword(input.password),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: input.role,
          updatedAt: new Date(),
        })
        .returning({
          id: userAccounts.id,
          encryptedEmail: userAccounts.encryptedEmail,
          firstName: userAccounts.firstName,
          lastName: userAccounts.lastName,
          role: userAccounts.role,
          createdAtUtc: userAccounts.createdAt,
          updatedAtUtc: userAccounts.updatedAt,
          deletedAtUtc: userAccounts.deletedAtUtc,
        });

      if (input.role === 'Agent') {
        await tx.insert(agentProfiles).values({
          userId: createdUser.id,
          agentCode: buildAgentCode(),
          displayName: `${createdUser.firstName} ${createdUser.lastName}`.trim(),
          updatedAt: new Date(),
        });
      }

      await logSystemAudit(
        {
          action: 'user.created',
          userId: actorUserId,
          entityName: 'UserAccount',
          resourceId: createdUser.id,
          newValue: {
            role: createdUser.role,
            email: decryptEmail(createdUser.encryptedEmail),
          },
        },
        tx,
      );

      return mapManagedUser(createdUser);
    });
  }

  /**
   * Soft-deletes a user account and any linked agent profile.
   *
   * @param userId Target user id.
   * @param actorUserId Authenticated admin user id.
   * @returns A completion promise.
   * @throws {NotFoundError} When the user does not exist.
   */
  async softDeleteUser(userId: string, actorUserId: string): Promise<void> {
    await withDbTransaction('users.soft-delete', async (tx) => {
      const [existingUser] = await tx
        .select({
          id: userAccounts.id,
          encryptedEmail: userAccounts.encryptedEmail,
          role: userAccounts.role,
          deletedAtUtc: userAccounts.deletedAtUtc,
        })
        .from(userAccounts)
        .where(eq(userAccounts.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new NotFoundError('User account was not found.');
      }

      const deletedAtUtc = new Date();

      await tx
        .update(userAccounts)
        .set({
          deletedAtUtc,
          updatedAt: deletedAtUtc,
        })
        .where(eq(userAccounts.id, userId));

      const [linkedAgent] = await tx
        .select({
          id: agentProfiles.id,
        })
        .from(agentProfiles)
        .where(and(eq(agentProfiles.userId, userId), isNull(agentProfiles.deletedAtUtc)))
        .limit(1);

      await tx
        .update(agentProfiles)
        .set({
          deletedAtUtc,
          updatedAt: deletedAtUtc,
        })
        .where(and(eq(agentProfiles.userId, userId), isNull(agentProfiles.deletedAtUtc)));

      if (existingUser.role === 'Agent' && linkedAgent) {
        const orphanedProfiles = await tx
          .select({
            id: clientProfiles.id,
            assignedAgentId: clientProfiles.assignedAgentId,
          })
          .from(clientProfiles)
          .where(and(eq(clientProfiles.assignedAgentId, linkedAgent.id), isNull(clientProfiles.deletedAtUtc)));

        if (orphanedProfiles.length > 0) {
          await tx
            .update(clientProfiles)
            .set({
              assignedAgentId: null,
              caseStatus: 'Orphan',
              updatedAt: deletedAtUtc,
            })
            .where(eq(clientProfiles.assignedAgentId, linkedAgent.id));

          await tx.insert(systemAuditLogs).values(
            orphanedProfiles.map((profile) => ({
              actorUserId: actorUserId,
              action: 'client-profile.orphaned',
              entityName: 'ClientProfile',
              entityId: profile.id,
              oldValue: {
                assignedAgentId: profile.assignedAgentId,
              },
              newValue: {
                assignedAgentId: null,
                caseStatus: 'Orphan',
              },
            })),
          );
        }
      }

      await logSystemAudit(
        {
          action: 'user.soft-deleted',
          userId: actorUserId,
          entityName: 'UserAccount',
          resourceId: userId,
          oldValue: {
            email: decryptEmail(existingUser.encryptedEmail),
            deletedAtUtc: existingUser.deletedAtUtc?.toISOString() ?? null,
          },
          newValue: {
            deletedAtUtc: deletedAtUtc.toISOString(),
          },
        },
        tx,
      );
    });
  }
}

export const usersService = new UsersService();
