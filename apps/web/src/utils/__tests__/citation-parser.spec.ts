import { describe, it, expect } from 'vitest'
import {
  parseCitationLine,
  parseCitationText,
  getMinReferenceCount,
  REFERENCE_MIN_COUNT,
} from '../citation-parser'
import { DegreeType } from '@/types/wizard'

describe('parseCitationLine', () => {
  describe('合法格式', () => {
    it('解析完整期刊引文格式', () => {
      const line = '[1] 张三, 李四. 基于深度学习的图像识别[J]. 计算机学报, 2022, 45(3): 100-110.'
      const result = parseCitationLine(line)
      expect(result.valid).toBe(true)
      expect(result.item).toBeDefined()
      expect(result.item!.title).toBe('基于深度学习的图像识别')
      expect(result.item!.authors).toContain('张三')
      expect(result.item!.authors).toContain('李四')
      expect(result.item!.year).toBe(2022)
    })

    it('解析无序号的引文格式', () => {
      const line = '张三. 机器学习研究综述[J]. 计算机研究与发展, 2021, 58(1): 1-15.'
      const result = parseCitationLine(line)
      expect(result.valid).toBe(true)
      expect(result.item!.authors).toContain('张三')
      expect(result.item!.year).toBe(2021)
    })

    it('解析专著格式 [M]', () => {
      const line = '[2] 王五. 机器学习导论[M]. 北京: 清华大学出版社, 2020.'
      const result = parseCitationLine(line)
      expect(result.valid).toBe(true)
      expect(result.item!.title).toBe('机器学习导论')
      expect(result.item!.year).toBe(2020)
    })

    it('解析学位论文格式 [D]', () => {
      const line = '[3] 赵六. 自然语言处理关键技术研究[D]. 清华大学, 2021.'
      const result = parseCitationLine(line)
      expect(result.valid).toBe(true)
      expect(result.item!.title).toBe('自然语言处理关键技术研究')
    })

    it('解析结果 source 为 USER_INPUT', () => {
      const line = '[1] 作者. 测试标题内容[J]. 期刊名, 2020.'
      const result = parseCitationLine(line)
      expect(result.valid).toBe(true)
      expect(result.item!.source).toBe('USER_INPUT')
    })

    it('解析结果包含 raw_citation', () => {
      const line = '[1] 作者. 测试标题内容[J]. 期刊名, 2020.'
      const result = parseCitationLine(line)
      expect(result.item!.raw_citation).toBe(line)
    })

    it('每次解析生成不同的 id', () => {
      const line = '[1] 作者. 测试标题内容[J]. 期刊名, 2020.'
      const r1 = parseCitationLine(line)
      const r2 = parseCitationLine(line)
      expect(r1.item!.id).not.toBe(r2.item!.id)
    })
  })

  describe('异常格式', () => {
    it('空行返回无效', () => {
      const result = parseCitationLine('')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('只有空白字符返回无效', () => {
      const result = parseCitationLine('   ')
      expect(result.valid).toBe(false)
    })

    it('无句号分隔符返回无效', () => {
      const result = parseCitationLine('这只是一段普通文字没有格式')
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/格式不完整/)
    })

    it('标题过短返回无效', () => {
      const result = parseCitationLine('[1] 张三. 短[J]. 期刊, 2020.')
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/标题过短/)
    })

    it('保留原始 raw 文本', () => {
      const line = '无效格式'
      const result = parseCitationLine(line)
      expect(result.raw).toBe(line)
    })
  })
})

describe('parseCitationText', () => {
  const validLine1 = '[1] 张三, 李四. 基于深度学习的图像识别研究[J]. 计算机学报, 2022, 45(3): 100.'
  const validLine2 = '[2] 王五. 机器学习导论与应用[M]. 北京: 清华大学出版社, 2020.'
  const invalidLine = '格式完全不对没有任何标准结构'

  it('解析全部合法行', () => {
    const result = parseCitationText(`${validLine1}\n${validLine2}`)
    expect(result.valid).toHaveLength(2)
    expect(result.invalid).toHaveLength(0)
    expect(result.all).toHaveLength(2)
  })

  it('解析含有异常行的文本', () => {
    const result = parseCitationText(`${validLine1}\n${invalidLine}\n${validLine2}`)
    expect(result.valid).toHaveLength(2)
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0].raw).toBe(invalidLine)
  })

  it('忽略空行', () => {
    const result = parseCitationText(`${validLine1}\n\n\n${validLine2}`)
    expect(result.all).toHaveLength(2)
  })

  it('全部异常时 valid 为空', () => {
    const result = parseCitationText('无效行1\n无效行2')
    expect(result.valid).toHaveLength(0)
    expect(result.invalid).toHaveLength(2)
  })

  it('空文本返回空结果', () => {
    const result = parseCitationText('')
    expect(result.all).toHaveLength(0)
  })
})

describe('getMinReferenceCount', () => {
  it('本科最少 10 篇', () => {
    expect(getMinReferenceCount(DegreeType.UNDERGRADUATE)).toBe(10)
  })

  it('硕士最少 15 篇', () => {
    expect(getMinReferenceCount(DegreeType.MASTER)).toBe(15)
  })

  it('博士最少 25 篇', () => {
    expect(getMinReferenceCount(DegreeType.DOCTOR)).toBe(25)
  })

  it('其他最少 10 篇', () => {
    expect(getMinReferenceCount(DegreeType.OTHER)).toBe(10)
  })

  it('REFERENCE_MIN_COUNT 覆盖所有 DegreeType', () => {
    for (const dt of Object.values(DegreeType)) {
      expect(REFERENCE_MIN_COUNT[dt]).toBeGreaterThan(0)
    }
  })
})
