import { z } from 'zod';

export const webhookEventNameSchema = z.enum([
  'client-profile.reassigned',
  'cosaf.approval.updated',
  'notification.email.sent',
  'notification.email.failed',
  'performance.metrics.generated',
  'user.lifecycle.updated',
]);
export type WebhookEventName = z.infer<typeof webhookEventNameSchema>;

export const webhookDeliveryStatusSchema = z.enum(['pending', 'delivered', 'failed']);

export const webhookEnvelopeSchema = z.object({
  id: z.string().uuid(),
  event: webhookEventNameSchema,
  occurredAtUtc: z.string().datetime(),
  version: z.literal('2026-04-20'),
  source: z.literal('client-reassignment-system'),
  deliveryStatus: webhookDeliveryStatusSchema,
  payload: z.record(z.string(), z.unknown()),
});
export type WebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;

export const webhookSubscriptionSchema = z.object({
  id: z.string().uuid(),
  targetUrl: z.string().url(),
  secret: z.string().min(24),
  events: z.array(webhookEventNameSchema).min(1),
  enabled: z.boolean(),
});
export type WebhookSubscription = z.infer<typeof webhookSubscriptionSchema>;

export const eventCatalogItemSchema = z.object({
  name: webhookEventNameSchema,
  description: z.string().min(1),
  payloadSchemaRef: z.string().min(1),
});
export type EventCatalogItem = z.infer<typeof eventCatalogItemSchema>;

export const eventCatalogSchema = z.object({
  version: z.literal('2026-04-20'),
  events: z.array(eventCatalogItemSchema),
});
export type EventCatalog = z.infer<typeof eventCatalogSchema>;
