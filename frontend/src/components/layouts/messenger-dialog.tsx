'use client';

import * as React from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGetAgents } from '@/features/phase-3-reassignment/hooks/use-get-agents';
import api from '@/services/api-client';

export function MessengerDialog() {
  const [open, setOpen] = React.useState(false);
  const [targetUserId, setTargetUserId] = React.useState('');
  const [message, setMessage] = React.useState('');
  const queryClient = useQueryClient();

  const agentsQuery = useGetAgents('');

  const sendMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/send', {
        userId: targetUserId,
        message,
      });
    },
    onSuccess: () => {
      toast.success('Message sent to agent.');
      setOpen(false);
      setTargetUserId('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-system-logs'] });
    },
    onError: () => {
      toast.error('Failed to send message.');
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full border-white/50 bg-background/70 shadow-soft backdrop-blur-sm dark:border-white/10 dark:bg-background/70"
          aria-label="Messenger"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-brand" />
            Direct Messenger
          </DialogTitle>
          <DialogDescription>
            Send a direct message or instruction to an agent. They will receive it as an in-app notification.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Select Agent</label>
            <select
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">Choose an agent...</option>
              {agentsQuery.data?.data.map((agent: any) => (
                <option key={agent.id} value={agent.userId}>
                  {agent.displayName} ({agent.agentCode})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Message</label>
            <textarea
              className="min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-full min-h-11">
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={() => sendMutation.mutate()} 
            disabled={!targetUserId || !message.trim() || sendMutation.isPending}
            className="rounded-full min-h-11 gap-2"
          >
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
