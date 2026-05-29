export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  description: string;
  isFree: boolean;
}

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  modelUsed?: string;
  isStreaming?: boolean;
  error?: boolean;
  fallbacked?: boolean;
  originalModel?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  created_at: Date;
}
