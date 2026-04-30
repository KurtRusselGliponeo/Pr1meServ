import { AgentProfilePageClient } from '@/features/phase-4-agent-workbench/components/agent-profile-page-client';

interface AgentProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AgentProfilePage({ params }: AgentProfilePageProps) {
  const resolvedParams = await params;

  return <AgentProfilePageClient agentId={resolvedParams.id} />;
}
