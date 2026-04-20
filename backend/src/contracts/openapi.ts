import type { EventCatalog } from '@a1prime/schemas';

export function buildOpenApiDocument(eventCatalog: EventCatalog) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Client Reassignment System API',
      version: '1.0.0',
      description: 'Published API contract for auth, client profile, metrics, and integration surfaces.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'auth' },
      { name: 'client-profiles' },
      { name: 'metrics' },
      { name: 'contracts' },
    ],
    paths: {
      '/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'Authenticate and create a session',
          responses: {
            '200': { description: 'Login response' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/client-profiles': {
        get: {
          tags: ['client-profiles'],
          summary: 'List client profiles',
          responses: {
            '200': { description: 'Paginated client profile list' },
          },
        },
      },
      '/metrics': {
        get: {
          tags: ['metrics'],
          summary: 'Get aggregated performance metrics',
          responses: {
            '200': { description: 'Aggregated performance metrics' },
          },
        },
      },
      '/metrics/leaderboard': {
        get: {
          tags: ['metrics'],
          summary: 'Get leaderboard metrics',
          responses: {
            '200': { description: 'Leaderboard response' },
          },
        },
      },
      '/contracts/openapi.json': {
        get: {
          tags: ['contracts'],
          summary: 'Publish the OpenAPI document',
          responses: {
            '200': { description: 'OpenAPI JSON document' },
          },
        },
      },
      '/contracts/events': {
        get: {
          tags: ['contracts'],
          summary: 'Publish the event catalog for webhooks and integrations',
          responses: {
            '200': { description: 'Event catalog JSON' },
          },
        },
      },
    },
    components: {
      schemas: {
        WebhookEnvelope: {
          type: 'object',
          required: ['id', 'event', 'occurredAtUtc', 'version', 'source', 'deliveryStatus', 'payload'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            event: { type: 'string', enum: eventCatalog.events.map((event) => event.name) },
            occurredAtUtc: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            source: { type: 'string' },
            deliveryStatus: { type: 'string', enum: ['pending', 'delivered', 'failed'] },
            payload: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  };
}
