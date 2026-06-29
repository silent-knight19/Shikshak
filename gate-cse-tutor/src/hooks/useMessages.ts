import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../firebase/auth';
import {
  subscribeMessages as fbSubscribeMsgs,
  addUserMessage,
  createAssistantMessage,
  updateAssistantMessage,
  finalizeAssistantMessage,
} from '../firebase/db';
import type { FirestoreMessage } from '../store/types';

export function useMessages(convId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !convId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const unsub = fbSubscribeMsgs(user.uid, convId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      console.error('messages subscription error', err);
      setLoading(false);
    });

    return unsub;
  }, [user, convId]);

  const addUserMsg = useCallback(async (
    content: string,
    subject: string | null,
    attachments?: any[],
  ): Promise<string | null> => {
    if (!user || !convId) return null;
    return await addUserMessage(user.uid, convId, content, subject, attachments);
  }, [user, convId]);

  const createAssistantMsg = useCallback(async (
    subject: string | null,
  ): Promise<string | null> => {
    if (!user || !convId) return null;
    return await createAssistantMessage(user.uid, convId, subject);
  }, [user, convId]);

  const updateAssistantMsg = useCallback(async (
    msgId: string,
    updates: Parameters<typeof updateAssistantMessage>[3],
  ) => {
    if (!user || !convId) return;
    await updateAssistantMessage(user.uid, convId, msgId, updates);
  }, [user, convId]);

  const finalizeAssistantMsg = useCallback(async (
    msgId: string,
    content: string,
    thinkingTrace: string,
    tokens: { prompt: number; completion: number; thinking: number } | undefined,
  ) => {
    if (!user || !convId) return;
    await finalizeAssistantMessage(user.uid, convId, msgId, content, thinkingTrace, tokens);
  }, [user, convId]);

  return {
    messages,
    loading,
    addUserMsg,
    createAssistantMsg,
    updateAssistantMsg,
    finalizeAssistantMsg,
  };
}
