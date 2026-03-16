export interface IAiAdapter {
  /**
   * 流式补全：逐 token 返回，调用方用 for-await-of 消费。
   * 每个 yield 值为模型输出的一段文本片段（chunk）。
   */
  streamCompletion(
    prompt: string,
    systemPrompt: string,
  ): AsyncIterable<string>;

  /**
   * 非流式补全：等待模型输出完整后一次性返回。
   */
  completion(prompt: string, systemPrompt: string): Promise<string>;
}
