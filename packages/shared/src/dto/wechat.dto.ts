/** 扫码登录：获取二维码接口返回 */
export interface WechatQrcodeDto {
  url: string | null;
  state: string | null;
}

/** 轮询结果中的用户信息（与登录态一致） */
export interface WechatPollUserDto {
  userId: string;
  wechatOpenId: string;
  nickname: string | null;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
}

/** 轮询扫码结果 */
export interface WechatPollDto {
  status: 'pending' | 'confirmed' | 'expired';
  token?: string;
  user?: WechatPollUserDto;
}
