import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import type { EmailQueuePayload } from '@a1prime/schemas';
import { logger } from '@/lib/logger';

let customTransport: nodemailer.Transporter | null = null;

export function setMailTransport(nextTransport: nodemailer.Transporter) {
  customTransport = nextTransport;
}

const createTransporter = async () => {
  if (customTransport) return customTransport;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );
  
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  const accessToken = await new Promise<string>((resolve) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        void captureGmailFailure(err, {
          stage: 'oauth-access-token',
        });
        resolve('');
      } else {
        resolve(token || '');
      }
    });
  });

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.SMTP_USER,
      accessToken,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    }
  });
};

export async function sendQueuedEmail(payload: EmailQueuePayload) {
  try {
    const transport = await createTransporter();
    return await transport.sendMail({
      from: process.env.SMTP_USER || process.env.MAIL_FROM?.trim() || 'no-reply@a1prime.local',
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } catch (error) {
    await captureGmailFailure(error, {
      stage: 'send-mail',
      to: payload.to,
      subject: payload.subject,
    });
    throw error;
  }
}

async function captureGmailFailure(
  error: unknown,
  context: {
    stage: 'oauth-access-token' | 'send-mail';
    subject?: string;
    to?: string;
  },
) {
  logger.error(
    {
      err: error,
      mailProvider: 'gmail',
      stage: context.stage,
      to: context.to,
      subject: context.subject,
    },
    'Gmail notification failure',
  );

  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    const sentryModule = (await import('@sentry/node')) as {
      captureException?: (error: unknown, captureContext?: Record<string, unknown>) => void;
    };

    sentryModule.captureException?.(error, {
      tags: {
        'mail.provider': 'gmail',
        'mail.stage': context.stage,
      },
      extra: {
        subject: context.subject,
        recipient: context.to,
      },
    });
  } catch {
    logger.warn('Unable to forward Gmail failure to Sentry.');
  }
}
