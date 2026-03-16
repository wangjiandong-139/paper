import type { OutlineNode } from '@/types/wizard'

// ─── 类型 ──────────────────────────────────────────────────

export type PlaceholderType = 'figure' | 'table' | 'formula' | 'code'

export interface PlaceholderCounts {
  figure: number
  table: number
  formula: number
  code: number
  total: number
}

export interface OutlineStats {
  totalNodes: number
  level1Count: number
  placeholders: PlaceholderCounts
  estimatedWordCount: number
}

// ─── 树遍历 ──────────────────────────────────────────────────

/** 深度优先遍历所有节点（含根节点列表） */
export function walkOutline(
  nodes: OutlineNode[],
  visitor: (node: OutlineNode, parent: OutlineNode | null, index: number) => void,
  parent: OutlineNode | null = null,
): void {
  nodes.forEach((node, index) => {
    visitor(node, parent, index)
    if (node.children.length > 0) {
      walkOutline(node.children, visitor, node)
    }
  })
}

/** 将提纲树扁平化为有序数组 */
export function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
  const result: OutlineNode[] = []
  walkOutline(nodes, (node) => result.push(node))
  return result
}

// ─── 查找 ──────────────────────────────────────────────────

/** 按 id 查找节点，返回节点及其父节点列表和索引 */
export function findNode(
  nodes: OutlineNode[],
  id: string,
): { node: OutlineNode; siblings: OutlineNode[]; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return { node: nodes[i], siblings: nodes, index: i }
    }
    const found = findNode(nodes[i].children, id)
    if (found) return found
  }
  return null
}

// ─── 增删改 ──────────────────────────────────────────────────

/**
 * 深拷贝提纲（保持纯函数特性）
 */
export function cloneOutline(nodes: OutlineNode[]): OutlineNode[] {
  return JSON.parse(JSON.stringify(nodes)) as OutlineNode[]
}

/**
 * 在指定父节点下添加子节点；parentId 为 null 时追加到根
 */
export function addNode(
  outline: OutlineNode[],
  parentId: string | null,
  newNode: OutlineNode,
): OutlineNode[] {
  const cloned = cloneOutline(outline)
  if (parentId === null) {
    cloned.push(newNode)
    return cloned
  }
  const found = findNode(cloned, parentId)
  if (!found) return cloned
  found.node.children.push(newNode)
  return cloned
}

/**
 * 删除指定 id 的节点（含其所有子节点）
 */
export function removeNode(outline: OutlineNode[], id: string): OutlineNode[] {
  const cloned = cloneOutline(outline)
  const found = findNode(cloned, id)
  if (!found) return cloned
  found.siblings.splice(found.index, 1)
  return cloned
}

/**
 * 更新节点的 title 或 word_count
 */
export function updateNode(
  outline: OutlineNode[],
  id: string,
  patch: Partial<Pick<OutlineNode, 'title' | 'word_count' | 'placeholders'>>,
): OutlineNode[] {
  const cloned = cloneOutline(outline)
  const found = findNode(cloned, id)
  if (!found) return cloned
  Object.assign(found.node, patch)
  return cloned
}

/**
 * 在同级列表中将节点上移（index-1）
 */
export function moveNodeUp(outline: OutlineNode[], id: string): OutlineNode[] {
  const cloned = cloneOutline(outline)
  const found = findNode(cloned, id)
  if (!found || found.index <= 0) return cloned
  const { siblings, index } = found
  ;[siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]]
  return cloned
}

/**
 * 在同级列表中将节点下移（index+1）
 */
export function moveNodeDown(outline: OutlineNode[], id: string): OutlineNode[] {
  const cloned = cloneOutline(outline)
  const found = findNode(cloned, id)
  if (!found || found.index >= found.siblings.length - 1) return cloned
  const { siblings, index } = found
  ;[siblings[index], siblings[index + 1]] = [siblings[index + 1], siblings[index]]
  return cloned
}

// ─── 统计 ──────────────────────────────────────────────────

/** 统计所有节点中的占位标记数量 */
export function countPlaceholders(outline: OutlineNode[]): PlaceholderCounts {
  const counts: PlaceholderCounts = { figure: 0, table: 0, formula: 0, code: 0, total: 0 }
  walkOutline(outline, (node) => {
    for (const p of node.placeholders ?? []) {
      counts[p]++
      counts.total++
    }
  })
  return counts
}

/**
 * 根据节点设定字数估算各节字数
 * - 已设置 word_count 的节点使用其设定值
 * - 未设置的节点按叶节点数量均分剩余字数
 */
export function estimateWordCount(outline: OutlineNode[], totalWordCount: number): number {
  let fixedTotal = 0
  let unfixedLeafCount = 0

  walkOutline(outline, (node) => {
    if (node.word_count) {
      fixedTotal += node.word_count
    } else if (node.children.length === 0) {
      unfixedLeafCount++
    }
  })

  const remaining = Math.max(0, totalWordCount - fixedTotal)
  const perLeaf = unfixedLeafCount > 0 ? Math.floor(remaining / unfixedLeafCount) : 0

  return fixedTotal + perLeaf * unfixedLeafCount
}

/** 计算提纲整体统计信息 */
export function getOutlineStats(
  outline: OutlineNode[],
  totalWordCount: number,
): OutlineStats {
  return {
    totalNodes: flattenOutline(outline).length,
    level1Count: outline.length,
    placeholders: countPlaceholders(outline),
    estimatedWordCount: estimateWordCount(outline, totalWordCount),
  }
}

// ─── 校验 ──────────────────────────────────────────────────

/** 校验 level 约束：1 ≤ level ≤ 3，子节点 level = 父节点 level + 1 */
export function validateOutlineLevels(nodes: OutlineNode[], expectedLevel = 1): boolean {
  for (const node of nodes) {
    if (node.level !== expectedLevel) return false
    if (node.level > 3) return false
    if (node.children.length > 0) {
      if (!validateOutlineLevels(node.children, expectedLevel + 1)) return false
    }
  }
  return true
}

// ─── 生成 id ──────────────────────────────────────────────────

export function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function makeNode(title: string, level: number): OutlineNode {
  return {
    id: generateNodeId(),
    title,
    level,
    children: [],
    placeholders: [],
  }
}
