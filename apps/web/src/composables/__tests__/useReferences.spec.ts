import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useReferences } from '../useReferences'
import { DegreeType, ReferenceSource } from '@/types/wizard'
import type { ReferenceItem } from '@/types/wizard'

function makeRef(id: string, overrides: Partial<ReferenceItem> = {}): ReferenceItem {
  return {
    id,
    source: ReferenceSource.USER_INPUT,
    title: `论文标题 ${id}`,
    authors: ['作者甲'],
    year: 2022,
    ...overrides,
  }
}

function createHook(degree = DegreeType.UNDERGRADUATE) {
  const degreeType = ref(degree)
  return { ...useReferences({ degreeType }), degreeType }
}

describe('useReferences', () => {
  describe('初始状态', () => {
    it('selectedRefs 为空', () => {
      const { selectedRefs } = createHook()
      expect(selectedRefs.value).toHaveLength(0)
    })

    it('count 为 0', () => {
      const { count } = createHook()
      expect(count.value).toBe(0)
    })

    it('meetsMinCount 为 false（count=0 < minCount）', () => {
      const { meetsMinCount } = createHook()
      expect(meetsMinCount.value).toBe(false)
    })

    it('hasParseErrors 为 false', () => {
      const { hasParseErrors } = createHook()
      expect(hasParseErrors.value).toBe(false)
    })
  })

  describe('minCount 按学历类型计算', () => {
    it.each([
      [DegreeType.UNDERGRADUATE, 1],
      [DegreeType.MASTER, 1],
      [DegreeType.DOCTOR, 1],
      [DegreeType.OTHER, 1],
    ])('%s minCount = %i', (degree, expected) => {
      const { minCount } = createHook(degree)
      expect(minCount.value).toBe(expected)
    })
  })

  describe('addReference', () => {
    it('添加文献后 count 增加', () => {
      const { addReference, count } = createHook()
      addReference(makeRef('r1'))
      expect(count.value).toBe(1)
    })

    it('相同 id 不重复添加', () => {
      const { addReference, count } = createHook()
      addReference(makeRef('r1'))
      addReference(makeRef('r1'))
      expect(count.value).toBe(1)
    })

    it('添加不同 id 的文献各自独立', () => {
      const { addReference, count } = createHook()
      addReference(makeRef('r1'))
      addReference(makeRef('r2'))
      expect(count.value).toBe(2)
    })
  })

  describe('removeReference', () => {
    it('删除存在的文献后 count 减少', () => {
      const { addReference, removeReference, count } = createHook()
      addReference(makeRef('r1'))
      addReference(makeRef('r2'))
      removeReference('r1')
      expect(count.value).toBe(1)
    })

    it('删除不存在的 id 不报错', () => {
      const { removeReference, count } = createHook()
      expect(() => removeReference('nonexistent')).not.toThrow()
      expect(count.value).toBe(0)
    })
  })

  describe('isAdded', () => {
    it('已添加的 id 返回 true', () => {
      const { addReference, isAdded } = createHook()
      addReference(makeRef('r1'))
      expect(isAdded('r1')).toBe(true)
    })

    it('未添加的 id 返回 false', () => {
      const { isAdded } = createHook()
      expect(isAdded('r999')).toBe(false)
    })
  })

  describe('moveUp / moveDown', () => {
    it('moveUp 将指定位置元素上移', () => {
      const { addReference, moveUp, selectedRefs } = createHook()
      addReference(makeRef('r1'))
      addReference(makeRef('r2'))
      addReference(makeRef('r3'))
      moveUp(2) // r3 上移到 index 1
      expect(selectedRefs.value[1].id).toBe('r3')
      expect(selectedRefs.value[2].id).toBe('r2')
    })

    it('moveDown 将指定位置元素下移', () => {
      const { addReference, moveDown, selectedRefs } = createHook()
      addReference(makeRef('r1'))
      addReference(makeRef('r2'))
      moveDown(0)
      expect(selectedRefs.value[0].id).toBe('r2')
      expect(selectedRefs.value[1].id).toBe('r1')
    })

    it('index=0 时 moveUp 不做任何事', () => {
      const { addReference, moveUp, selectedRefs } = createHook()
      addReference(makeRef('r1'))
      addReference(makeRef('r2'))
      moveUp(0)
      expect(selectedRefs.value[0].id).toBe('r1')
    })

    it('最后一个 moveDown 不做任何事', () => {
      const { addReference, moveDown, selectedRefs } = createHook()
      addReference(makeRef('r1'))
      addReference(makeRef('r2'))
      moveDown(1)
      expect(selectedRefs.value[1].id).toBe('r2')
    })
  })

  describe('meetsMinCount', () => {
    it('文献数量达到 minCount 时为 true', () => {
      const { addReference, meetsMinCount, minCount } = createHook(DegreeType.UNDERGRADUATE)
      for (let i = 0; i < minCount.value; i++) {
        addReference(makeRef(`r${i}`))
      }
      expect(meetsMinCount.value).toBe(true)
    })

    it('文献数量比 minCount 少 1 时为 false', () => {
      const { addReference, meetsMinCount, minCount } = createHook(DegreeType.UNDERGRADUATE)
      for (let i = 0; i < minCount.value - 1; i++) {
        addReference(makeRef(`r${i}`))
      }
      expect(meetsMinCount.value).toBe(false)
    })
  })

  describe('parseCitations', () => {
    it('解析合法引文后 parseResult 有 valid 条目', () => {
      const { citationInput, parseCitations, parseResult } = createHook()
      citationInput.value =
        '[1] 张三, 李四. 基于深度学习的图像识别研究[J]. 计算机学报, 2022, 45(3): 100-110.'
      parseCitations()
      expect(parseResult.value!.valid).toHaveLength(1)
      expect(parseResult.value!.invalid).toHaveLength(0)
    })

    it('解析包含异常行后 hasParseErrors 为 true', () => {
      const { citationInput, parseCitations, hasParseErrors } = createHook()
      citationInput.value = '这完全是一段无法解析的格式乱七八糟'
      parseCitations()
      expect(hasParseErrors.value).toBe(true)
    })

    it('citationInput 为空时 parseResult 为 null', () => {
      const { citationInput, parseCitations, parseResult } = createHook()
      citationInput.value = ''
      parseCitations()
      expect(parseResult.value).toBeNull()
    })
  })

  describe('addValidParsedRefs', () => {
    it('将合法引文添加到 selectedRefs', () => {
      const { citationInput, parseCitations, addValidParsedRefs, count } = createHook()
      citationInput.value =
        '[1] 张三, 李四. 基于深度学习的图像识别研究[J]. 计算机学报, 2022.\n[2] 王五. 机器学习导论与实践[M]. 北京: 清华大学出版社, 2020.'
      parseCitations()
      addValidParsedRefs()
      expect(count.value).toBe(2)
    })

    it('parseResult 为 null 时不报错', () => {
      const { addValidParsedRefs } = createHook()
      expect(() => addValidParsedRefs()).not.toThrow()
    })
  })

  describe('tryOpenConfirmDialog', () => {
    it('文献数量不足时返回 false 且不打开弹窗', () => {
      const { tryOpenConfirmDialog, showConfirmDialog } = createHook()
      const result = tryOpenConfirmDialog()
      expect(result).toBe(false)
      expect(showConfirmDialog.value).toBe(false)
    })

    it('文献数量满足时返回 true 并打开弹窗', () => {
      const { addReference, tryOpenConfirmDialog, showConfirmDialog, minCount } = createHook(
        DegreeType.UNDERGRADUATE,
      )
      for (let i = 0; i < minCount.value; i++) {
        addReference(makeRef(`r${i}`))
      }
      const result = tryOpenConfirmDialog()
      expect(result).toBe(true)
      expect(showConfirmDialog.value).toBe(true)
    })
  })

  describe('closeConfirmDialog', () => {
    it('关闭后 showConfirmDialog 为 false', () => {
      const { addReference, tryOpenConfirmDialog, closeConfirmDialog, showConfirmDialog, minCount } =
        createHook(DegreeType.UNDERGRADUATE)
      for (let i = 0; i < minCount.value; i++) {
        addReference(makeRef(`r${i}`))
      }
      tryOpenConfirmDialog()
      expect(showConfirmDialog.value).toBe(true)
      closeConfirmDialog()
      expect(showConfirmDialog.value).toBe(false)
    })
  })
})
