import { Injectable } from '@nestjs/common';

export type WechatPollStatus = 'pending' | 'confirmed' | 'expired';

export interface WechatStateConfirmed {
  status: 'confirmed';
  token: string;
  user: { userId: string; wechatOpenId: string; nickname: string | null; avatarUrl: string | null; onboardingCompleted: boolean };
}

export interface WechatStatePending {
  status: 'pending';
}

export type WechatStateValue = WechatStatePending | WechatStateConfirmed;

const TTL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class WechatStateStore {
  private readonly store = new Map<string, { value: WechatStateValue; expiresAt: number }>();

  setPending(state: string): void {
    this.store.set(state, {
      value: { status: 'pending' },
      expiresAt: Date.now() + TTL_MS,
    });
  }

  setConfirmed(state: string, token: string, user: WechatStateConfirmed['user']): void {
    this.store.set(state, {
      value: { status: 'confirmed', token, user },
      expiresAt: Date.now() + TTL_MS,
    });
  }

  get(state: string): WechatStateValue | null {
    const entry = this.store.get(state);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(state);
      return null;
    }
    return entry.value;
  }

  /** 获取并删除（用于 confirmed 一次性消费） */
  consume(state: string): WechatStateValue | null {
    const value = this.get(state);
    this.store.delete(state);
    return value;
  }

  /** 仅获取不删除；confirmed 时由调用方再调用 consume */
  getAndConsumeIfConfirmed(state: string): WechatStateValue | null {
    const entry = this.store.get(state);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(state);
      return null;
    }
    if (entry.value.status === 'confirmed') {
      this.store.delete(state);
      return entry.value;
    }
    return entry.value;
  }
}
