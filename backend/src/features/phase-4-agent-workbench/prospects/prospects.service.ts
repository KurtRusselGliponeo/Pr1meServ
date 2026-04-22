import { and, asc, eq } from 'drizzle-orm';

import type {
  ListProspectsQuery,
  ListProspectsResponse,
  Prospect,
  ProspectPipelineStage,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import { prospects } from '@/schema';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

type ProspectRow = {
  id: string;
  agentCode: string;
  clientName: string;
  contactNumber: string;
  temperature: Prospect['temperature'];
  pipelineStage: ProspectPipelineStage;
  createdAtUtc: Date;
  updatedAtUtc: Date;
};

function mapProspect(row: ProspectRow): Prospect {
  return {
    id: row.id,
    agentCode: row.agentCode,
    clientName: row.clientName,
    contactNumber: row.contactNumber,
    temperature: row.temperature,
    pipelineStage: row.pipelineStage,
    createdAtUtc: row.createdAtUtc.toISOString(),
    updatedAtUtc: row.updatedAtUtc.toISOString(),
  };
}

export class ProspectsService {
  async listProspects(
    authUser: { role: string; agentCode: string | null },
    query: ListProspectsQuery,
  ): Promise<ListProspectsResponse> {
    const effectiveAgentCode =
      authUser.role === 'Agent' ? authUser.agentCode : query.agentCode ?? authUser.agentCode;

    const conditions = effectiveAgentCode ? [eq(prospects.agentCode, effectiveAgentCode)] : [];
    const rows = await db
      .select({
        id: prospects.id,
        agentCode: prospects.agentCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
        createdAtUtc: prospects.createdAt,
        updatedAtUtc: prospects.updatedAt,
      })
      .from(prospects)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(prospects.pipelineStage), asc(prospects.clientName));

    return { data: rows.map(mapProspect) };
  }

  async updateProspectStage(
    prospectId: string,
    pipelineStage: ProspectPipelineStage,
    authUser: { role: string; agentCode: string | null },
  ): Promise<Prospect> {
    const [existingProspect] = await db
      .select({
        id: prospects.id,
        agentCode: prospects.agentCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
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
      throw new ForbiddenError('You can only update your own prospects.');
    }

    const [updatedProspect] = await db
      .update(prospects)
      .set({
        pipelineStage,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, prospectId))
      .returning({
        id: prospects.id,
        agentCode: prospects.agentCode,
        clientName: prospects.clientName,
        contactNumber: prospects.contactNumber,
        temperature: prospects.temperature,
        pipelineStage: prospects.pipelineStage,
        createdAtUtc: prospects.createdAt,
        updatedAtUtc: prospects.updatedAt,
      });

    return mapProspect(updatedProspect);
  }
}

export const prospectsService = new ProspectsService();
