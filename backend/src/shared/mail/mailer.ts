import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import type { EmailQueuePayload } from '@a1prime/schemas';

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
        console.error("Failed to create access token", err);
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
  const transport = await createTransporter();
  return transport.sendMail({
    from: process.env.SMTP_USER || process.env.MAIL_FROM?.trim() || 'no-reply@a1prime.local',
    to: payload.to,
    replyTo: payload.replyTo,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
