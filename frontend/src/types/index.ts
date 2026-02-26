export interface User {
  id: string;
  username: string;
  role: 'admin' | 'member';
  is_active: boolean;
}

export interface CompanyRef {
  id: string;
  name: string;
}

export interface ContactRef {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  custom_fields?: Record<string, unknown>;
  created_by?: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  company_id?: string;
  company?: CompanyRef;
  custom_fields?: Record<string, unknown>;
  created_by?: string;
}

export type FieldType = 'text' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'select';
export type EntityType = 'contact' | 'company' | 'deal';
export type DealStatus = 'open' | 'won' | 'lost';
export type PropertySection = 'summary' | 'details';

export interface Property {
  id: string;
  name: string;
  field_key: string;
  field_type: FieldType;
  entity_type: EntityType;
  required: boolean;
  options?: string[];
  section: PropertySection;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  pipeline_id: string;
  stage_id: string;
  contact_id?: string;
  company_id?: string;
  contact?: ContactRef;
  company?: CompanyRef;
  linked_contacts?: ContactRef[];
  linked_companies?: CompanyRef[];
  custom_fields?: Record<string, unknown>;
  status: DealStatus;
  close_date?: string;
  created_by?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  pipeline_id: string;
  color: string;
  deals: Deal[];
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}
