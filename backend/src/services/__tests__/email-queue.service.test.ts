import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queueAddMock, sendQueuedEmailMock } = vi.hoisted(() => ({
  queueAddMock: vi.fn().mockResolvedValue(undefined),
  sendQueuedEmailMock: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
}));

vi.mock('@/queues/notification.queue', () => ({
  notificationQueue: {
    add: queueAddMock,
  },
}));

vi.mock('@/shared/mail/mailer', () => ({
  sendQueuedEmail: sendQueuedEmailMock,
}));

import { EmailQueueService } from '@/services/email-queue.service';

describe('EmailQueueService', () => {
  beforeEach(() => {
    queueAddMock.mockClear();
    sendQueuedEmailMock.mockClear();
  });

  it('enqueues validated email jobs onto BullMQ', async () => {
    const service = new EmailQueueService();

    await service.enqueueEmail({
      to: 'agent@example.com',
      subject: 'Welcome',
      text: 'Hello agent',
    });

    expect(queueAddMock).toHaveBeenCalledWith('send-email', {
      to: 'agent@example.com',
      subject: 'Welcome',
      text: 'Hello agent',
    });
  });

  it('processes a valid queued email job', async () => {
    const service = new EmailQueueService();

    await service.processEmailJob({
      to: 'agent@example.com',
      subject: 'Queued message',
      html: '<p>Hello</p>',
    });

    expect(sendQueuedEmailMock).toHaveBeenCalledOnce();
  });

  it('rejects jobs without text or html content', async () => {
    const service = new EmailQueueService();

    await expect(
      service.processEmailJob({
        to: 'agent@example.com',
        subject: 'Missing body',
      } as never),
    ).rejects.toThrow('Email jobs require either text or html content.');
  });

  it('rejects jobs with an invalid recipient email', async () => {
    const service = new EmailQueueService();

    await expect(
      service.enqueueEmail({
        to: 'not-an-email',
        subject: 'Invalid',
        text: 'Hello',
      } as never),
    ).rejects.toThrow();
  });

  it('surfaces downstream transport failures', async () => {
    sendQueuedEmailMock.mockRejectedValueOnce(new Error('SMTP unavailable'));
    const service = new EmailQueueService();

    await expect(
      service.processEmailJob({
        to: 'agent@example.com',
        subject: 'Transport failure',
        text: 'Retry me',
      }),
    ).rejects.toThrow('SMTP unavailable');
  });
});
