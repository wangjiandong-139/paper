import { DegreeType, Language, OrderStatus, ReferenceSource } from '../enums';

export interface Step1Data {
  subject: string;
  title: string;
  language: Language;
  degree_type: DegreeType;
  word_count: number;
  template_id: string;
  ai_feed?: string;
  proposal_file_url?: string;
}

export interface ReferenceItem {
  id: string;
  source: ReferenceSource;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  raw_citation?: string;
}

export interface OutlineNode {
  id: string;
  title: string;
  level: number;
  word_count?: number;
  children: OutlineNode[];
  placeholders?: Array<'figure' | 'table' | 'formula' | 'code'>;
}

export interface Step2Data {
  references: ReferenceItem[];
  confirmed: boolean;
}

export interface Step3Data {
  outline: OutlineNode[];
  confirmed: boolean;
}

export interface GenerationProgressEvent {
  order_id: string;
  status: OrderStatus;
  total_chapters: number;
  completed_chapters: number;
  current_chapter?: string;
}

export interface CitationItem {
  text: string;
  reference_id?: string;
  traceable: boolean;
}

export interface CitationCheckResultDTO {
  traceable: CitationItem[];
  untraceable: CitationItem[];
}

