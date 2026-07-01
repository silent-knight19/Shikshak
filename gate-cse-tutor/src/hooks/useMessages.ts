import { useState, useEffect } from 'react';
import { useAuth } from '../firebase/auth';
import {
  subscribeMessages as fbSubscribeMsgs,
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

  return { messages, loading };
}
