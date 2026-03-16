import { Injectable } from '@nestjs/common';

export interface UserProfile {
  id: string;
  nickname?: string;
  avatar_url?: string;
}

export interface UpdateMeDto {
  nickname?: string;
  avatar_url?: string;
}

@Injectable()
export class UserService {
  private readonly users = new Map<string, UserProfile>();

  async getMe(userId: string): Promise<UserProfile> {
    let user = this.users.get(userId);
    if (!user) {
      user = { id: userId };
      this.users.set(userId, user);
    }
    return user;
  }

  async updateMe(userId: string, payload: UpdateMeDto): Promise<UserProfile> {
    const current = await this.getMe(userId);
    const updated = { ...current, ...payload };
    this.users.set(userId, updated);
    return updated;
  }
}

