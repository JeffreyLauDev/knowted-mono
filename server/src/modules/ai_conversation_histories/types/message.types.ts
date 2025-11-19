export enum MessageRole {
  HUMAN = "human",
  AI = "ai",
}

export interface MessageContent {
  role?: MessageRole;
  content: string;
  additional_kwargs: Record<string, never>;
  response_metadata: Record<string, never>;
}
