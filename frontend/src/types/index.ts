export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContactDetail extends Contact {
  deals: Deal[];
  interactions: InteractionWithMeta[];
}

export type DealStage =
  | 'Lead'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export interface Deal {
  id: number;
  title: string;
  contact_id: number | null;
  contact_name: string | null;
  contact_company: string | null;
  stage: DealStage;
  value: string | null;
  close_date: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type InteractionType = 'call' | 'email' | 'note' | 'meeting';

export interface Interaction {
  id: number;
  contact_id: number;
  deal_id: number | null;
  type: InteractionType;
  summary: string;
  occurred_at: string;
  created_at: string;
}

export interface InteractionWithMeta extends Interaction {
  contact_name?: string;
  deal_title?: string | null;
}

export interface DealStats {
  open_deals: string;
  won_deals: string;
  pipeline_value: string;
  won_value: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  tags: string;
}

export interface DealFormData {
  title: string;
  contact_id: string;
  stage: DealStage;
  value: string;
  close_date: string;
  notes: string;
}
