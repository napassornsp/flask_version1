export type BotVersion = "V1" | "V2" | "V3";

export type MessageRole = "user" | "assistant";

export interface MessageContent {
  text: string;
  version: BotVersion;
  meta: Record<string, unknown>;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  role: MessageRole;
  content: MessageContent;
  created_at: string;
}

export interface Credits {
  v1: number;
  v2: number;
  v3: number;
}

export interface BackendService {
  signIn(email: string, password: string): Promise<{ error?: string }>; 
  signUp(email: string, password: string): Promise<{ error?: string }>;
  signOut(): Promise<void>;
  getSession(): Promise<{ userId: string | null }>;

  getCredits(): Promise<Credits>;

  createChat(title?: string): Promise<Chat>;
  renameChat(chatId: string, title: string): Promise<void>;
  deleteChat(chatId: string): Promise<void>;
  listChats(limit?: number, offset?: number): Promise<Chat[]>;

  listMessages(chatId: string, limit?: number, offset?: number): Promise<Message[]>;

  sendMessage(params: { chatId: string; version: BotVersion; text: string }): Promise<{ assistant: Message; credits: Credits }>;
  regenerate(params: { chatId: string; version: BotVersion; lastUserText: string }): Promise<{ assistant: Message; credits: Credits }>;
}
