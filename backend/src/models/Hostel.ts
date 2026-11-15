import mongoose from 'mongoose';
import { DEFAULT_HOSTEL_TAGS } from '../utils/tagUtils';

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    joinCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    tags: {
      type: [String],
      default: () => [...DEFAULT_HOSTEL_TAGS],
    },
    mealPlan: [{
      mealName: { type: String, required: true },
      isActive: { type: Boolean, default: true },
      offDays: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday, 1 = Monday, etc.
      categories: [{
        categoryName: { type: String, required: true },
        isActive: { type: Boolean, default: true }
      }]
    }],
    defaultPassword: { type: String, default: "" },
    menuChangePolicy: {
      minVotersPercent: { type: Number, default: 60 },
      minVoters: { type: Number, default: 10 },
      cooldownDays: { type: Number, default: 14 }
    },
    menuConstraintsText: { type: String, default: '' },
    menuConstraints: [{
      action: {
        type: String,
        enum: ['ALLOW_IF', 'REQUIRE_IF', 'LIMIT', 'PREFER'],
        required: true,
      },
      appliesTo: {
        mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Snack', 'Dinner'] },
        categoryName: { type: String },
        dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish' },
        tag: { type: String },
      },
      condition: { type: mongoose.Schema.Types.Mixed, required: true },
      max: { type: Number },
      windowSize: { type: Number },
      weight: { type: Number },
      sourcePhrase: { type: String, required: true },
    }],
    menuConstraintsUpdatedAt: { type: Date }
  },
  { timestamps: true }
);

export const Hostel = mongoose.model('Hostel', hostelSchema);
