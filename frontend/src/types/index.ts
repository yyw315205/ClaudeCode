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
}

export type FieldType = 'text' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'select';
export type EntityType = 'contact' | 'company' | 'deal';

export interface Property {
  id: string;
  name: string;
  field_key: string;
  field_type: FieldType;
  entity_type: EntityType;
  required: boolean;
  options?: string[];
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
  custom_fields?: Record<string, unknown>;
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
