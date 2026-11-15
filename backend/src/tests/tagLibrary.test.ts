import { describe, it, expect, vi } from 'vitest';
import { normalizeTags, DEFAULT_HOSTEL_TAGS } from '../utils/tagUtils';
import { validateConstraints } from '../services/menuConstraintValidator.service';
import { Hostel } from '../models/Hostel';
import { updateDish } from '../controllers/adminDish.controller';

vi.mock('../models/Dish', () => ({
  Dish: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../models/Hostel', () => ({
  Hostel: {
    updateOne: vi.fn(),
  },
}));

vi.mock('../models/ActivityLog', () => ({
  ActivityLog: {
    create: vi.fn(),
  },
}));

describe('Tag Library & Normalization', () => {
  it('should trim, lowercase, remove empty strings, and deduplicate tags', () => {
    const rawTags = ['  Veg ', 'VEG', 'Paneer  ', 'paneer', ' ', '', 'DESSERT'];
    const normalized = normalizeTags(rawTags);
    expect(normalized).toEqual(['veg', 'paneer', 'dessert']);
  });

  it('should return empty array for non-array inputs', () => {
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags('veg, paneer')).toEqual([]);
  });

  it('should contain expected sensible default tags', () => {
    expect(DEFAULT_HOSTEL_TAGS).toContain('veg');
    expect(DEFAULT_HOSTEL_TAGS).toContain('non-veg');
    expect(DEFAULT_HOSTEL_TAGS).toContain('dessert');
    expect(DEFAULT_HOSTEL_TAGS).toContain('paneer');
    expect(DEFAULT_HOSTEL_TAGS).toContain('healthy');
  });
});

describe('Unknown-tag Warning in Rule Preview', () => {
  it('should warn when a rule references a tag that no dish carries', () => {
    const rules = [
      {
        action: 'REQUIRE_IF',
        appliesTo: { tag: 'dessert' },
        condition: { '==': [1, 1] },
        sourcePhrase: 'Require dessert daily'
      }
    ];

    const dishTagCounts: Record<string, number> = {
      paneer: 3,
      dal: 5
    };

    const { valid, errors, warnings } = validateConstraints(rules, new Set(), dishTagCounts);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toBe("No dishes carry 'dessert', so this rule will have no effect.");
  });

  it('should not warn when dishes carry the referenced tag', () => {
    const rules = [
      {
        action: 'LIMIT',
        appliesTo: { tag: 'paneer' },
        max: 2,
        sourcePhrase: 'Limit paneer to 2 per week'
      }
    ];

    const dishTagCounts: Record<string, number> = {
      paneer: 2
    };

    const { valid, warnings } = validateConstraints(rules, new Set(), dishTagCounts);
    expect(valid).toBe(true);
    expect(warnings).toHaveLength(0);
  });

  it('should validate PREFER rules requiring weight (-50 to 50)', () => {
    // Missing weight
    const invalidRule1 = [{ action: 'PREFER', appliesTo: { tag: 'paneer' }, sourcePhrase: 'Prefer paneer' }];
    const res1 = validateConstraints(invalidRule1, new Set(), { paneer: 1 });
    expect(res1.valid).toBe(false);
    expect(res1.errors[0]).toContain("is a PREFER rule but has an invalid or missing 'weight'");

    // Out of range weight
    const invalidRule2 = [{ action: 'PREFER', appliesTo: { tag: 'paneer' }, weight: 100, sourcePhrase: 'Prefer paneer' }];
    const res2 = validateConstraints(invalidRule2, new Set(), { paneer: 1 });
    expect(res2.valid).toBe(false);

    // Valid weight
    const validRule = [{ action: 'PREFER', appliesTo: { tag: 'paneer' }, weight: 25, sourcePhrase: 'Prefer paneer' }];
    const res3 = validateConstraints(validRule, new Set(), { paneer: 1 });
    expect(res3.valid).toBe(true);
  });
});

describe('Dish update addToSet behavior', () => {
  it('should call Hostel.updateOne with $addToSet when dish has new tags', async () => {
    const req: any = {
      params: { id: 'dish123' },
      body: {
        name: 'Paneer Kofta',
        mealType: 'Dinner',
        category: 'Main Course',
        tags: ['Paneer ', ' Gravy'],
        priceScore: 4,
        healthScore: 4,
        itemClass: 'ROTATING'
      },
      user: { _id: 'admin1', hostelId: 'hostel1' }
    };

    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    const mockDish = { _id: 'dish123', name: 'Paneer Kofta', tags: ['paneer', 'gravy'] };
    vi.mocked(Hostel.updateOne).mockResolvedValue({} as any);

    // Call updateDish with mocked findOneAndUpdate
    const { Dish } = await import('../models/Dish');
    vi.mocked(Dish.findOneAndUpdate).mockResolvedValue(mockDish as any);

    await updateDish(req, res);

    expect(Dish.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'dish123', hostelId: 'hostel1' },
      expect.objectContaining({ tags: ['paneer', 'gravy'] }),
      { new: true }
    );

    expect(Hostel.updateOne).toHaveBeenCalledWith(
      { _id: 'hostel1' },
      { $addToSet: { tags: { $each: ['paneer', 'gravy'] } } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
