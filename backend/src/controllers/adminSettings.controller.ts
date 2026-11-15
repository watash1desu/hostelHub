import { Request, Response } from 'express';
import { Hostel } from '../models/Hostel';
import { Dish } from '../models/Dish';
import { ActivityLog } from '../models/ActivityLog';
import { parseMenuConstraints } from '../services/menuConstraintParser.service';
import { validateConstraints } from '../services/menuConstraintValidator.service';
import { generateJoinCode } from '../utils/userUtils';

export const getSettings = async (req: Request, res: Response) => {
    const hostelId = req.user!.hostelId;
    const hostel = await Hostel.findById(hostelId).select('mealPlan menuConstraints menuConstraintsText defaultPassword menuChangePolicy joinCode');
    
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    if (!hostel.joinCode) {
      hostel.joinCode = generateJoinCode();
      await hostel.save();
    }

    return res.status(200).json({
      mealPlan: hostel.mealPlan,
      menuConstraints: hostel.menuConstraints || [],
      menuConstraintsText: hostel.menuConstraintsText || '',
      defaultPassword: hostel.defaultPassword || '',
      menuChangePolicy: hostel.menuChangePolicy || { minVotersPercent: 60, minVoters: 10, cooldownDays: 14 },
      joinCode: hostel.joinCode
    });
};

export const updateSettings = async (req: Request, res: Response) => {
    const hostelId = req.user!.hostelId;
    const { mealPlan, defaultPassword, menuChangePolicy } = req.body;

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    // Handle cascading deletes for meal categories
    // If a category was deleted entirely from the payload, we need to delete its dishes.
    // The frontend will actually handle soft-delete (isActive: false). 
    // If it's missing entirely from the array, it means it was explicitly HARD deleted.
    const oldMealPlan = hostel.mealPlan;
    
    for (const oldMeal of oldMealPlan) {
      const newMeal = mealPlan.find((m: any) => m.mealName === oldMeal.mealName);
      if (newMeal) {
        for (const oldCat of oldMeal.categories) {
          const catExists = newMeal.categories.find((c: any) => c.categoryName === oldCat.categoryName);
          if (!catExists) {
            // Category was permanently deleted
            const dishesToDelete = await Dish.find({ hostelId, mealType: oldMeal.mealName, category: oldCat.categoryName });
            for (const d of dishesToDelete) {
              await Dish.findOneAndDelete({ _id: d._id });
            }
          }
        }
      } else {
         // Entire meal was deleted (unlikely but possible)
         const dishesToDelete = await Dish.find({ hostelId, mealType: oldMeal.mealName });
         for (const d of dishesToDelete) {
           await Dish.findOneAndDelete({ _id: d._id });
         }
      }
    }

    hostel.mealPlan = mealPlan;

    if (defaultPassword !== undefined) {
      if (!defaultPassword.trim()) {
        res.status(400).json({ message: 'Default password cannot be empty' });
        return;
      }
      hostel.defaultPassword = defaultPassword;
    }

    if (menuChangePolicy) {
      hostel.menuChangePolicy = {
        minVotersPercent: Number(menuChangePolicy.minVotersPercent) ?? 60,
        minVoters: Number(menuChangePolicy.minVoters) ?? 10,
        cooldownDays: Number(menuChangePolicy.cooldownDays) ?? 14
      };
    }

    await hostel.save();

    return res.status(200).json({ 
      message: 'Settings updated successfully',
      mealPlan: hostel.mealPlan,
      menuChangePolicy: hostel.menuChangePolicy
    });
};

export const previewMenuConstraints = async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'text is required' });
    }

    const dishes = await Dish.find({ hostelId: req.user!.hostelId, status: 'ACTIVE' })
      .select('_id name mealType tags')
      .lean();
    const catalog = dishes.map(d => ({ id: d._id.toString(), name: d.name, mealType: d.mealType, tags: d.tags }));

    // Compute dish counts per tag
    const dishTagCounts: Record<string, number> = {};
    for (const d of dishes) {
      if (Array.isArray(d.tags)) {
        for (const t of d.tags) {
          const lower = t.trim().toLowerCase();
          if (lower) {
            dishTagCounts[lower] = (dishTagCounts[lower] || 0) + 1;
          }
        }
      }
    }

    const { rules, preview } = await parseMenuConstraints(text, catalog, dishTagCounts);
    const validDishIds = new Set(catalog.map(d => d.id));
    const { valid, errors, warnings } = validateConstraints(rules, validDishIds, dishTagCounts);

    const constraints = rules; // Map rules to constraints for backwards compatibility

    if (!valid) {
      return res.status(422).json({ message: 'Could not produce a consistent rule set', errors, warnings, constraints, preview });
    }

    return res.json({ constraints, preview, warnings });
};

export const confirmMenuConstraints = async (req: Request, res: Response) => {
    const { text, constraints } = req.body; 
    if (!Array.isArray(constraints)) {
      return res.status(400).json({ message: 'constraints array is required' });
    }

    await Hostel.updateOne(
      { _id: req.user!.hostelId },
      { menuConstraintsText: text, menuConstraints: constraints, menuConstraintsUpdatedAt: new Date() }
    );

    await ActivityLog.create({
      hostelId: req.user!.hostelId,
      userId: req.user!._id,
      action: 'Updated menu constraints',
    });

    return res.json({ message: 'Saved' });
};

export const deleteHostel = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Hostel deleted' });
};

export const regenerateJoinCode = async (req: Request, res: Response) => {
    const hostelId = req.user!.hostelId;
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    let newCode = generateJoinCode();
    while (await Hostel.findOne({ joinCode: newCode, _id: { $ne: hostel._id } })) {
      newCode = generateJoinCode();
    }

    hostel.joinCode = newCode;
    await hostel.save();

    await ActivityLog.create({
      hostelId,
      userId: req.user!._id,
      action: `Regenerated join code: ${newCode}`,
    });

    return res.status(200).json({ joinCode: newCode });
};
