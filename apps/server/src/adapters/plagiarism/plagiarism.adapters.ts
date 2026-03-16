import { Injectable } from '@nestjs/common';
import { IPlagiarismAdapter, PlagiarismResultDTO } from './plagiarism.adapter.interface';

/**
 * 万方查重适配器
 * 生产环境需配置 WANFANG_PLAGIARISM_API_KEY 和 WANFANG_PLAGIARISM_BASE_URL 环境变量。
 * 当前为接口存根实现，返回模拟结果。
 */
@Injectable()
export class WanfangPlagiarismAdapter implements IPlagiarismAdapter {
  async check(_content: string): Promise<PlagiarismResultDTO> {
    // 实际实现：调用万方查重 API，传入论文内容，返回查重结果
    // const res = await fetch(`${process.env.WANFANG_PLAGIARISM_BASE_URL}/check`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.WANFANG_PLAGIARISM_API_KEY}` },
    //   body: JSON.stringify({ content: _content }),
    // });
    // const data = await res.json();
    // return { provider: 'wanfang', similarityRate: data.rate, reportUrl: data.report_url };
    return { provider: 'wanfang', similarityRate: 0, reportUrl: '' };
  }
}

/**
 * 知网查重适配器
 * 生产环境需配置 CNKI_PLAGIARISM_API_KEY 和 CNKI_PLAGIARISM_BASE_URL 环境变量。
 * 当前为接口存根实现，返回模拟结果。
 */
@Injectable()
export class CnkiPlagiarismAdapter implements IPlagiarismAdapter {
  async check(_content: string): Promise<PlagiarismResultDTO> {
    // 实际实现：调用知网查重 API
    return { provider: 'cnki', similarityRate: 0, reportUrl: undefined };
  }
}

/**
 * 维普查重适配器
 * 生产环境需配置 VIPINFO_PLAGIARISM_API_KEY 和 VIPINFO_PLAGIARISM_BASE_URL 环境变量。
 * 当前为接口存根实现，返回模拟结果。
 */
@Injectable()
export class VipinfoPlagiarismAdapter implements IPlagiarismAdapter {
  async check(_content: string): Promise<PlagiarismResultDTO> {
    // 实际实现：调用维普查重 API
    return { provider: 'vipinfo', similarityRate: 0, reportUrl: undefined };
  }
}
