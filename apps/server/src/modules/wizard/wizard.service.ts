import { Injectable } from '@nestjs/common';
import { ReferenceSource } from '../../../../../packages/shared/src/enums';
import { OutlineNode } from '../outline/outline.service';

export interface DraftReferenceItem {
  id: string;
  source: ReferenceSource;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  raw_citation?: string;
}

export interface DraftStepData {
  step1_data?: Record<string, unknown>;
  step2_data?: Record<string, unknown>;
  step3_data?: Record<string, unknown>;
}

export interface Draft extends DraftStepData {
  id: string;
  user_id: string;
  current_step: number;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class WizardService {
  private readonly drafts = new Map<string, Draft>();

  async listDrafts(userId: string): Promise<Draft[]> {
    return Array.from(this.drafts.values()).filter(
      (d) => d.user_id === userId && !d.deleted_at,
    );
  }

  async getDraft(userId: string, draftId: string): Promise<Draft | null> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.user_id !== userId || draft.deleted_at) return null;
    return draft;
  }

  async createDraft(userId: string): Promise<Draft> {
    const id = `draft-${this.drafts.size + 1}`;
    const now = new Date();
    const draft: Draft = {
      id,
      user_id: userId,
      current_step: 1,
      step1_data: {},
      step2_data: {},
      step3_data: {},
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };
    this.drafts.set(id, draft);
    return draft;
  }

  async updateDraftStep(
    userId: string,
    draftId: string,
    step: number,
    payload: Record<string, unknown>,
  ): Promise<Draft> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.user_id !== userId || draft.deleted_at) {
      throw new Error('Draft not found');
    }

    const next: Draft = { ...draft, updated_at: new Date() };

    if (step === 1) {
      next.step1_data = payload;
    } else if (step === 2) {
      next.step2_data = payload;
    } else if (step === 3) {
      next.step3_data = payload;
    } else {
      throw new Error('Invalid step');
    }

    if (step > next.current_step) {
      next.current_step = step;
    }

    this.drafts.set(draftId, next);
    return next;
  }

  async softDeleteDraft(userId: string, draftId: string): Promise<void> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.user_id !== userId || draft.deleted_at) {
      return;
    }
    draft.deleted_at = new Date();
    draft.updated_at = new Date();
    this.drafts.set(draftId, draft);
  }

  /** ???? step2_data.references ?????? */
  async addReference(
    userId: string,
    draftId: string,
    ref: DraftReferenceItem,
  ): Promise<Draft> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.user_id !== userId || draft.deleted_at) {
      throw new Error('Draft not found');
    }

    const step2 = (draft.step2_data ?? {}) as Record<string, unknown>;
    const refs = Array.isArray(step2['references'])
      ? (step2['references'] as DraftReferenceItem[])
      : [];

    const next: Draft = {
      ...draft,
      step2_data: { ...step2, references: [...refs, ref] },
      updated_at: new Date(),
    };
    this.drafts.set(draftId, next);
    return next;
  }

  /** ???? step2_data.references ??????? */
  async removeReference(
    userId: string,
    draftId: string,
    refId: string,
  ): Promise<Draft> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.user_id !== userId || draft.deleted_at) {
      throw new Error('Draft not found');
    }

    const step2 = (draft.step2_data ?? {}) as Record<string, unknown>;
    const refs = Array.isArray(step2['references'])
      ? (step2['references'] as DraftReferenceItem[])
      : [];

    const next: Draft = {
      ...draft,
      step2_data: { ...step2, references: refs.filter((r) => r.id !== refId) },
      updated_at: new Date(),
    };
    this.drafts.set(draftId, next);
    return next;
  }

  /** ?????????? step3_data.outline */
  async saveOutline(
    userId: string,
    draftId: string,
    outline: OutlineNode[],
  ): Promise<Draft> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.user_id !== userId || draft.deleted_at) {
      throw new Error('Draft not found');
    }

    const step3 = (draft.step3_data ?? {}) as Record<string, unknown>;
    const next: Draft = {
      ...draft,
      step3_data: { ...step3, outline, confirmed: false },
      current_step: Math.max(draft.current_step, 3),
      updated_at: new Date(),
    };
    this.drafts.set(draftId, next);
    return next;
  }
}
