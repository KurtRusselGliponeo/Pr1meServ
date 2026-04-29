import { randomUUID } from 'crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type {
  CreateUser,
  ListUsersQuery,
  ListUsersResponse,
  ManagedUser,
  UpdateUser,
  UserActionResponse,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import { agentProfiles, clientProfiles, systemAuditLogs, userAccounts } from '@/schema';
import { hashPassword } from '@/shared/lib/auth';
import { logSystemAudit } from '@/shared/lib/audit';
import { encryptEmail, hashEmail, normalizeEmail, decryptEmail } from '@/shared/lib/encryption';
import { emailQueueService } from '@/features/notifications/email-queue.service';

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

function roleNeedsLinkedProfile(role: ManagedUser['role']): boolean {
  return role === 'Agent' || role === 'BranchManager';
}

function buildLinkedProfileCode(role: ManagedUser['role'], userId: string) {
  const compactId = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const prefix = role === 'BranchManager' ? 'BM' : 'AG';
  return `${prefix}-${compactId}`;
}

function resolveRequestedBranchCode(input: CreateUser | UpdateUser): string | null {
  const branchCode = (input as CreateUser & UpdateUser & { branchCode?: string }).branchCode;
  return branchCode?.trim() || null;
}

function buildTemporaryPassword() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

function assertPrulifeEmail(email: string) {
  if (!email.toLowerCase().endsWith('@prulifeuk.com.ph')) {
    throw new BusinessRuleError('Agent accounts must use a PRU Life UK email address.');
  }
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
    const isAgent = input.role === 'Agent';
    const needsLinkedProfile = roleNeedsLinkedProfile(input.role);
    const requestedBranchCode = resolveRequestedBranchCode(input);

    if (isAgent) {
      assertPrulifeEmail(normalizedEmail);
    }

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
          needsPasswordReset: true,
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

      if (needsLinkedProfile) {
        await tx.insert(agentProfiles).values({
          userId: createdUser.id,
          agentCode: input.role === 'Agent' ? input.agentCode! : buildLinkedProfileCode(input.role, createdUser.id),
          branchCode: requestedBranchCode ?? 'BR-01',
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
            onboarding: needsLinkedProfile
              ? {
                  agentCode:
                    input.role === 'Agent' ? input.agentCode : buildLinkedProfileCode(input.role, createdUser.id),
                  branchCode: requestedBranchCode ?? 'BR-01',
                  temporaryPasswordSource: input.role === 'Agent' ? 'agentCode' : 'manual',
                }
              : {
                  temporaryPasswordSource: 'manual',
                },
          },
        },
        tx,
      );

      return mapManagedUser(createdUser);
    });
  }

  /**
   * Updates an existing user's mutable profile fields.
   *
   * @param userId Target user id.
   * @param input Validated update payload.
   * @param actorUserId Authenticated admin user id.
   * @returns The updated managed user.
   */
  async updateUser(userId: string, input: UpdateUser, actorUserId: string): Promise<ManagedUser> {
    return withDbTransaction('users.update', async (tx) => {
      const [existingUser] = await tx
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
        .where(eq(userAccounts.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new NotFoundError('User account was not found.');
      }

      const updatedAtUtc = new Date();
      const [updatedUser] = await tx
        .update(userAccounts)
        .set({
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: input.role,
          updatedAt: updatedAtUtc,
        })
        .where(eq(userAccounts.id, userId))
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

      const needsAgentProfile = roleNeedsLinkedProfile(input.role);
      const nextDisplayName = `${updatedUser.firstName} ${updatedUser.lastName}`.trim();
      const requestedBranchCode = resolveRequestedBranchCode(input);
      const [existingAgentProfile] = await tx
        .select({
          id: agentProfiles.id,
          agentCode: agentProfiles.agentCode,
          branchCode: agentProfiles.branchCode,
          deletedAtUtc: agentProfiles.deletedAtUtc,
        })
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, userId))
        .limit(1);

      if (existingUser.role === 'Agent' && input.role !== 'Agent' && existingAgentProfile) {
        const [assignedClientProfile] = await tx
          .select({ id: clientProfiles.id })
          .from(clientProfiles)
          .where(
            and(
              eq(clientProfiles.assignedAgentId, existingAgentProfile.id),
              isNull(clientProfiles.deletedAtUtc),
            ),
          )
          .limit(1);

        if (assignedClientProfile) {
          throw new BusinessRuleError(
            'Reassign the agent’s active client profiles before changing this role.',
          );
        }
      }

      if (needsAgentProfile && !existingAgentProfile) {
        await tx.insert(agentProfiles).values({
          userId,
          agentCode: buildLinkedProfileCode(input.role, userId),
          branchCode: requestedBranchCode ?? 'BR-01',
          displayName: nextDisplayName,
          updatedAt: updatedAtUtc,
        });
      } else if (needsAgentProfile && existingAgentProfile) {
        await tx
          .update(agentProfiles)
          .set({
            agentCode: existingAgentProfile.agentCode || buildLinkedProfileCode(input.role, userId),
            branchCode: requestedBranchCode ?? existingAgentProfile.branchCode ?? 'BR-01',
            displayName: nextDisplayName,
            deletedAtUtc: null,
            updatedAt: updatedAtUtc,
          })
          .where(eq(agentProfiles.id, existingAgentProfile.id));
      } else if (!needsAgentProfile && existingAgentProfile && !existingAgentProfile.deletedAtUtc) {
        await tx
          .update(agentProfiles)
          .set({
            deletedAtUtc: updatedAtUtc,
            updatedAt: updatedAtUtc,
          })
          .where(eq(agentProfiles.id, existingAgentProfile.id));
      }

      await logSystemAudit(
        {
          action: 'user.updated',
          userId: actorUserId,
          entityName: 'UserAccount',
          resourceId: userId,
          oldValue: {
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            role: existingUser.role,
          },
          newValue: {
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
          },
        },
        tx,
      );

      return mapManagedUser(updatedUser);
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
    if (userId === actorUserId) {
      throw new BusinessRuleError('You cannot archive your own account.');
    }

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

  /**
   * Restores a soft-deleted user account and any linked agent profile.
   *
   * @param userId Target user id.
   * @param actorUserId Authenticated admin user id.
   * @returns A confirmation payload.
   */
  async restoreUser(userId: string, actorUserId: string): Promise<UserActionResponse> {
    return withDbTransaction('users.restore', async (tx) => {
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

      if (!existingUser.deletedAtUtc) {
        throw new BusinessRuleError('User account is already active.');
      }

      const updatedAtUtc = new Date();

      await tx
        .update(userAccounts)
        .set({
          deletedAtUtc: null,
          updatedAt: updatedAtUtc,
        })
        .where(eq(userAccounts.id, userId));

      if (existingUser.role === 'Agent') {
        await tx
          .update(agentProfiles)
          .set({
            deletedAtUtc: null,
            updatedAt: updatedAtUtc,
          })
          .where(eq(agentProfiles.userId, userId));
      }

      await logSystemAudit(
        {
          action: 'user.restored',
          userId: actorUserId,
          entityName: 'UserAccount',
          resourceId: userId,
          oldValue: {
            email: decryptEmail(existingUser.encryptedEmail),
            deletedAtUtc: existingUser.deletedAtUtc.toISOString(),
          },
          newValue: {
            deletedAtUtc: null,
          },
        },
        tx,
      );

      return {
        message: 'User account restored.',
      };
    });
  }

  /**
   * Resets a user's password and sends the temporary password over the queued email channel.
   *
   * @param userId Target user id.
   * @param actorUserId Authenticated admin user id.
   * @returns A confirmation payload.
   */
  async resetPassword(userId: string, actorUserId: string): Promise<UserActionResponse> {
    const emailPayload = await withDbTransaction('users.reset-password', async (tx) => {
      const [existingUser] = await tx
        .select({
          id: userAccounts.id,
          encryptedEmail: userAccounts.encryptedEmail,
          firstName: userAccounts.firstName,
          deletedAtUtc: userAccounts.deletedAtUtc,
        })
        .from(userAccounts)
        .where(eq(userAccounts.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new NotFoundError('User account was not found.');
      }

      if (existingUser.deletedAtUtc) {
        throw new BusinessRuleError('Archived users cannot receive password resets.');
      }

      const temporaryPassword = buildTemporaryPassword();
      const updatedAtUtc = new Date();

      await tx
        .update(userAccounts)
        .set({
          passwordHash: await hashPassword(temporaryPassword),
          needsPasswordReset: true,
          refreshTokenHash: null,
          refreshTokenExpiresAtUtc: null,
          updatedAt: updatedAtUtc,
        })
        .where(eq(userAccounts.id, userId));

      await logSystemAudit(
        {
          action: 'user.password-reset',
          userId: actorUserId,
          entityName: 'UserAccount',
          resourceId: userId,
          newValue: {
            deliveredVia: 'queued-email',
            resetAtUtc: updatedAtUtc.toISOString(),
          },
        },
        tx,
      );

      return {
        to: decryptEmail(existingUser.encryptedEmail),
        subject: 'Your password has been reset',
        html: `<p>Hello ${existingUser.firstName},</p><p>Your temporary password is <strong>${temporaryPassword}</strong>.</p><p>Please sign in and change it as soon as possible.</p>`,
      };
    });

    await emailQueueService.enqueueEmail(emailPayload);

    return {
      message: 'Password reset initiated.',
    };
  }
}

export const usersService = new UsersService();
