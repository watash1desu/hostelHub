import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Hostel } from '../models/Hostel';
import { User } from '../models/User';
import { Dish } from '../models/Dish';
import { Issue } from '../models/Issue';
import { MealReview } from '../models/MealReview';
import { StudentVote } from '../models/StudentVote';
import { MessMenu } from '../models/MessMenu';
import { MenuRecommendation } from '../models/MenuRecommendation';
import { ActivityLog } from '../models/ActivityLog';
import { generateJoinCode, generateStudentUsername } from '../utils/userUtils';
import { computeMenuRecommendations } from '../services/menuComputation.service';
import { buildMessMenu } from '../services/menuBuilder.service';

const DISH_DATA = [
  // Breakfast
  { name: 'Poha', mealType: 'Breakfast', category: 'Main Course', priceScore: 1, healthScore: 4, tags: ['veg', 'healthy', 'spicy'] },
  { name: 'Idli Sambar', mealType: 'Breakfast', category: 'Main Course', priceScore: 2, healthScore: 5, tags: ['veg', 'healthy'] },
  { name: 'Masala Dosa', mealType: 'Breakfast', category: 'Main Course', priceScore: 3, healthScore: 3, tags: ['veg', 'spicy'] },
  { name: 'Puri Bhaji', mealType: 'Breakfast', category: 'Main Course', priceScore: 2, healthScore: 2, tags: ['veg', 'fried', 'spicy'] },
  { name: 'Boiled Eggs', mealType: 'Breakfast', category: 'Main Course', priceScore: 2, healthScore: 5, tags: ['non-veg', 'egg', 'healthy'] },
  { name: 'Aloo Paratha', mealType: 'Breakfast', category: 'Bread', priceScore: 2, healthScore: 2, tags: ['veg', 'bread', 'spicy'] },
  { name: 'Bread Butter', mealType: 'Breakfast', category: 'Bread', priceScore: 1, healthScore: 3, tags: ['veg', 'bread'] },
  { name: 'Masala Chai', mealType: 'Breakfast', category: 'Beverage', priceScore: 1, healthScore: 3, tags: ['veg', 'beverage', 'sweet'] },
  { name: 'Filter Coffee', mealType: 'Breakfast', category: 'Beverage', priceScore: 1, healthScore: 3, tags: ['veg', 'beverage'] },
  { name: 'Coconut Chutney', mealType: 'Breakfast', category: 'Condiment', priceScore: 1, healthScore: 4, tags: ['veg'] },
  // Lunch
  { name: 'Dal Tadka', mealType: 'Lunch', category: 'Lentils', priceScore: 2, healthScore: 4, tags: ['veg', 'dal', 'healthy', 'spicy'] },
  { name: 'Dal Makhani', mealType: 'Lunch', category: 'Lentils', priceScore: 3, healthScore: 3, tags: ['veg', 'dal'] },
  { name: 'Sambar', mealType: 'Lunch', category: 'Lentils', priceScore: 1, healthScore: 5, tags: ['veg', 'dal', 'healthy'] },
  { name: 'Steamed Rice', mealType: 'Lunch', category: 'Rice', priceScore: 1, healthScore: 4, tags: ['veg', 'rice'] },
  { name: 'Jeera Rice', mealType: 'Lunch', category: 'Rice', priceScore: 2, healthScore: 3, tags: ['veg', 'rice'] },
  { name: 'Paneer Butter Masala', mealType: 'Lunch', category: 'Main Course', priceScore: 4, healthScore: 2, tags: ['veg', 'paneer'] },
  { name: 'Chicken Curry', mealType: 'Lunch', category: 'Main Course', priceScore: 5, healthScore: 3, tags: ['non-veg', 'chicken', 'spicy'] },
  { name: 'Aloo Gobi', mealType: 'Lunch', category: 'Sides', priceScore: 2, healthScore: 4, tags: ['veg', 'sabzi', 'healthy'] },
  { name: 'Bhindi Fry', mealType: 'Lunch', category: 'Sides', priceScore: 2, healthScore: 3, tags: ['veg', 'sabzi', 'fried'] },
  { name: 'Chapati', mealType: 'Lunch', category: 'Bread', priceScore: 1, healthScore: 5, tags: ['veg', 'bread', 'healthy'] },
  { name: 'Mixed Pickle', mealType: 'Lunch', category: 'Condiment', priceScore: 1, healthScore: 2, tags: ['veg', 'spicy'] },
  { name: 'Boondi Raita', mealType: 'Lunch', category: 'Condiment', priceScore: 2, healthScore: 4, tags: ['veg', 'healthy'] },
  // Snack
  { name: 'Samosa', mealType: 'Snack', category: 'Snacks', priceScore: 1, healthScore: 1, tags: ['veg', 'fried', 'spicy'] },
  { name: 'Onion Pakoda', mealType: 'Snack', category: 'Snacks', priceScore: 1, healthScore: 2, tags: ['veg', 'fried', 'spicy'] },
  { name: 'Pav Bhaji', mealType: 'Snack', category: 'Snacks', priceScore: 3, healthScore: 2, tags: ['veg', 'spicy', 'bread'] },
  { name: 'Veg Cutlet', mealType: 'Snack', category: 'Snacks', priceScore: 2, healthScore: 3, tags: ['veg', 'fried'] },
  { name: 'Masala Tea', mealType: 'Snack', category: 'Snacks', priceScore: 1, healthScore: 3, tags: ['veg', 'beverage'] },
  // Dinner
  { name: 'Rajma Masala', mealType: 'Dinner', category: 'Lentils', priceScore: 2, healthScore: 4, tags: ['veg', 'dal', 'healthy', 'spicy'] },
  { name: 'Chana Dal', mealType: 'Dinner', category: 'Lentils', priceScore: 2, healthScore: 4, tags: ['veg', 'dal', 'healthy'] },
  { name: 'Veg Biryani', mealType: 'Dinner', category: 'Rice', priceScore: 3, healthScore: 3, tags: ['veg', 'rice', 'spicy'] },
  { name: 'Chicken Biryani', mealType: 'Dinner', category: 'Rice', priceScore: 5, healthScore: 2, tags: ['non-veg', 'chicken', 'rice', 'spicy'] },
  { name: 'Egg Curry', mealType: 'Dinner', category: 'Main Course', priceScore: 3, healthScore: 4, tags: ['non-veg', 'egg', 'spicy'] },
  { name: 'Kadai Paneer', mealType: 'Dinner', category: 'Main Course', priceScore: 4, healthScore: 3, tags: ['veg', 'paneer', 'spicy'] },
  { name: 'Mix Veg Korma', mealType: 'Dinner', category: 'Main Course', priceScore: 3, healthScore: 3, tags: ['veg', 'sabzi'] },
  { name: 'Aloo Jeera', mealType: 'Dinner', category: 'Sides', priceScore: 2, healthScore: 4, tags: ['veg', 'sabzi'] },
  { name: 'Phulka', mealType: 'Dinner', category: 'Bread', priceScore: 1, healthScore: 5, tags: ['veg', 'bread', 'healthy'] },
  { name: 'Butter Naan', mealType: 'Dinner', category: 'Bread', priceScore: 2, healthScore: 2, tags: ['veg', 'bread'] },
  { name: 'Gulab Jamun', mealType: 'Dinner', category: 'Dessert', priceScore: 2, healthScore: 1, tags: ['veg', 'sweet', 'dessert'] },
  { name: 'Rice Kheer', mealType: 'Dinner', category: 'Dessert', priceScore: 2, healthScore: 3, tags: ['veg', 'sweet', 'dessert', 'rice'] },
  { name: 'Fruit Custard', mealType: 'Dinner', category: 'Dessert', priceScore: 2, healthScore: 4, tags: ['veg', 'sweet', 'dessert', 'healthy'] },
];

const COMPLAINT_SUBJECTS = [
  'Rotten dish', 'Ants on tables', 'Cold food served at dinner', 'Cockroach near water cooler',
  'Late breakfast timing', 'Salt missing in Dal', 'Unhygienic kitchen utensils', 'Burnt rotis',
  'Watery milk served with cereal', 'Spoon supply exhausted quickly', 'Oily curry served today',
  'Stale bread at breakfast', 'Undercooked rice at lunch', 'Excess chilly powder in curry'
];

async function seed() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to run seed in production without --force');
    process.exit(1);
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostelHub';
  await mongoose.connect(mongoURI);

  // 1. Wipe existing "Home" hostel data
  const existing = await Hostel.findOne({ domain: 'home' });
  if (existing) {
    const id = existing._id;
    await Promise.all([
      User.deleteMany({ hostelId: id }),
      Dish.deleteMany({ hostelId: id }),
      Issue.deleteMany({ hostelId: id }),
      MealReview.deleteMany({ hostelId: id }),
      StudentVote.deleteMany({ hostelId: id }),
      MessMenu.deleteMany({ hostelId: id }),
      MenuRecommendation.deleteMany({ hostelId: id }),
      ActivityLog.deleteMany({ hostelId: id }),
      Hostel.deleteOne({ _id: id })
    ]);
  }
  await User.deleteMany({ username: { $regex: '@home$', $options: 'i' } });

  // 2. Create Hostel
  const hostel = await Hostel.create({
    name: 'Home',
    domain: 'home',
    joinCode: generateJoinCode(),
    mealPlan: [
      { mealName: 'Breakfast', offDays: [], categories: [{ categoryName: 'Main Course' }, { categoryName: 'Beverage' }, { categoryName: 'Bread' }, { categoryName: 'Condiment' }] },
      { mealName: 'Lunch', offDays: [], categories: [{ categoryName: 'Main Course' }, { categoryName: 'Lentils' }, { categoryName: 'Rice' }, { categoryName: 'Sides' }, { categoryName: 'Condiment' }, { categoryName: 'Bread' }] },
      { mealName: 'Snack', offDays: [], categories: [{ categoryName: 'Snacks' }] },
      { mealName: 'Dinner', offDays: [], categories: [{ categoryName: 'Main Course' }, { categoryName: 'Lentils' }, { categoryName: 'Rice' }, { categoryName: 'Sides' }, { categoryName: 'Dessert' }, { categoryName: 'Bread' }] }
    ],
    menuChangePolicy: { minVotersPercent: 60, minVoters: 10, cooldownDays: 14 }
  });

  // 3. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const commonUser = {
    hostelId: hostel._id,
    passwordHash,
    mustChangePassword: false,
    status: 'ACTIVE' as const,
    isActive: true
  };

  await User.insertMany([
    { ...commonUser, username: 'admin@home', name: 'Admin', role: 'ADMIN' as const, isPrimaryAdmin: true, roleTitle: 'Primary Admin', permissions: ['MANAGE_MENU' as const, 'MANAGE_ISSUES' as const] },
    { ...commonUser, username: 'manager@home', name: 'Mess Manager', role: 'ADMIN' as const, isPrimaryAdmin: false, roleTitle: 'Mess Manager', permissions: ['MANAGE_MENU' as const] },
    { ...commonUser, username: 'complaints@home', name: 'Complaints Officer', role: 'ADMIN' as const, isPrimaryAdmin: false, roleTitle: 'Complaints Officer', permissions: ['MANAGE_ISSUES' as const] },
  ]);

  const students: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const roomNo = (100 + i).toString();
    const username = await generateStudentUsername(hostel._id, hostel.domain, roomNo);
    const student = await User.create({ ...commonUser, username, name: `Student ${roomNo}`, roomNo, role: 'STUDENT' as const });
    students.push(student);
  }

  // 4. Create Dishes (~40 active + 3 under review)
  const dishDocs = await Dish.insertMany(
    DISH_DATA.map(d => ({ ...d, hostelId: hostel._id, itemClass: 'ROTATING' as const, status: 'ACTIVE' as const }))
  );
  await Dish.insertMany([
    { hostelId: hostel._id, name: 'Brownie Ice Cream', mealType: 'Dinner', category: 'Dessert', priceScore: 3, healthScore: 1, tags: ['sweet', 'dessert'], status: 'UNDER_REVIEW' as const, suggestedBy: students[0]._id },
    { hostelId: hostel._id, name: 'Hakka Noodles', mealType: 'Snack', category: 'Snacks', priceScore: 2, healthScore: 2, tags: ['veg', 'spicy'], status: 'UNDER_REVIEW' as const, suggestedBy: students[1]._id },
    { hostelId: hostel._id, name: 'Chicken Shawarma', mealType: 'Dinner', category: 'Main Course', priceScore: 4, healthScore: 3, tags: ['non-veg', 'chicken'], status: 'UNDER_REVIEW' as const, suggestedBy: students[2]._id }
  ]);

  // 5. Votes from ~70% students (14 out of 20)
  const votingStudents = students.slice(0, 14);
  const mealNames = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  await StudentVote.insertMany(votingStudents.map((s, idx) => ({
    hostelId: hostel._id,
    userId: s._id,
    wantsNewMenu: idx < 10, // ~71% want new menu
    votes: mealNames.map(mealName => {
      const mealDishes = dishDocs.filter(d => d.mealType === mealName);
      return {
        mealName,
        categoryName: mealDishes[0]?.category || 'Main Course',
        dishes: mealDishes.slice(0, 3).map(d => d._id)
      };
    })
  })));

  // 6. ~60 Meal Reviews
  const reviews: any[] = [];
  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    const student = students[i % students.length];
    const dish = dishDocs[i % dishDocs.length];
    const daysAgo = (i % 28) + 1;
    reviews.push({
      hostelId: hostel._id,
      studentId: student._id,
      dishId: dish._id,
      mealType: dish.mealType,
      servedOn: new Date(now - daysAgo * 86400000 - i * 1000),
      rating: ((i % 5) + 1),
      comment: ['Great taste!', 'Could be hotter', 'Very healthy', 'A bit salty', 'Loved it'][i % 5]
    });
  }
  await MealReview.insertMany(reviews);

  // 7. ~30 Complaints (mixed OPEN / CLOSED over 30 days)
  const issues: any[] = [];
  for (let i = 0; i < 30; i++) {
    const student = students[i % students.length];
    const isClosed = i % 2 === 0;
    const daysAgo = (i % 29) + 1;
    issues.push({
      hostelId: hostel._id,
      raisedBy: student._id,
      raisedByName: student.name,
      roomNo: student.roomNo,
      subject: COMPLAINT_SUBJECTS[i % COMPLAINT_SUBJECTS.length],
      description: `Issue reported by student in room ${student.roomNo}. Needs attention.`,
      status: isClosed ? 'CLOSED' : 'OPEN',
      resolverNote: isClosed ? 'Inspected and resolved by mess committee.' : undefined,
      createdAt: new Date(now - daysAgo * 86400000)
    });
  }
  await Issue.insertMany(issues);

  // 8. One PUBLISHED menu dated 20 days ago
  await computeMenuRecommendations(hostel._id.toString());
  const menu = await buildMessMenu(hostel._id.toString(), 'Standard', 'MANUAL');
  const twentyDaysAgo = new Date(now - 20 * 86400000);
  menu.status = 'PUBLISHED';
  menu.publishedAt = twentyDaysAgo;
  menu.effectiveFrom = twentyDaysAgo;
  menu.effectiveTo = new Date(twentyDaysAgo.getTime() + 7 * 86400000);
  await menu.save();

  // 9. Print credentials
  console.log('\n==================================================');
  console.log('SEED COMPLETE - DEMO HOSTEL CREDENTIALS');
  console.log('==================================================');
  console.log(`Hostel Name : ${hostel.name}`);
  console.log(`Hostel Domain: ${hostel.domain}`);
  console.log(`Join Code   : ${hostel.joinCode}`);
  console.log(`Shared Pass : password123`);
  console.log('--------------------------------------------------');
  console.log('Admin Accounts:');
  console.log('  admin@home        (Primary Admin)');
  console.log('  manager@home      (Mess Manager)');
  console.log('  complaints@home   (Complaints Officer)');
  console.log('Student Accounts:');
  for (const s of students) {
    console.log(`  ${s.username} (Room ${s.roomNo})`);
  }
  console.log('==================================================\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
