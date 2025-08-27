export interface Event {
  id: string;
  code: string;
  password_hash: string;
  name: string;
  venue: string;
  start_at: string;
  end_at: string;
  pdf_url: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Slot {
  id: string;
  event_id: string;
  t_at: string;
  title: string;
  desc: string;
  type: 'announce' | 'ask';
  order_idx: number;
  dispatched_at?: string;
  created_at: string;
}

export interface Question {
  id: string;
  slot_id: string;
  text: string;
  kind: 'text' | 'audio' | 'photo';
  required: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  nickname: string;
  team: string;
  push_endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface Answer {
  id: string;
  participant_id: string;
  slot_id: string;
  text?: string;
  audio_url?: string;
  photo_url?: string;
  tags: string[];
  summary_2: string[];
  created_at: string;
}

export interface Report {
  id: string;
  participant_id: string;
  event_id: string;
  status: 'pending' | 'generated' | 'failed';
  web_url?: string;
  pdf_url?: string;
  generated_at?: string;
  created_at: string;
}

export interface SlotWithQuestions extends Slot {
  questions: Question[];
}

export interface EventWithSlots extends Event {
  slots: SlotWithQuestions[];
}

export interface AIProposedSlot {
  t_at: string;
  title: string;
  desc: string;
  type: 'ask' | 'announce';
  questions: {
    text: string;
    kind: 'text' | 'audio' | 'photo';
  }[];
  announce?: string;
}

export interface AIProposedSlots {
  slots: AIProposedSlot[];
}

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface AnswerSummary {
  summary_2: string[];
  tags: string[];
}

export interface ReportContent {
  timeline: Array<{
    slot_title: string;
    snap: string;
    photo?: string;
  }>;
  story: {
    problem: string;
    solution: string;
    validation: string;
  };
  mentoring: {
    highlights: string[];
    applied: string[];
  };
  strengths: string[];
  improvements: string[];
  next30: Array<{
    task: string;
    due: string;
    priority: number;
  }>;
  star: {
    s: string;
    t: string;
    a: string;
    r: string;
  };
  social: {
    linkedin3: string;
  };
}
