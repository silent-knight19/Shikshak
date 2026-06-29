export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface FirestoreMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  subject: string | null;
  attachments?: Attachment[];
  thinkingTrace: string;
  visualizationHTML?: string;
  tokens?: {
    prompt: number;
    completion: number;
    thinking: number;
  } | null;
  status: 'streaming' | 'completed' | 'error';
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  subject: string | null;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview: string;
  messageCount: number;
  totalTokens: { prompt: number; completion: number; thinking: number };
}

export interface StreamChunk {
  text: string;
  thought: boolean;
  done: boolean;
  tokenUsage?: {
    prompt: number;
    completion: number;
    thinking: number;
  };
  error?: string;
}

export interface Settings {
  model: string;
  temperature: number;
  thinkingLevel: 'off' | 'low' | 'medium' | 'high';
  visualiseMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  model: 'gemma-4-31b-it',
  temperature: 0.7,
  thinkingLevel: 'high',
  visualiseMode: false,
};

export type SubjectTag =
  | 'Digital Logic'
  | 'Computer Organization'
  | 'Data Structures'
  | 'Algorithms'
  | 'Theory of Computation'
  | 'Compiler Design'
  | 'Operating Systems'
  | 'Databases'
  | 'Computer Networks'
  | 'Discrete Mathematics'
  | 'Engineering Mathematics';

export const SUBJECT_TAGS: SubjectTag[] = [
  'Digital Logic',
  'Computer Organization',
  'Data Structures',
  'Algorithms',
  'Theory of Computation',
  'Compiler Design',
  'Operating Systems',
  'Databases',
  'Computer Networks',
  'Discrete Mathematics',
  'Engineering Mathematics',
];
