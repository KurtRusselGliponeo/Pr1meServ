import nodemailer from 'nodemailer';

import type { EmailQueuePayload } from '@a1prime/schemas';

let transport: nodemailer.Transporter = nodemailer.createTransport({
  jsonTransport: true,
});

/**
 * Overrides the default mail transport for tests or explicit runtime configuration.
 *
 * @param nextTransport Nodemailer transport implementation.
 */
export function setMailTransport(nextTransport: nodemailer.Transporter) {
  transport = nextTransport;
}

/**
 * Sends an email message using the configured mail transport.
 *
 * @param payload Validated email payload from the notification queue.
 * @returns Nodemailer send result metadata.
 */
export async function sendQueuedEmail(payload: EmailQueuePayload) {
  return transport.sendMail({
    from: process.env.MAIL_FROM?.trim() || 'no-reply@a1prime.local',
    to: payload.to,
    replyTo: payload.replyTo,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
