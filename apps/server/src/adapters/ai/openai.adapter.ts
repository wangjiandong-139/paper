import { Injectable } from '@nestjs/common';
import { IAiAdapter } from './ai.adapter.interface';

/**
 * OpenAI API 兼容适配器（同时支持 DeepSeek 等兼容接口）
 *
 * 生产环境需配置环境变量：
 *   AI_API_KEY      - API 密钥
 *   AI_API_BASE_URL - Base URL（默认 https://api.openai.com/v1）
 *   AI_MODEL        - 模型名称（默认 gpt-4o）
 *
 * 当前为存根实现，返回空提纲 JSON。
 */
@Injectable()
export class OpenAiAdapter implements IAiAdapter {
  async *streamCompletion(
    prompt: string,
    systemPrompt: string,
  ): AsyncIterable<string> {
    // 实际实现：调用 OpenAI Chat Completions API（stream: true），
    // 逐行解析 SSE data: {"choices":[{"delta":{"content":"..."}}]}
    void prompt;
    void systemPrompt;
    yield '[]';
  }

  async completion(prompt: string, systemPrompt: string): Promise<string> {
    void prompt;
    void systemPrompt;
    return '[]';
  }
}
