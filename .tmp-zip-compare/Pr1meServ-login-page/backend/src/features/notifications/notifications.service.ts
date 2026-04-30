import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';

import type {
  AdminOverviewResponse,
  AdminSearchResponse,
  AdminSystemLogsResponse,
  NotificationLogsResponse,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import {
  agentProfiles,
  clientProfiles,
  cosafApprovals,
  notifications,
  systemAuditLogs,
  userAccounts,
} from '@/schema';

function toStatus(action: string): 'queued' | 'sent' | 'failed' {
  if (action === 'email.sent') {
    return 'sent';
  }

  if (action === 'email.failed') {
    return 'failed';
  }

  return 'queued';
}

function toLogCategory(action: string):
  | 'new-policy'
  | 'upload'
  | 'return'
  | 'approval'
  | 'reassignment'
  | 'notification'
  | 'user' {
  if (action.includes('upload') || action.includes('document')) {
    return 'upload';
  }

  if (action.includes('return') || action.includes('reject')) {
    return 'return';
  }

  if (action.includes('approve') || action.includes('signed')) {
    return 'approval';
  }

  if (action.includes('reassign') || action.includes('orphan') || action.includes('delist')) {
    return 'reassignment';
  }

  if (action.includes('policy')) {
    return 'new-policy';
  }

  if (action.startsWith('user.')) {
    return 'user';
  }

  return 'notification';
}

export class NotificationsService {
  async getNotificationLogs(): Promise<NotificationLogsResponse> {
    const [auditRows, notificationRows] = await Promise.all([
      db
      .select({
        id: systemAuditLogs.id,
        action: systemAuditLogs.action,
        newValue: systemAuditLogs.newValue,
        createdAtUtc: systemAuditLogs.createdAt,
      })
      .from(systemAuditLogs)
      .where(inArray(systemAuditLogs.action, ['email.enqueued', 'email.sent', 'email.failed']))
      .orderBy(desc(systemAuditLogs.createdAt)),
      db
        .select({
          id: notifications.id,
          subject: notifications.subject,
          message: notifications.message,
          status: notifications.status,
          createdAtUtc: notifications.createdAtUtc,
        })
        .from(notifications)
        .orderBy(desc(notifications.createdAtUtc)),
    ]);

    return {
      data: [
        ...auditRows.map((row) => ({
          id: row.id,
          action: row.action,
          recipient: String(row.newValue?.to ?? 'unknown@local'),
          subject: String(row.newValue?.subject ?? 'No subject'),
          status: toStatus(row.action),
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
        ...notificationRows.map((row) => ({
          id: row.id,
          action: 'notification.recorded',
          recipient: 'in-app',
          subject: row.subject,
          status: row.status as 'queued' | 'sent' | 'failed',
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
      ].sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc)),
    };
  }

  async getAdminSystemLogs(): Promise<AdminSystemLogsResponse> {
    const [auditRows, notificationRows] = await Promise.all([
      db
        .select({
          id: systemAuditLogs.id,
          action: systemAuditLogs.action,
          entityName: systemAuditLogs.entityName,
          entityId: systemAuditLogs.entityId,
          actorUserId: systemAuditLogs.actorUserId,
          oldValue: systemAuditLogs.oldValue,
          newValue: systemAuditLogs.newValue,
          createdAtUtc: systemAuditLogs.createdAt,
        })
        .from(systemAuditLogs)
        .orderBy(desc(systemAuditLogs.createdAt))
        .limit(40),
      db
        .select({
          id: notifications.id,
          subject: notifications.subject,
          message: notifications.message,
          status: notifications.status,
          userId: notifications.userId,
          createdAtUtc: notifications.createdAtUtc,
        })
        .from(notifications)
        .orderBy(desc(notifications.createdAtUtc))
        .limit(20),
    ]);

    return {
      data: [
        ...auditRows.map((row) => ({
          id: row.id,
          source: 'audit' as const,
          category: toLogCategory(row.action),
          action: row.action,
          title: row.action.replace(/[.-]/g, ' '),
          description:
            String(row.newValue?.summary ?? row.newValue?.reason ?? row.oldValue?.reason ?? row.entityName),
          actorUserId: row.actorUserId,
          entityName: row.entityName,
          entityId: row.entityId,
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
        ...notificationRows.map((row) => ({
          id: row.id,
          source: 'notification' as const,
          category: 'notification' as const,
          action: `notification.${row.status}`,
          title: row.subject,
          description: row.message,
          actorUserId: row.userId,
          entityName: 'Notification',
          entityId: row.id,
          createdAtUtc: row.createdAtUtc.toISOString(),
        })),
      ]
        .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc))
        .slice(0, 50),
    };
  }

  async searchAgentsAndClients(query: string): Promise<AdminSearchResponse> {
    const searchTerm = `%${query.trim()}%`;

    const [agentRows, clientRows] = await Promise.all([
      db
        .select({
          id: agentProfiles.id,
          displayName: agentProfiles.displayName,
          agentCode: agentProfiles.agentCode,
          branchCode: agentProfiles.branchCode,
        })
        .from(agentProfiles)
        .where(
          and(
            isNull(agentProfiles.deletedAtUtc),
            or(
              ilike(agentProfiles.displayName, searchTerm),
              ilike(agentProfiles.agentCode, searchTerm),
              ilike(agentProfiles.branchCode, searchTerm),
            )!,
          ),
        )
        .orderBy(agentProfiles.displayName)
        .limit(8),
      db
        .select({
          id: clientProfiles.id,
          firstName: clientProfiles.firstName,
          lastName: clientProfiles.lastName,
          policyNumber: clientProfiles.policyNumber,
          branchCode: clientProfiles.branchCode,
          caseStatus: clientProfiles.caseStatus,
        })
        .from(clientProfiles)
        .where(
          and(
            isNull(clientProfiles.deletedAtUtc),
            or(
              ilike(clientProfiles.firstName, searchTerm),
              ilike(clientProfiles.lastName, searchTerm),
              ilike(clientProfiles.policyNumber, searchTerm),
            )!,
          ),
        )
        .orderBy(desc(clientProfiles.updatedAt))
        .limit(8),
    ]);

    return {
      data: [
        ...agentRows.map((row) => ({
          id: row.id,
          type: 'agent' as const,
          title: row.displayName,
          subtitle: `${row.agentCode} · ${row.branchCode}`,
          href: `/dashboard/agents/${row.id}`,
          metadata: {
            agentCode: row.agentCode,
            branchCode: row.branchCode,
          },
        })),
        ...clientRows.map((row) => ({
          id: row.id,
          type: 'client' as const,
          title: `${row.firstName} ${row.lastName}`.trim(),
          subtitle: `${row.policyNumber} · ${row.caseStatus} · ${row.branchCode}`,
          href: `/dashboard/cosaf?clientId=${row.id}`,
          metadata: {
            policyNumber: row.policyNumber,
            caseStatus: row.caseStatus,
            branchCode: row.branchCode,
          },
        })),
      ],
    };
  }

  async getAdminOverview(): Promise<AdminOverviewResponse> {
    const [userCounts, activeAgentsRow, orphanRow, pendingApprovalsRow, returnedRow, formsSubmittedRow, branchRows] =
      await Promise.all([
        db
          .select({
            activeUsers: sql<number>`count(*) filter (where ${userAccounts.deletedAtUtc} is null)::int`,
            archivedUsers: sql<number>`count(*) filter (where ${userAccounts.deletedAtUtc} is not null)::int`,
          })
          .from(userAccounts),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(agentProfiles)
          .where(and(isNull(agentProfiles.deletedAtUtc), eq(agentProfiles.status, 'Active'))),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(clientProfiles)
          .where(
            and(
              isNull(clientProfiles.deletedAtUtc),
              isNull(clientProfiles.assignedAgentId),
              eq(clientProfiles.caseStatus, 'Orphan'),
            ),
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(cosafApprovals)
          .where(eq(cosafApprovals.status, 'PENDING')),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(clientProfiles)
          .where(and(isNull(clientProfiles.deletedAtUtc), eq(clientProfiles.caseStatus, 'Returned'))),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(clientProfiles)
          .where(
            and(isNull(clientProfiles.deletedAtUtc), eq(clientProfiles.caseStatus, 'Forms Submitted')),
          ),
        db
          .select({
            branchCode: clientProfiles.branchCode,
            orphanClients: sql<number>`count(*) filter (where ${clientProfiles.assignedAgentId} is null and ${clientProfiles.caseStatus} = 'Orphan')::int`,
            formsSubmitted: sql<number>`count(*) filter (where ${clientProfiles.caseStatus} = 'Forms Submitted')::int`,
            returnedCases: sql<number>`count(*) filter (where ${clientProfiles.caseStatus} = 'Returned')::int`,
          })
          .from(clientProfiles)
          .where(isNull(clientProfiles.deletedAtUtc))
          .groupBy(clientProfiles.branchCode),
      ]);

    const agentCountsByBranch = await db
      .select({
        branchCode: agentProfiles.branchCode,
        activeAgents: sql<number>`count(*)::int`,
      })
      .from(agentProfiles)
      .where(and(isNull(agentProfiles.deletedAtUtc), eq(agentProfiles.status, 'Active')))
      .groupBy(agentProfiles.branchCode);

    const pendingApprovalsByBranch = await db
      .select({
        branchCode: clientProfiles.branchCode,
        pendingApprovals: sql<number>`count(*)::int`,
      })
      .from(cosafApprovals)
      .innerJoin(clientProfiles, eq(clientProfiles.id, cosafApprovals.clientProfileId))
      .where(and(eq(cosafApprovals.status, 'PENDING'), isNull(clientProfiles.deletedAtUtc)))
      .groupBy(clientProfiles.branchCode);

    const agentMap = new Map(agentCountsByBranch.map((row) => [row.branchCode, row.activeAgents]));
    const approvalsMap = new Map(
      pendingApprovalsByBranch.map((row) => [row.branchCode, row.pendingApprovals]),
    );

    return {
      totals: {
        activeUsers: userCounts[0]?.activeUsers ?? 0,
        archivedUsers: userCounts[0]?.archivedUsers ?? 0,
        activeAgents: activeAgentsRow[0]?.count ?? 0,
        orphanClients: orphanRow[0]?.count ?? 0,
        pendingApprovals: pendingApprovalsRow[0]?.count ?? 0,
        returnedCases: returnedRow[0]?.count ?? 0,
        formsSubmitted: formsSubmittedRow[0]?.count ?? 0,
      },
      branches: branchRows
        .map((row) => ({
          branchCode: row.branchCode,
          activeAgents: agentMap.get(row.branchCode) ?? 0,
          orphanClients: row.orphanClients,
          pendingApprovals: approvalsMap.get(row.branchCode) ?? 0,
          formsSubmitted: row.formsSubmitted,
          returnedCases: row.returnedCases,
        }))
        .sort((left, right) => left.branchCode.localeCompare(right.branchCode)),
    };
  }
}

export const notificationsService = new NotificationsService();
