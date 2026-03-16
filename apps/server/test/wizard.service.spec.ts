/**
 * WizardService 单元测试
 *
 * 覆盖所有分支：草稿不存在、无权限、步骤越界、软删除后再操作等错误路径。
 */
import { ReferenceSource } from '../../../packages/shared/src/enums';
import { OutlineNode } from '../src/modules/outline/outline.service';
import {
  DraftReferenceItem,
  WizardService,
} from '../src/modules/wizard/wizard.service';

function makeService() {
  return new WizardService();
}

const USER_A = 'user-a';
const USER_B = 'user-b';

const REF: DraftReferenceItem = {
  id: 'ref-1',
  source: ReferenceSource.USER_INPUT,
  title: 'Test Ref',
  authors: ['Author A'],
};

const OUTLINE: OutlineNode[] = [
  { id: '1', title: 'Chapter 1', level: 1, children: [] },
];

// ── createDraft / listDrafts ──────────────────────────────────────────────────

describe('WizardService – createDraft & listDrafts', () => {
  it('新建草稿后可在列表中查到', async () => {
    const svc = makeService();
    const draft = await svc.createDraft(USER_A);
    const list = await svc.listDrafts(USER_A);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(draft.id);
  });

  it('不同用户的草稿相互隔离', async () => {
    const svc = makeService();
    await svc.createDraft(USER_A);
    const listB = await svc.listDrafts(USER_B);
    expect(listB).toHaveLength(0);
  });
});

// ── getDraft ──────────────────────────────────────────────────────────────────

describe('WizardService – getDraft', () => {
  it('正确 userId + draftId 应返回草稿', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    const found = await svc.getDraft(USER_A, d.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(d.id);
  });

  it('错误 userId 应返回 null', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    const found = await svc.getDraft(USER_B, d.id);
    expect(found).toBeNull();
  });

  it('不存在的 draftId 应返回 null', async () => {
    const svc = makeService();
    const found = await svc.getDraft(USER_A, 'no-such-id');
    expect(found).toBeNull();
  });
});

// ── updateDraftStep ───────────────────────────────────────────────────────────

describe('WizardService – updateDraftStep', () => {
  it('step=3 正确更新 step3_data', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    const updated = await svc.updateDraftStep(USER_A, d.id, 3, { outline: [] });
    expect(updated.step3_data).toEqual({ outline: [] });
    expect(updated.current_step).toBe(3);
  });

  it('step 不变时 current_step 不应回退', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    await svc.updateDraftStep(USER_A, d.id, 3, {});
    const again = await svc.updateDraftStep(USER_A, d.id, 1, { title: 'x' });
    expect(again.current_step).toBe(3);
  });

  it('不存在的 draftId 应抛出错误', async () => {
    const svc = makeService();
    await expect(
      svc.updateDraftStep(USER_A, 'no-such-id', 1, {}),
    ).rejects.toThrow('Draft not found');
  });

  it('错误 userId 应抛出错误', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    await expect(
      svc.updateDraftStep(USER_B, d.id, 1, {}),
    ).rejects.toThrow('Draft not found');
  });

  it('越界 step 应抛出 Invalid step 错误', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    await expect(
      svc.updateDraftStep(USER_A, d.id, 5, {}),
    ).rejects.toThrow('Invalid step');
  });

  it('软删除后的草稿不可更新', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    await svc.softDeleteDraft(USER_A, d.id);
    await expect(
      svc.updateDraftStep(USER_A, d.id, 1, {}),
    ).rejects.toThrow('Draft not found');
  });
});

// ── softDeleteDraft ───────────────────────────────────────────────────────────

describe('WizardService – softDeleteDraft', () => {
  it('删除后不再出现在列表中', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    await svc.softDeleteDraft(USER_A, d.id);
    const list = await svc.listDrafts(USER_A);
    expect(list).toHaveLength(0);
  });

  it('删除不存在的 draftId 不抛出错误', async () => {
    const svc = makeService();
    await expect(svc.softDeleteDraft(USER_A, 'no-id')).resolves.toBeUndefined();
  });

  it('重复删除同一草稿不抛出错误', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    await svc.softDeleteDraft(USER_A, d.id);
    await expect(svc.softDeleteDraft(USER_A, d.id)).resolves.toBeUndefined();
  });
});

// ── addReference ──────────────────────────────────────────────────────────────

describe('WizardService – addReference', () => {
  it('追加文献后可在 step2_data.references 中看到', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    const updated = await svc.addReference(USER_A, d.id, REF);
    const refs = (
      updated.step2_data as { references: DraftReferenceItem[] }
    ).references;
    expect(refs).toHaveLength(1);
    expect(refs[0].id).toBe('ref-1');
  });

  it('不存在的草稿应抛出错误', async () => {
    const svc = makeService();
    await expect(svc.addReference(USER_A, 'no-id', REF)).rejects.toThrow(
      'Draft not found',
    );
  });

  it('step2_data 初始为空时也能追加', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    // step2_data 默认 {} 无 references 字段
    const updated = await svc.addReference(USER_A, d.id, REF);
    const refs = (
      updated.step2_data as { references: DraftReferenceItem[] }
    ).references;
    expect(refs).toHaveLength(1);
  });
});

// ── removeReference ───────────────────────────────────────────────────────────

describe('WizardService – removeReference', () => {
  it('正确移除指定文献', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    await svc.addReference(USER_A, d.id, REF);
    const ref2: DraftReferenceItem = { ...REF, id: 'ref-2' };
    await svc.addReference(USER_A, d.id, ref2);

    const updated = await svc.removeReference(USER_A, d.id, 'ref-1');
    const refs = (
      updated.step2_data as { references: DraftReferenceItem[] }
    ).references;
    expect(refs).toHaveLength(1);
    expect(refs[0].id).toBe('ref-2');
  });

  it('不存在的草稿应抛出错误', async () => {
    const svc = makeService();
    await expect(
      svc.removeReference(USER_A, 'no-id', 'ref-1'),
    ).rejects.toThrow('Draft not found');
  });
});

// ── saveOutline ───────────────────────────────────────────────────────────────

describe('WizardService – saveOutline', () => {
  it('正确保存提纲并更新 current_step', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    const updated = await svc.saveOutline(USER_A, d.id, OUTLINE);

    const step3 = updated.step3_data as {
      outline: OutlineNode[];
      confirmed: boolean;
    };
    expect(step3.outline).toHaveLength(1);
    expect(step3.outline[0].id).toBe('1');
    expect(step3.confirmed).toBe(false);
    expect(updated.current_step).toBeGreaterThanOrEqual(3);
  });

  it('不存在的草稿应抛出错误', async () => {
    const svc = makeService();
    await expect(
      svc.saveOutline(USER_A, 'no-id', OUTLINE),
    ).rejects.toThrow('Draft not found');
  });

  it('保存提纲不覆盖 step3_data 中的其他字段', async () => {
    const svc = makeService();
    const d = await svc.createDraft(USER_A);
    // 先通过 updateDraftStep 存入其他字段
    await svc.updateDraftStep(USER_A, d.id, 3, { confirmed: true, extra: 42 });
    const updated = await svc.saveOutline(USER_A, d.id, OUTLINE);
    const step3 = updated.step3_data as Record<string, unknown>;
    expect(step3['extra']).toBe(42);
    expect(step3['outline']).toBeDefined();
  });
});
