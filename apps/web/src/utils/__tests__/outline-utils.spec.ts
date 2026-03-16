import { describe, it, expect } from 'vitest'
import {
  walkOutline,
  flattenOutline,
  findNode,
  addNode,
  removeNode,
  updateNode,
  moveNodeUp,
  moveNodeDown,
  countPlaceholders,
  estimateWordCount,
  getOutlineStats,
  validateOutlineLevels,
  makeNode,
  cloneOutline,
} from '../outline-utils'
import type { OutlineNode } from '@/types/wizard'

// ─── 测试数据工厂 ──────────────────────────────────────────────────

function n(
  id: string,
  title: string,
  level: number,
  children: OutlineNode[] = [],
  wordCount?: number,
  placeholders?: OutlineNode['placeholders'],
): OutlineNode {
  return { id, title, level, children, word_count: wordCount, placeholders: placeholders ?? [] }
}

/** 简单三章提纲 */
function simpleOutline(): OutlineNode[] {
  return [
    n('c1', '第一章 绪论', 1, [
      n('c1-1', '1.1 研究背景', 2),
      n('c1-2', '1.2 研究意义', 2),
    ]),
    n('c2', '第二章 文献综述', 1, [
      n('c2-1', '2.1 国内研究现状', 2),
    ]),
    n('c3', '第三章 研究方法', 1),
  ]
}

// ─── walkOutline ──────────────────────────────────────────────────

describe('walkOutline', () => {
  it('访问所有节点（包括子节点）', () => {
    const ids: string[] = []
    walkOutline(simpleOutline(), (node) => ids.push(node.id))
    expect(ids).toEqual(['c1', 'c1-1', 'c1-2', 'c2', 'c2-1', 'c3'])
  })

  it('空提纲不调用 visitor', () => {
    const visited: string[] = []
    walkOutline([], (node) => visited.push(node.id))
    expect(visited).toHaveLength(0)
  })
})

// ─── flattenOutline ──────────────────────────────────────────────────

describe('flattenOutline', () => {
  it('返回按深度优先顺序的扁平数组', () => {
    const flat = flattenOutline(simpleOutline())
    expect(flat.map((n) => n.id)).toEqual(['c1', 'c1-1', 'c1-2', 'c2', 'c2-1', 'c3'])
  })

  it('空提纲返回空数组', () => {
    expect(flattenOutline([])).toHaveLength(0)
  })
})

// ─── findNode ──────────────────────────────────────────────────

describe('findNode', () => {
  it('在根级别找到节点', () => {
    const result = findNode(simpleOutline(), 'c2')
    expect(result).not.toBeNull()
    expect(result!.node.id).toBe('c2')
    expect(result!.index).toBe(1)
  })

  it('在子级别找到节点', () => {
    const result = findNode(simpleOutline(), 'c1-2')
    expect(result).not.toBeNull()
    expect(result!.node.id).toBe('c1-2')
    expect(result!.index).toBe(1)
  })

  it('不存在的 id 返回 null', () => {
    expect(findNode(simpleOutline(), 'nonexistent')).toBeNull()
  })
})

// ─── addNode ──────────────────────────────────────────────────

describe('addNode', () => {
  it('parentId 为 null 时追加到根', () => {
    const newNode = n('c4', '第四章', 1)
    const result = addNode(simpleOutline(), null, newNode)
    expect(result).toHaveLength(4)
    expect(result[3].id).toBe('c4')
  })

  it('在指定父节点下添加子节点', () => {
    const newNode = n('c3-1', '3.1 新节', 2)
    const result = addNode(simpleOutline(), 'c3', newNode)
    const c3 = result.find((n) => n.id === 'c3')!
    expect(c3.children).toHaveLength(1)
    expect(c3.children[0].id).toBe('c3-1')
  })

  it('不修改原始提纲（纯函数）', () => {
    const original = simpleOutline()
    addNode(original, null, n('c4', '第四章', 1))
    expect(original).toHaveLength(3)
  })

  it('父节点不存在时返回原提纲副本', () => {
    const result = addNode(simpleOutline(), 'nonexistent', n('x', '测试', 2))
    expect(result).toHaveLength(3)
  })
})

// ─── removeNode ──────────────────────────────────────────────────

describe('removeNode', () => {
  it('删除根节点', () => {
    const result = removeNode(simpleOutline(), 'c2')
    expect(result).toHaveLength(2)
    expect(result.find((n) => n.id === 'c2')).toBeUndefined()
  })

  it('删除子节点', () => {
    const result = removeNode(simpleOutline(), 'c1-1')
    const c1 = result.find((n) => n.id === 'c1')!
    expect(c1.children).toHaveLength(1)
    expect(c1.children[0].id).toBe('c1-2')
  })

  it('连同子节点一起删除', () => {
    const result = removeNode(simpleOutline(), 'c1')
    expect(result).toHaveLength(2)
    expect(flattenOutline(result).find((n) => n.id === 'c1-1')).toBeUndefined()
  })

  it('不修改原始提纲', () => {
    const original = simpleOutline()
    removeNode(original, 'c1')
    expect(original).toHaveLength(3)
  })
})

// ─── updateNode ──────────────────────────────────────────────────

describe('updateNode', () => {
  it('更新节点标题', () => {
    const result = updateNode(simpleOutline(), 'c1', { title: '修改后的标题' })
    expect(result[0].title).toBe('修改后的标题')
  })

  it('更新子节点字数', () => {
    const result = updateNode(simpleOutline(), 'c1-1', { word_count: 1500 })
    expect(result[0].children[0].word_count).toBe(1500)
  })

  it('不修改原始提纲', () => {
    const original = simpleOutline()
    updateNode(original, 'c1', { title: '新标题' })
    expect(original[0].title).toBe('第一章 绪论')
  })
})

// ─── moveNodeUp / moveNodeDown ──────────────────────────────────────────────────

describe('moveNodeUp', () => {
  it('将第二个根节点上移', () => {
    const result = moveNodeUp(simpleOutline(), 'c2')
    expect(result[0].id).toBe('c2')
    expect(result[1].id).toBe('c1')
  })

  it('第一个节点上移不改变顺序', () => {
    const result = moveNodeUp(simpleOutline(), 'c1')
    expect(result[0].id).toBe('c1')
  })

  it('上移子节点', () => {
    const result = moveNodeUp(simpleOutline(), 'c1-2')
    expect(result[0].children[0].id).toBe('c1-2')
    expect(result[0].children[1].id).toBe('c1-1')
  })
})

describe('moveNodeDown', () => {
  it('将第一个根节点下移', () => {
    const result = moveNodeDown(simpleOutline(), 'c1')
    expect(result[0].id).toBe('c2')
    expect(result[1].id).toBe('c1')
  })

  it('最后一个节点下移不改变顺序', () => {
    const result = moveNodeDown(simpleOutline(), 'c3')
    expect(result[2].id).toBe('c3')
  })
})

// ─── countPlaceholders ──────────────────────────────────────────────────

describe('countPlaceholders', () => {
  it('无占位时返回全零', () => {
    const counts = countPlaceholders(simpleOutline())
    expect(counts.total).toBe(0)
    expect(counts.figure).toBe(0)
  })

  it('正确统计各类占位数量', () => {
    const outline: OutlineNode[] = [
      n('c1', '第一章', 1, [], undefined, ['figure', 'table']),
      n('c2', '第二章', 1, [
        n('c2-1', '2.1', 2, [], undefined, ['formula', 'figure']),
      ]),
    ]
    const counts = countPlaceholders(outline)
    expect(counts.figure).toBe(2)
    expect(counts.table).toBe(1)
    expect(counts.formula).toBe(1)
    expect(counts.code).toBe(0)
    expect(counts.total).toBe(4)
  })
})

// ─── estimateWordCount ──────────────────────────────────────────────────

describe('estimateWordCount', () => {
  it('空提纲返回 0', () => {
    expect(estimateWordCount([], 10000)).toBe(0)
  })

  it('所有叶节点均分总字数', () => {
    const outline: OutlineNode[] = [
      n('c1', '第一章', 1, [n('c1-1', '1.1', 2), n('c1-2', '1.2', 2)]),
      n('c2', '第二章', 1),
    ]
    // 3 个叶节点（c1-1, c1-2, c2），各占 10000/3 ≈ 3333
    const result = estimateWordCount(outline, 10000)
    expect(result).toBe(Math.floor(10000 / 3) * 3)
  })

  it('已固定字数的节点不参与均分', () => {
    const outline: OutlineNode[] = [
      n('c1', '第一章', 1, [], 3000), // 固定 3000
      n('c2', '第二章', 1),           // 叶节点，均分剩余 7000
    ]
    const result = estimateWordCount(outline, 10000)
    expect(result).toBe(10000)
  })

  it('固定字数总和超过 totalWordCount 时剩余按 0 处理', () => {
    const outline: OutlineNode[] = [
      n('c1', '第一章', 1, [], 15000),
      n('c2', '第二章', 1),
    ]
    const result = estimateWordCount(outline, 10000)
    // remaining = max(0, 10000-15000) = 0，c2 叶节点获 0 字
    expect(result).toBe(15000)
  })
})

// ─── getOutlineStats ──────────────────────────────────────────────────

describe('getOutlineStats', () => {
  it('返回正确的统计信息', () => {
    const stats = getOutlineStats(simpleOutline(), 20000)
    expect(stats.level1Count).toBe(3)
    expect(stats.totalNodes).toBe(6)
    expect(stats.placeholders.total).toBe(0)
    expect(stats.estimatedWordCount).toBeGreaterThan(0)
  })
})

// ─── validateOutlineLevels ──────────────────────────────────────────────────

describe('validateOutlineLevels', () => {
  it('合法提纲返回 true', () => {
    expect(validateOutlineLevels(simpleOutline())).toBe(true)
  })

  it('根节点 level 不为 1 时返回 false', () => {
    const bad: OutlineNode[] = [n('x', '测试', 2)]
    expect(validateOutlineLevels(bad)).toBe(false)
  })

  it('子节点 level 不等于父节点 level+1 时返回 false', () => {
    const bad: OutlineNode[] = [
      n('c1', '第一章', 1, [n('c1-1', '1.1', 3)]), // 跳级
    ]
    expect(validateOutlineLevels(bad)).toBe(false)
  })

  it('空提纲返回 true', () => {
    expect(validateOutlineLevels([])).toBe(true)
  })
})

// ─── makeNode ──────────────────────────────────────────────────

describe('makeNode', () => {
  it('创建具有正确属性的节点', () => {
    const node = makeNode('测试章节', 2)
    expect(node.title).toBe('测试章节')
    expect(node.level).toBe(2)
    expect(node.children).toHaveLength(0)
    expect(node.id).toMatch(/^node-/)
  })

  it('每次创建的 id 唯一', () => {
    const n1 = makeNode('A', 1)
    const n2 = makeNode('B', 1)
    expect(n1.id).not.toBe(n2.id)
  })
})

// ─── cloneOutline ──────────────────────────────────────────────────

describe('cloneOutline', () => {
  it('深拷贝，修改副本不影响原始', () => {
    const original = simpleOutline()
    const cloned = cloneOutline(original)
    cloned[0].title = '修改后'
    expect(original[0].title).toBe('第一章 绪论')
  })
})
