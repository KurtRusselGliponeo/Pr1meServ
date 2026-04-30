import { and, asc, eq, ilike, isNotNull, lte, or } from 'drizzle-orm';

import type {
  CreateProspect,
  ListProspectsQuery,
  ListProspectsResponse,
  Prospect,
  ProspectPipelineStage,
  UpdateProspect,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import { agentProfiles, prospects } from '@/schema';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { AuthTokenPayload } from '@/shared/lib/auth';

type ProspectRow = {
  id: string;
  agentCode: string;
  branchCode: string;
  clientName: string;
  contactNumber: string;
  email: string | null;
  temperature: Prospect['temperature'];
  pipelineStage: ProspectPipelineStage;
  notes: string | null;
  followUpDateUtc: Date | null;
  lastContactedAtUtc: Date | null;
  createdAtUtc: Date;
  updatedAtUtc: Date;
};

function mapProspect(row: ProspectRow): Prospect {
  return {
    id: row.id,
    agentCode: row.agentCode,
    branchCode: row.branchCode,
    clientName: row.clientName,
    contactNumber: row.contactNumber,
    email: row.email,
    temperature: row.temperature,
    pipelineStage: row.pipelineStage,
    notes: row.notes,
    followUpDateUtc: row.followUpDateUtc?.toISOString() ?? null,
    lastContactedAtUtc: row.lastContactedAtUtc?.toISOString() ?? null,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
  };
}

export class ProspectsService {
  private async getActorBranchCode(authUser: AuthTokenPayload): Promise<string | null> {
    if (!authUser.agentId) {
      return null;
    }

    const [agentProfile] = await db
      .select({ branchCode: agentProfiles.branchCode })
      .from(agentProfiles)
      .where(eq(agentProfiles.id, authUser.agentId))
      .limit(1);

    return agentProfile?.branchCode ?? null;
  }

  private async getScopedProspect(prospectId: string, authUser: AuthTokenPayload): Promise<ProspectRow> {
    const actorBranchCode =
      authUser.role === 'BranchManager' ? await this.getActorBranchCode(authUser) : null;
    const [existingProspect] = await db
      .select({
        id: prospects.id,
        agentCode: prospects.agentCode,
        branchCode: prospects.branchCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        email: prospects.email,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
        notes: prospects.notes,
        followUpDateUtc: prospects.followUpDateUtc,
        lastContactedAtUtc: prospects.lastContactedAtUtc,
        createdAtUtc: prospects.createdAt,
        updatedAtUtc: prospects.updatedAt,
      })
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);

    if (!existingProspect) {
      throw new NotFoundError('Prospect was not found.');
    }

    if (authUser.role === 'Agent' && authUser.agentCode !== existingProspect.agentCode) {
      throw new ForbiddenError('You can only access your own prospects.');
    }

    if (authUser.role === 'BranchManager' && actorBranchCode && actorBranchCode !== existingProspect.branchCode) {
      throw new ForbiddenError('Branch Managers can only access prospects in their own branch.');
    }

    return existingProspect;
  }

  private async resolveTargetAgent(
    authUser: AuthTokenPayload,
    requestedAgentCode?: string | null,
  ): Promise<{ agentCode: string; branchCode: string }> {
    const agentCode = authUser.role === 'Agent' ? authUser.agentCode : requestedAgentCode?.trim() || null;

    if (!agentCode) {
      throw new ForbiddenError('Select an agent before saving this prospect.');
    }

    const [agentProfile] = await db
      .select({
        agentCode: agentProfiles.agentCode,
        branchCode: agentProfiles.branchCode,
      })
      .from(agentProfiles)
      .where(eq(agentProfiles.agentCode, agentCode))
      .limit(1);

    if (!agentProfile) {
      throw new NotFoundError('The selected agent was not found.');
    }

    if (authUser.role === 'BranchManager') {
      const actorBranchCode = await this.getActorBranchCode(authUser);
      if (!actorBranchCode || actorBranchCode !== agentProfile.branchCode) {
        throw new ForbiddenError('Branch Managers can only create prospects for agents in their own branch.');
      }
    }

    return {
      agentCode: agentProfile.agentCode,
      branchCode: agentProfile.branchCode,
    };
  }

  async listProspects(
    authUser: AuthTokenPayload,
    query: ListProspectsQuery,
  ): Promise<ListProspectsResponse> {
    const actorBranchCode =
      authUser.role === 'BranchManager' ? await this.getActorBranchCode(authUser) : null;
    const effectiveAgentCode =
      authUser.role === 'Agent'
        ? authUser.agentCode
        : query.agentCode?.trim() || undefined;
    const conditions = [];

    if (effectiveAgentCode) {
      conditions.push(eq(prospects.agentCode, effectiveAgentCode));
    }

    if (authUser.role === 'BranchManager') {
      if (!actorBranchCode) {
        throw new ForbiddenError('Branch Managers must be linked to a branch profile.');
      }
      conditions.push(eq(prospects.branchCode, actorBranchCode));
    }

    if (query.temperature) {
      conditions.push(eq(prospects.temperature, query.temperature));
    }

    if (query.pipelineStage) {
      conditions.push(eq(prospects.pipelineStage, query.pipelineStage));
    }

    if (query.search?.trim()) {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(prospects.clientName, searchTerm),
          ilike(prospects.contactNumber, searchTerm),
          ilike(prospects.agentCode, searchTerm),
          ilike(prospects.email, searchTerm),
          ilike(prospects.notes, searchTerm),
        )!,
      );
    }

    if (query.dueOnly) {
      conditions.push(and(isNotNull(prospects.followUpDateUtc), lte(prospects.followUpDateUtc, new Date()))!);
    }

    const rows = await db
      .select({
        id: prospects.id,
        agentCode: prospects.agentCode,
        branchCode: prospects.branchCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        email: prospects.email,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
        notes: prospects.notes,
        followUpDateUtc: prospects.followUpDateUtc,
        lastContactedAtUtc: prospects.lastContactedAtUtc,
        createdAtUtc: prospects.createdAt,
        updatedAtUtc: prospects.updatedAt,
      })
      .from(prospects)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(prospects.pipelineStage), asc(prospects.followUpDateUtc), asc(prospects.clientName));

    return { data: rows.map(mapProspect) };
  }

  async createProspect(input: CreateProspect, authUser: AuthTokenPayload): Promise<Prospect> {
    const targetAgent = await this.resolveTargetAgent(authUser, input.agentCode);
    const now = new Date();
    const [createdProspect] = await db
      .insert(prospects)
      .values({
        agentCode: targetAgent.agentCode,
        branchCode: targetAgent.branchCode,
        clientName: input.clientName.trim(),
        contactNumber: input.contactNumber.trim(),
        email: input.email?.trim() || null,
        temperature: input.temperature,
        pipelineStage: input.pipelineStage,
        notes: input.notes?.trim() || null,
        followUpDateUtc: input.followUpDateUtc ? new Date(input.followUpDateUtc) : null,
        lastContactedAtUtc: input.pipelineStage === 'Contacted' ? now : null,
        updatedAt: now,
      })
      .returning({
        id: prospects.id,
        agentCode: prospects.agentCode,
        branchCode: prospects.branchCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        email: prospects.email,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
        notes: prospects.notes,
        followUpDateUtc: prospects.followUpDateUtc,
        lastContactedAtUtc: prospects.lastContactedAtUtc,
        createdAtUtc: prospects.createdAt,
        updatedAtUtc: prospects.updatedAt,
      });

    return mapProspect(createdProspect);
  }

  async updateProspectStage(
    prospectId: string,
    pipelineStage: ProspectPipelineStage,
    authUser: AuthTokenPayload,
  ): Promise<Prospect> {
    const existingProspect = await this.getScopedProspect(prospectId, authUser);
    const [updatedProspect] = await db
      .update(prospects)
      .set({
        pipelineStage,
        lastContactedAtUtc:
          pipelineStage === 'Contacted'
            ? new Date()
            : existingProspect.lastContactedAtUtc,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, prospectId))
      .returning({
        id: prospects.id,
        agentCode: prospects.agentCode,
        branchCode: prospects.branchCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        email: prospects.email,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
        notes: prospects.notes,
        followUpDateUtc: prospects.followUpDateUtc,
        lastContactedAtUtc: prospects.lastContactedAtUtc,
        createdAtUtc: prospects.createdAt,
        updatedAtUtc: prospects.updatedAt,
      });

    return mapProspect(updatedProspect);
  }

  async updateProspect(
    prospectId: string,
    input: UpdateProspect,
    authUser: AuthTokenPayload,
  ): Promise<Prospect> {
    await this.getScopedProspect(prospectId, authUser);

    const [updatedProspect] = await db
      .update(prospects)
      .set({
        clientName: input.clientName?.trim(),
        contactNumber: input.contactNumber?.trim(),
        email: input.email?.trim() || (input.email === null ? null : undefined),
        temperature: input.temperature,
        pipelineStage: input.pipelineStage,
        notes: input.notes?.trim() || (input.notes === null ? null : undefined),
        followUpDateUtc:
          input.followUpDateUtc === undefined
            ? undefined
            : input.followUpDateUtc
              ? new Date(input.followUpDateUtc)
              : null,
        lastContactedAtUtc: input.pipelineStage === 'Contacted' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, prospectId))
      .returning({
        id: prospects.id,
        agentCode: prospects.agentCode,
        branchCode: prospects.branchCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        email: prospects.email,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
        notes: prospects.notes,
        followUpDateUtc: prospects.followUpDateUtc,
        lastContactedAtUtc: prospects.lastContactedAtUtc,
        createdAtUtc: prospects.createdAt,
        updatedAtUtc: prospects.updatedAt,
      });

    return mapProspect(updatedProspect);
  }
}

export const prospectsService = new ProspectsService();
