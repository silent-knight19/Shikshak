import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../firebase/auth';
import {
  subscribeConversations,
  createConversation as fbCreateConv,
  deleteConversation as fbDeleteConv,
  renameConversation as fbRenameConv,
} from '../firebase/db';
import type { Conversation } from '../store/types';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const unsub = subscribeConversations(user.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
    }, (err) => {
      console.error('conversations subscription error', err);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const createConversation = useCallback(async (subject: string | null = null): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const id = await fbCreateConv(user.uid, subject);
    return id;
  }, [user]);

  const deleteConversation = useCallback(async (id: string) => {
    if (!user) return;
    await fbDeleteConv(user.uid, id);
  }, [user]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    if (!user) return;
    await fbRenameConv(user.uid, id, title);
  }, [user]);

  return { conversations, loading, createConversation, deleteConversation, renameConversation };
}
