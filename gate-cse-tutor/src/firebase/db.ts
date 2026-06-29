import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,

  setDoc,
  increment,
  query,
  orderBy,
  limit,

  onSnapshot,
  serverTimestamp,

  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { Conversation, FirestoreMessage } from '../store/types';
import { generateTitle } from '../utils/title-generator';

const SPECIAL_EMAIL = 'sachinsinghtomar7749@gmail.com';
const MAX_CONVERSATIONS = 50;

function userRef(uid: string) {
  return doc(db, 'users', uid);
}

function conversationsCol(uid: string) {
  return collection(db, 'users', uid, 'conversations');
}

function conversationDoc(uid: string, convId: string) {
  return doc(db, 'users', uid, 'conversations', convId);
}

function messagesCol(uid: string, convId: string) {
  return collection(db, 'users', uid, 'conversations', convId, 'messages');
}

function messageDoc(uid: string, convId: string, msgId: string) {
  return doc(db, 'users', uid, 'conversations', convId, 'messages', msgId);
}

export function subscribeConversations(
  uid: string,
  onData: (convs: Conversation[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(
    conversationsCol(uid),
    orderBy('updatedAt', 'desc'),
    limit(200),
  );
  return onSnapshot(q,
    (snapshot) => {
      const convs: Conversation[] = snapshot.docs.map(d => {
        const d2 = d.data();
        return {
          id: d.id,
          title: d2.title ?? '',
          subject: d2.subject ?? null,
          createdAt: d2.createdAt?.toMillis() ?? 0,
          updatedAt: d2.updatedAt?.toMillis() ?? 0,
          lastMessagePreview: d2.lastMessagePreview ?? '',
          messageCount: d2.messageCount ?? 0,
          totalTokens: d2.totalTokens ?? { prompt: 0, completion: 0, thinking: 0 },
        };
      });
      onData(convs);
    },
    onError,
  );
}

export function subscribeMessages(
  uid: string,
  convId: string,
  onData: (msgs: FirestoreMessage[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(
    messagesCol(uid, convId),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q,
    (snapshot) => {
      const msgs: FirestoreMessage[] = snapshot.docs.map(d => {
        const d2 = d.data();
        return {
          id: d.id,
          role: d2.role,
          content: d2.content ?? '',
          subject: d2.subject ?? null,
          attachments: d2.attachments ?? [],
          thinkingTrace: d2.thinkingTrace ?? '',
          visualizationHTML: d2.visualizationHTML ?? undefined,
          tokens: d2.tokens ?? undefined,
          status: d2.status ?? 'completed',
          createdAt: d2.createdAt?.toMillis() ?? 0,
        };
      });
      onData(msgs);
    },
    onError,
  );
}

export async function createConversation(
  uid: string,
  subject: string | null,
): Promise<string> {
  const ref = await addDoc(conversationsCol(uid), {
    title: 'New conversation',
    subject,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessagePreview: '',
    messageCount: 0,
    totalTokens: { prompt: 0, completion: 0, thinking: 0 },
  });
  enforceConversationLimit(uid);
  return ref.id;
}

async function enforceConversationLimit(uid: string) {
  const snap = await getDocs(query(
    conversationsCol(uid),
    orderBy('updatedAt', 'desc'),
  ));
  const userSnap = await getDoc(userRef(uid));
  const email = userSnap.data()?.email ?? '';
  const max = email === SPECIAL_EMAIL ? Infinity : MAX_CONVERSATIONS;
  if (snap.docs.length > max) {
    const toDelete = snap.docs.slice(max);
    const batch = writeBatch(db);
    for (const d of toDelete) {
      const childMsgs = await getDocs(messagesCol(uid, d.id));
      for (const m of childMsgs.docs) {
        batch.delete(m.ref);
      }
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}

export async function deleteConversation(uid: string, convId: string) {
  const msgSnap = await getDocs(messagesCol(uid, convId));
  const batch = writeBatch(db);
  for (const m of msgSnap.docs) {
    batch.delete(m.ref);
  }
  batch.delete(conversationDoc(uid, convId));
  await batch.commit();
}

export async function renameConversation(uid: string, convId: string, title: string) {
  await updateDoc(conversationDoc(uid, convId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export async function addUserMessage(
  uid: string,
  convId: string,
  content: string,
  subject: string | null,
  attachments?: any[],
): Promise<string> {
  const ref = await addDoc(messagesCol(uid, convId), {
    role: 'user',
    content,
    subject,
    attachments: attachments ?? [],
    thinkingTrace: '',
    tokens: null,
    status: 'completed',
    createdAt: serverTimestamp(),
  });

  try {
    await updateDoc(conversationDoc(uid, convId), {
      title: generateTitle(content),
      updatedAt: serverTimestamp(),
      lastMessagePreview: content.slice(0, 100),
      messageCount: increment(1),
    });
  } catch (err) {
    // Conversation doc might not exist yet in edge cases; create it
    const convData = {
      title: generateTitle(content),
      subject,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessagePreview: content.slice(0, 100),
      messageCount: 1,
      totalTokens: { prompt: 0, completion: 0, thinking: 0 },
    };
    await setDoc(conversationDoc(uid, convId), convData);
  }

  return ref.id;
}

export async function createAssistantMessage(
  uid: string,
  convId: string,
  subject: string | null,
): Promise<string> {
  const ref = await addDoc(messagesCol(uid, convId), {
    role: 'assistant',
    content: '',
    subject,
    attachments: [],
    thinkingTrace: '',
    tokens: null,
    status: 'streaming',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssistantMessage(
  uid: string,
  convId: string,
  msgId: string,
  updates: {
    content?: string;
    thinkingTrace?: string;
    tokens?: { prompt: number; completion: number; thinking: number } | null;
    status?: 'streaming' | 'completed' | 'error';
  },
) {
  await updateDoc(messageDoc(uid, convId, msgId), updates);
}

export async function finalizeAssistantMessage(
  uid: string,
  convId: string,
  msgId: string,
  content: string,
  thinkingTrace: string,
  tokens: { prompt: number; completion: number; thinking: number } | undefined,
) {
  await updateDoc(messageDoc(uid, convId, msgId), {
    content,
    thinkingTrace,
    tokens: tokens ?? null,
    status: 'completed',
  });
  await updateDoc(conversationDoc(uid, convId), {
    updatedAt: serverTimestamp(),
    totalTokens: tokens ?? { prompt: 0, completion: 0, thinking: 0 },
  });
}

export async function getUserSettings(uid: string) {
  const snap = await getDoc(userRef(uid));
  return snap.data()?.settings ?? null;
}

export async function saveUserSettings(uid: string, settings: Record<string, any>) {
  await setDoc(userRef(uid), { settings }, { merge: true });
}
