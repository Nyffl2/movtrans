export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isPartial?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export enum AppMode {
  CHAT = 'chat',
  LIVE = 'live'
}
