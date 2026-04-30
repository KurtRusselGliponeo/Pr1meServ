import { captureException } from '@sentry/core';
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

  const accessToken = await new Promise<string>((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject(err);
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
    const maskedEmail = payload.to.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    captureException(error, {
      tags: { feature: 'cosaf-reassignment' },
      level: 'error',
      extra: {
        subject: payload.subject,
        recipient: maskedEmail,
      },
    });

    logger.error(
      {
        err: error,
        mailProvider: 'gmail',
        to: payload.to,
        subject: payload.subject,
      },
      'Gmail notification failure',
    );
    throw error;
  }
}
