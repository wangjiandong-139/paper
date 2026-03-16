export * from './admin/index';

import { Language, PlanType } from '../enums';
import {
  CitationCheckResultDTO,
  GenerationProgressEvent,
  OutlineNode,
  ReferenceItem,
  Step1Data,
  Step2Data,
  Step3Data,
} from '../types';

export interface UserDTO {
  id: string;
  nickname?: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface DraftSummaryDTO {
  id: string;
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface DraftDTO extends DraftSummaryDTO {
  step1_data?: Step1Data;
  step2_data?: Step2Data;
  step3_data?: Step3Data;
}

export interface OrderSummaryDTO {
  id: string;
  title: string;
  plan_type: PlanType;
  status: string;
  created_at: string;
}

export interface OrderDetailDTO extends OrderSummaryDTO {
  language: Language;
  word_count: number;
  generation_progress?: GenerationProgressEvent;
}

export interface ReferenceDTO extends ReferenceItem {}

export interface ParseErrorDTO {
  line: number;
  message: string;
  raw_text: string;
}

export interface PlagiarismResultDTO {
  similarity: number;
  report_url?: string;
}

export type { OutlineNode, GenerationProgressEvent, CitationCheckResultDTO };

