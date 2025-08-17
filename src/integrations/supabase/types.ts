// Backend-agnostic types matching the Flask models (no Supabase internals)

// --------- JSON helper ---------
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// --------- Rows (reflect Flask SQLAlchemy models) ---------
export type ISODate = string; // e.g., "2025-08-17T10:20:30.000Z"
export type Role = "user" | "assistant";

export interface ChatRow {
  id: string;
  user_id: string;
  title: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  user_id: string;
  role: Role;            // 'user' | 'assistant'
  content: Json;         // Flask stores JSON string; API returns parsed JSON
  created_at: ISODate;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  read_at: ISODate | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface HelpRequestRow {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface PlanRow {
  id: string;
  name: string;
  price_cents: number | null;
  credits_v1: number | null;
  credits_v2: number | null;
  credits_v3: number | null;
  ocr_bill_limit: number | null;
  ocr_bank_limit: number | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ProfileRow {
  id: string;            // same as users.id
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  plan_id: string | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface UserCreditsRow {
  user_id: string;
  v1: number;
  v2: number;
  v3: number;
  ocr_bill: number;
  ocr_bank: number;
  last_reset_month: string; // YYYY-MM-01 (first of month)
  updated_at: ISODate;
}

export interface OcrBillExtractionRow {
  id: string;
  user_id: string;
  filename: string | null;
  file_url: string | null;
  data: Json;            // parsed JSON
  approved: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface OcrBankExtractionRow {
  id: string;
  user_id: string;
  filename: string | null;
  file_url: string | null;
  data: Json;            // parsed JSON
  approved: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

// --------- Insert payloads (what the UI typically sends) ---------
// Note: Flask injects id/user_id/timestamps; keep only fields you actually set from UI

export interface ChatInsert {
  title?: string;
  user_id?: string; // Flask injects if missing
}

export interface MessageInsert {
  chat_id: string;
  role: Role;
  content: Json;        // { text, version, meta }
  user_id?: string;     // Flask injects if missing
}

export interface NotificationInsert {
  title: string;
  body?: string | null;
  read_at?: ISODate | null;
  user_id?: string;
}

export interface HelpRequestInsert {
  subject: string;
  message: string;
  user_id?: string;
}

export interface PlanInsert {
  name: string;
  price_cents?: number | null;
  credits_v1?: number | null;
  credits_v2?: number | null;
  credits_v3?: number | null;
  ocr_bill_limit?: number | null;
  ocr_bank_limit?: number | null;
}

export interface ProfileInsert {
  id: string;             // required (profiles.id = users.id)
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  phone?: string | null;
  phone_verified?: boolean | null;
  plan_id?: string | null;
}

export interface UserCreditsInsert {
  user_id: string;
  v1?: number;
  v2?: number;
  v3?: number;
  ocr_bill?: number;
  ocr_bank?: number;
  last_reset_month?: string;
}

export interface OcrBillExtractionInsert {
  data: Json;
  filename?: string | null;
  file_url?: string | null;
  approved?: boolean;
}

export interface OcrBankExtractionInsert {
  data: Json;
  filename?: string | null;
  file_url?: string | null;
  approved?: boolean;
}

// --------- Update payloads ---------
export type ChatUpdate = Partial<Omit<ChatRow, "id" | "user_id" | "created_at">>;
export type MessageUpdate = Partial<Omit<MessageRow, "id" | "user_id" | "created_at">>;
export type NotificationUpdate = Partial<Omit<NotificationRow, "id" | "user_id" | "created_at">>;
export type HelpRequestUpdate = Partial<Omit<HelpRequestRow, "id" | "user_id" | "created_at">>;
export type PlanUpdate = Partial<Omit<PlanRow, "id" | "created_at">>;
export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at">>;
export type UserCreditsUpdate = Partial<Omit<UserCreditsRow, "user_id" | "updated_at">>;
export type OcrBillExtractionUpdate = Partial<Omit<OcrBillExtractionRow, "id" | "user_id" | "created_at">>;
export type OcrBankExtractionUpdate = Partial<Omit<OcrBankExtractionRow, "id" | "user_id" | "created_at">>;

// --------- Generic helpers (to keep existing code compiling) ---------
type RowMap = {
  chats: ChatRow;
  messages: MessageRow;
  notifications: NotificationRow;
  help_requests: HelpRequestRow;
  profiles: ProfileRow;
  plans: PlanRow;
  user_credits: UserCreditsRow;
  ocr_bill_extractions: OcrBillExtractionRow;
  ocr_bank_extractions: OcrBankExtractionRow;
};

type InsertMap = {
  chats: ChatInsert;
  messages: MessageInsert;
  notifications: NotificationInsert;
  help_requests: HelpRequestInsert;
  profiles: ProfileInsert;
  plans: PlanInsert;
  user_credits: UserCreditsInsert;
  ocr_bill_extractions: OcrBillExtractionInsert;
  ocr_bank_extractions: OcrBankExtractionInsert;
};

type UpdateMap = {
  chats: ChatUpdate;
  messages: MessageUpdate;
  notifications: NotificationUpdate;
  help_requests: HelpRequestUpdate;
  profiles: ProfileUpdate;
  plans: PlanUpdate;
  user_credits: UserCreditsUpdate;
  ocr_bill_extractions: OcrBillExtractionUpdate;
  ocr_bank_extractions: OcrBankExtractionUpdate;
};

// These mirror the generics you had before, but now map to our Flask rows.
export type Tables<K extends keyof RowMap> = RowMap[K];
export type TablesInsert<K extends keyof InsertMap> = InsertMap[K];
export type TablesUpdate<K extends keyof UpdateMap> = UpdateMap[K];

// Keep this export to avoid breaking any imports that referenced Constants
export const Constants = {
  public: {
    Enums: {},
  },
} as const;
