import fc from 'fast-check';
import { OutlineNode } from '../src/types';

// Property 2：任意合法 OutlineNode 树的 level 值满足 1 ≤ level ≤ 3，
// 且子节点 level 等于父节点 level + 1

type OutlineNodeInternal = OutlineNode;

function outlineNodeArb(level: number): fc.Arbitrary<OutlineNodeInternal> {
  const nextLevel = Math.min(level + 1, 3);

  return fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    level: fc.constant(level),
    word_count: fc.option(fc.integer({ min: 100, max: 2000 }), { nil: undefined }),
    placeholders: fc.option(
      fc.uniqueArray(
        fc.constantFrom<'figure' | 'table' | 'formula' | 'code'>(
          'figure',
          'table',
          'formula',
          'code',
        ),
        { maxLength: 4 },
      ),
      { nil: undefined },
    ),
    children:
      level < 3
        ? fc.array(outlineNodeArb(nextLevel), { maxLength: 5 })
        : fc.constant<OutlineNodeInternal[]>([]),
  });
}

const boundedOutlineTreeArb: fc.Arbitrary<OutlineNodeInternal> = outlineNodeArb(1);

function assertOutlineTreeLevelConstraints(node: OutlineNodeInternal): void {
  expect(node.level).toBeGreaterThanOrEqual(1);
  expect(node.level).toBeLessThanOrEqual(3);

  for (const child of node.children) {
    expect(child.level).toBe(node.level + 1);
    assertOutlineTreeLevelConstraints(child);
  }
}

describe('OutlineNode tree invariants', () => {
  it('should satisfy level constraints for generated trees', () => {
    fc.assert(
      fc.property(boundedOutlineTreeArb, (root) => {
        assertOutlineTreeLevelConstraints(root);
      }),
    );
  });
});

