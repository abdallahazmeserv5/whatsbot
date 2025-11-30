/**
 * TypeScript interfaces and types for WhatsApp features
 */

// Bulk Messaging Types
export interface BulkSendRequest {
  sessionId: string;
  numbers: string[];
  message: string;
}

export interface BulkSendResult {
  number: string;
  status: "success" | "failed";
  error?: string;
}

export interface BulkSendResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors: BulkSendResult[];
  results: BulkSendResult[];
}

// Broadcast Types
export interface BroadcastCreateRequest {
  sessionId: string;
  name: string;
  numbers: string[];
}

export interface BroadcastGroupInfo {
  id: string;
  broadcastJid: string;
  members: string[];
  memberCount: number;
}

export interface BroadcastCreateResponse {
  id: string;
  name: string;
  groupCount: number;
  totalMembers: number;
  groups: BroadcastGroupInfo[];
}

export interface BroadcastSendRequest {
  message: string;
}

export interface BroadcastSendResponse {
  success: boolean;
  groupsSent: number;
  totalRecipients: number;
  errors: string[];
}

export interface BroadcastListInfo {
  id: string;
  name: string;
  groupCount: number;
  totalMembers: number;
  createdAt: Date;
  updatedAt: Date;
}
