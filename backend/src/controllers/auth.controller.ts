import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '../models/User';
import { Hostel } from '../models/Hostel';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, refreshAccessToken, revokeRefreshToken } from '../utils/jwt';
import { generateJoinCode, generateStudentUsername } from '../utils/userUtils';

// ADMIN REGISTRATION
export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  const { hostelName, adminName, adminEmail, adminPassword, mealPlan } = req.body;

  if (!hostelName?.trim() || !adminName?.trim() || !adminEmail?.trim() || !adminPassword?.trim()) {
    res.status(400).json({ message: 'All fields are required' });
    return;
  }

  const trimmedHostelName = hostelName.trim();
  if (trimmedHostelName.length < 3 || trimmedHostelName.length > 40 || !/^[a-zA-Z0-9\s]+$/.test(trimmedHostelName)) {
    res.status(400).json({
      message: 'Hostel name must be 3-40 characters and contain only letters, numbers, and spaces',
      field: 'hostelName'
    });
    return;
  }

  if (adminPassword.length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters long' });
    return;
  }

  const domain = trimmedHostelName
    .toLowerCase()
    .replace(/\s+/g, '')
    .substring(0, 10);

  const generatedUsername = `admin@${domain}`;

  const escapedName = trimmedHostelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingHostel = await Hostel.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
      { domain }
    ]
  });

  const existingUser = await User.findOne({ username: generatedUsername });

  if (existingHostel || existingUser) {
    res.status(409).json({
      message: 'Hostel already registered. Please choose a different name.',
      field: 'hostelName'
    });
    return;
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const finalMealPlan = mealPlan || [
      { mealName: 'Breakfast', offDays: [], categories: [{ categoryName: 'Main Course' }, { categoryName: 'Beverage' }, { categoryName: 'Bread' }, { categoryName: 'Condiment' }] },
      { mealName: 'Lunch', offDays: [], categories: [{ categoryName: 'Main Course' }, { categoryName: 'Lentils' }, { categoryName: 'Rice' }, { categoryName: 'Sides' }, { categoryName: 'Condiment' }, { categoryName: 'Bread' }] },
      { mealName: 'Snack', offDays: [], categories: [{ categoryName: 'Snacks' }] },
      { mealName: 'Dinner', offDays: [], categories: [{ categoryName: 'Main Course' }, { categoryName: 'Lentils' }, { categoryName: 'Rice' }, { categoryName: 'Sides' }, { categoryName: 'Dessert' }, { categoryName: 'Bread' }] }
    ];

    const hostel = new Hostel({ name: hostelName, domain, mealPlan: finalMealPlan, joinCode: generateJoinCode() });
    await hostel.save({ session });

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const user = new User({
      hostelId: hostel._id,
      name: adminName,
      username: generatedUsername,
      email: adminEmail,
      role: 'ADMIN',
      isPrimaryAdmin: true,
      permissions: ['MANAGE_MENU', 'MANAGE_ISSUES'],
      passwordHash,
    });
    await user.save({ session });

    await session.commitTransaction();
    
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      hostelId: hostel._id.toString()
    });

    const refreshToken = await generateRefreshToken(user._id.toString());

    res.status(201).json({
      message: 'Admin registered successfully',
      hostel: { id: hostel._id, name: hostel.name, domain: hostel.domain },
      user: { id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, isPrimaryAdmin: user.isPrimaryAdmin, permissions: user.permissions },
      accessToken,
      refreshToken
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('AUTH', `Admin registration error: ${(error as Error).message}`);
    res.status(500).json({ message: 'Internal server error during registration' });
  } finally {
    session.endSession();
  }
};

// STUDENT REGISTRATION VIA JOIN CODE
export const registerStudent = async (req: Request, res: Response): Promise<void> => {
  const { joinCode, name, roomNo, email, password } = req.body;

  if (!joinCode?.trim()) {
    res.status(400).json({ message: 'Join code is required', field: 'joinCode' });
    return;
  }
  if (!name?.trim()) {
    res.status(400).json({ message: 'Name is required', field: 'name' });
    return;
  }
  if (!roomNo?.trim()) {
    res.status(400).json({ message: 'Room number is required', field: 'roomNo' });
    return;
  }
  if (!email?.trim()) {
    res.status(400).json({ message: 'Email is required', field: 'email' });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    res.status(400).json({ message: 'Invalid email address', field: 'email' });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters long', field: 'password' });
    return;
  }

  const hostel = await Hostel.findOne({ joinCode: joinCode.trim().toUpperCase() });
  if (!hostel) {
    res.status(400).json({ message: 'Invalid join code', field: 'joinCode' });
    return;
  }

  const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
  if (existingEmail) {
    res.status(409).json({ message: 'Email is already in use by another account', field: 'email' });
    return;
  }

  const username = await generateStudentUsername(hostel._id, hostel.domain, roomNo.trim());
  const passwordHash = await bcrypt.hash(password, 10);

  const student = new User({
    hostelId: hostel._id,
    name: name.trim(),
    roomNo: roomNo.trim(),
    email: email.trim().toLowerCase(),
    username,
    passwordHash,
    role: 'STUDENT',
    status: 'PENDING',
    isActive: true,
    mustChangePassword: false,
  });

  await student.save();

  res.status(201).json({
    message: 'Registration submitted for approval',
    username: student.username,
    status: student.status
  });
};

// UNIFIED LOGIN (Email & Password)
export const login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: 'Invalid username or password' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ message: 'Your account has been deactivated. Please contact your admin.' });
      return;
    }

    if (user.status === 'PENDING') {
      res.status(403).json({ message: 'Your account is pending approval by the hostel administrator.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid username or password' });
      return;
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      hostelId: user.hostelId.toString()
    });
    const refreshToken = await generateRefreshToken(user._id.toString());

    res.status(200).json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, isPrimaryAdmin: user.isPrimaryAdmin, permissions: user.permissions, mustChangePassword: user.mustChangePassword ?? false },
      accessToken,
      refreshToken
    });
};



// REFRESH TOKEN
export const refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken?.trim()) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const userId = await verifyRefreshToken(refreshToken);
    if (!userId) {
      res.status(401).json({ message: 'Invalid or expired refresh token. Please login again.' });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(userId);
    res.json({
      message: 'Token refreshed',
      tokens: { accessToken, refreshToken: newRefreshToken }
    });
};

// CHECK HOSTEL AVAILABILITY
export const checkHostelAvailable = async (req: Request, res: Response): Promise<void> => {
  const { name } = req.query;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ message: 'Hostel name is required' });
    return;
  }

  const trimmed = name.trim();
  const domain = trimmed.toLowerCase().replace(/\s+/g, '').substring(0, 10);
  const generatedUsername = `admin@${domain}`;
  const escapedName = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const existingHostel = await Hostel.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
      { domain }
    ]
  });

  const existingUser = await User.findOne({ username: generatedUsername });

  res.status(200).json({ available: !existingHostel && !existingUser });
};

// LOGOUT
export const logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.json({ message: 'Logged out successfully' });
};

