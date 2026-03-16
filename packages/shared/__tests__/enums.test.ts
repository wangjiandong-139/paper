import fc from 'fast-check';
import {
  ChapterStatus,
  DegreeType,
  Language,
  OrderStatus,
  PlanType,
  ReferenceSource,
  RevisionType,
} from '../src/enums';

describe('enum value uniqueness', () => {
  const enums = {
    PlanType,
    OrderStatus,
    ChapterStatus,
    ReferenceSource,
    Language,
    DegreeType,
    RevisionType,
  };

  for (const [name, enumObj] of Object.entries(enums)) {
    it(`${name} should have unique string values`, () => {
      const values = Object.values(enumObj);
      const asSet = new Set(values);
      expect(asSet.size).toBe(values.length);
    });
  }

  it('PlanType should include BASIC only for now', () => {
    expect(Object.values(PlanType)).toEqual(['BASIC']);
  });
});

