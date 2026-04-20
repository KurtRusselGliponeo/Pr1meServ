import type { EventCatalog } from '@a1prime/schemas';

export const eventCatalog: EventCatalog = {
  version: '2026-04-20',
  events: [
    {
      name: 'client-profile.reassigned',
      description: 'Emitted when one or more client profiles are reassigned to another agent.',
      payloadSchemaRef: '#/components/schemas/WebhookEnvelope',
    },
    {
      name: 'cosaf.approval.updated',
      description: 'Emitted when a COSAF approval is approved or rejected.',
      payloadSchemaRef: '#/components/schemas/WebhookEnvelope',
    },
    {
      name: 'notification.email.sent',
      description: 'Emitted when an outbound notification email is sent successfully.',
      payloadSchemaRef: '#/components/schemas/WebhookEnvelope',
    },
    {
      name: 'notification.email.failed',
      description: 'Emitted when an outbound notification email fails.',
      payloadSchemaRef: '#/components/schemas/WebhookEnvelope',
    },
    {
      name: 'performance.metrics.generated',
      description: 'Represents the generated metrics payload published for downstream analytics consumers.',
      payloadSchemaRef: '#/components/schemas/WebhookEnvelope',
    },
    {
      name: 'user.lifecycle.updated',
      description: 'Emitted for create, restore, archive, and password-reset lifecycle operations.',
      payloadSchemaRef: '#/components/schemas/WebhookEnvelope',
    }
  ],
};
