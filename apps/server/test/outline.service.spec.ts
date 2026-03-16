/**
 * OutlineService 单元测试
 *
 * AI 适配器（IAiAdapter）全部 Mock，仅测试 OutlineService 本身的业务逻辑：
 * - 提示词构建（通过 prompt 模块）
 * - AI 响应解析（parseOutlineJson）
 * - OutlineNode 树校验（validateOutlineNodes）
 * - 流式生成（generateStream）事件序列
 * - 非流式生成（generate）返回结构
 */
import { IAiAdapter } from '../src/adapters/ai/ai.adapter.interface';
import { OpenAiAdapter } from '../src/adapters/ai/openai.adapter';
import {
  OutlineNode,
  OutlineService,
  parseOutlineJson,
  validateOutlineNodes,
} from '../src/modules/outline/outline.service';
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from '../src/prompts/outline.prompt';

// ── 辅助工厂 ─────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  level: number,
  children: OutlineNode[] = [],
): OutlineNode {
  return { id, title: `Section ${id}`, level, word_count: 500, children };
}

const SAMPLE_OUTLINE: OutlineNode[] = [
  makeNode('1', 1, [
    makeNode('1.1', 2, [makeNode('1.1.1', 3)]),
    makeNode('1.2', 2),
  ]),
  makeNode('2', 1, [makeNode('2.1', 2)]),
];

// ── OpenAiAdapter (stub) ──────────────────────────────────────────────────────

describe('OpenAiAdapter (stub)', () => {
  const adapter = new OpenAiAdapter();

  it('completion() should resolve to a string', async () => {
    const result = await adapter.completion('prompt', 'system');
    expect(typeof result).toBe('string');
  });

  it('streamCompletion() should yield at least one chunk', async () => {
    const chunks: string[] = [];
    for await (const chunk of adapter.streamCompletion('prompt', 'system')) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });
});

// ── parseOutlineJson ──────────────────────────────────────────────────────────

describe('parseOutlineJson()', () => {
  it('解析干净的 JSON 数组字符串', () => {
    const json = JSON.stringify(SAMPLE_OUTLINE);
    const result = parseOutlineJson(json);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
  });

  it('从 markdown 代码块中提取 JSON', () => {
    const json = `\`\`\`json\n${JSON.stringify(SAMPLE_OUTLINE)}\n\`\`\``;
    const result = parseOutlineJson(json);
    expect(result).toHaveLength(2);
  });

  it('解析裸 JSON 数组（无前后说明文字）', () => {
    const json = `[{"id":"1","title":"Intro","level":1,"children":[]}]`;
    const result = parseOutlineJson(json);
    expect(result[0].title).toBe('Intro');
  });

  it('非数组 JSON 应抛出错误', () => {
    expect(() => parseOutlineJson('{"key":"value"}')).toThrow();
  });

  it('无效 JSON 应抛出错误', () => {
    expect(() => parseOutlineJson('not json at all')).toThrow();
  });

  it('空数组 [] 是合法输入', () => {
    const result = parseOutlineJson('[]');
    expect(result).toHaveLength(0);
  });
});

// ── validateOutlineNodes ──────────────────────────────────────────────────────

describe('validateOutlineNodes()', () => {
  it('合法的 3 级提纲应通过校验', () => {
    expect(validateOutlineNodes(SAMPLE_OUTLINE)).toBe(true);
  });

  it('顶层 level 不是 1 应失败', () => {
    const nodes = [makeNode('1', 2)];
    expect(validateOutlineNodes(nodes)).toBe(false);
  });

  it('子节点 level 不是父节点 level+1 应失败', () => {
    const nodes = [makeNode('1', 1, [makeNode('1.1', 3)])]; // 跳过 level 2
    expect(validateOutlineNodes(nodes)).toBe(false);
  });

  it('空数组应通过校验', () => {
    expect(validateOutlineNodes([])).toBe(true);
  });

  it('纯 level-1 节点（无子节点）应通过校验', () => {
    const nodes = [makeNode('1', 1), makeNode('2', 1)];
    expect(validateOutlineNodes(nodes)).toBe(true);
  });

  it('level-2 子节点有 level-3 孙节点应通过校验', () => {
    const nodes = [
      makeNode('1', 1, [makeNode('1.1', 2, [makeNode('1.1.1', 3)])]),
    ];
    expect(validateOutlineNodes(nodes)).toBe(true);
  });
});

// ── buildOutlinePrompt ────────────────────────────────────────────────────────

describe('buildOutlineUserPrompt()', () => {
  it('应包含题目、学科、字数、学历类型', () => {
    const prompt = buildOutlineUserPrompt({
      subject: '计算机科学',
      title: '深度学习在图像识别中的应用',
      word_count: 15000,
      degree_type: 'master',
    });

    expect(prompt).toContain('深度学习在图像识别中的应用');
    expect(prompt).toContain('计算机科学');
    expect(prompt).toContain('15');
    expect(prompt).toContain("Master's Thesis");
  });

  it('当提供参考文献时应包含文献标题', () => {
    const prompt = buildOutlineUserPrompt({
      subject: 'CS',
      title: 'Test',
      word_count: 8000,
      degree_type: 'undergraduate',
      reference_titles: ['Deep Learning Foundations', 'Neural Networks'],
    });

    expect(prompt).toContain('Deep Learning Foundations');
    expect(prompt).toContain('Neural Networks');
  });

  it('没有参考文献时不应有 References 节', () => {
    const prompt = buildOutlineUserPrompt({
      subject: 'CS',
      title: 'Test',
      word_count: 5000,
      degree_type: 'doctor',
      reference_titles: [],
    });

    expect(prompt).not.toContain('Key References');
  });
});

describe('buildOutlineSystemPrompt()', () => {
  it('应包含 JSON 格式说明', () => {
    const sp = buildOutlineSystemPrompt();
    expect(sp).toContain('JSON');
    expect(sp).toContain('OutlineNode');
    expect(sp).toContain('level');
  });
});

// ── OutlineService.generate ───────────────────────────────────────────────────

describe('OutlineService.generate()', () => {
  let service: OutlineService;
  let mockAi: jest.Mocked<IAiAdapter>;

  beforeEach(() => {
    mockAi = {
      streamCompletion: jest.fn(),
      completion: jest.fn(),
    };
    const openAiStub = new OpenAiAdapter();
    service = new OutlineService(mockAi, openAiStub);
  });

  it('应调用 AI adapter 的 completion 方法', async () => {
    mockAi.completion.mockResolvedValue(JSON.stringify(SAMPLE_OUTLINE));

    await service.generate({
      subject: 'CS',
      title: 'Test',
      word_count: 8000,
      degree_type: 'master',
    });

    expect(mockAi.completion).toHaveBeenCalledTimes(1);
  });

  it('返回值应符合 OutlineNode[] 结构', async () => {
    mockAi.completion.mockResolvedValue(JSON.stringify(SAMPLE_OUTLINE));

    const result = await service.generate({
      subject: 'CS',
      title: 'Test',
      word_count: 8000,
      degree_type: 'master',
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('title');
    expect(result[0]).toHaveProperty('level');
    expect(result[0]).toHaveProperty('children');
  });

  it('AI 返回 markdown 代码块格式时应正确解析', async () => {
    const wrapped = `\`\`\`json\n${JSON.stringify(SAMPLE_OUTLINE)}\n\`\`\``;
    mockAi.completion.mockResolvedValue(wrapped);

    const result = await service.generate({
      subject: 'CS',
      title: 'Test',
      word_count: 8000,
      degree_type: 'master',
    });

    expect(result).toHaveLength(SAMPLE_OUTLINE.length);
  });

  it('AI 返回非法 JSON 时应抛出错误', async () => {
    mockAi.completion.mockResolvedValue('This is not JSON');

    await expect(
      service.generate({
        subject: 'CS',
        title: 'Test',
        word_count: 8000,
        degree_type: 'master',
      }),
    ).rejects.toThrow('Failed to parse AI outline response');
  });

  it('应将参考文献标题传入提示词（通过 completion 调用参数验证）', async () => {
    mockAi.completion.mockResolvedValue('[]');

    await service.generate({
      subject: 'CS',
      title: 'NLP Research',
      word_count: 10000,
      degree_type: 'doctor',
      reference_titles: ['Transformer Architecture'],
    });

    const [calledPrompt] = mockAi.completion.mock.calls[0];
    expect(calledPrompt).toContain('Transformer Architecture');
  });
});

// ── OutlineService.generateStream ────────────────────────────────────────────

describe('OutlineService.generateStream()', () => {
  let service: OutlineService;
  let mockAi: jest.Mocked<IAiAdapter>;

  beforeEach(() => {
    mockAi = {
      streamCompletion: jest.fn(),
      completion: jest.fn(),
    };
    const openAiStub = new OpenAiAdapter();
    service = new OutlineService(mockAi, openAiStub);
  });

  async function collectChunks(
    gen: AsyncGenerator<{ type: string; data: string }>,
  ) {
    const chunks: { type: string; data: string }[] = [];
    for await (const c of gen) chunks.push(c);
    return chunks;
  }

  it('应先发出 progress 事件，最后发出 complete 事件', async () => {
    async function* fakeStream() {
      yield '[';
      yield JSON.stringify(SAMPLE_OUTLINE).slice(1);
    }
    mockAi.streamCompletion.mockReturnValue(fakeStream());

    const chunks = await collectChunks(
      service.generateStream({
        subject: 'CS',
        title: 'Test',
        word_count: 8000,
        degree_type: 'master',
      }),
    );

    const types = chunks.map((c) => c.type);
    expect(types).toContain('progress');
    expect(types[types.length - 1]).toBe('complete');
  });

  it('complete 事件的 data 应可解析为 OutlineNode[]', async () => {
    async function* fakeStream() {
      yield JSON.stringify(SAMPLE_OUTLINE);
    }
    mockAi.streamCompletion.mockReturnValue(fakeStream());

    const chunks = await collectChunks(
      service.generateStream({
        subject: 'CS',
        title: 'Test',
        word_count: 8000,
        degree_type: 'master',
      }),
    );

    const complete = chunks.find((c) => c.type === 'complete');
    expect(complete).toBeDefined();
    const outline = JSON.parse(complete!.data) as OutlineNode[];
    expect(Array.isArray(outline)).toBe(true);
    expect(outline).toHaveLength(SAMPLE_OUTLINE.length);
  });

  it('AI 输出不合法 JSON 时 complete 事件替换为 error 事件', async () => {
    async function* fakeStream() {
      yield 'not valid json';
    }
    mockAi.streamCompletion.mockReturnValue(fakeStream());

    const chunks = await collectChunks(
      service.generateStream({
        subject: 'CS',
        title: 'Test',
        word_count: 8000,
        degree_type: 'master',
      }),
    );

    const last = chunks[chunks.length - 1];
    expect(last.type).toBe('error');
    expect(last.data).toContain('Failed to parse');
  });
});
