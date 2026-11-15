import { Request, Response } from 'express';
import { User } from '../models/User';
import { ActivityLog } from '../models/ActivityLog';
import { Hostel } from '../models/Hostel';
import crypto from 'crypto';
import { StudentVote } from '../models/StudentVote';
import { MealReview } from '../models/MealReview';
import { Issue } from '../models/Issue';
import { RefreshToken } from '../models/RefreshToken';
import { Dish } from '../models/Dish';
import { asyncHandler } from '../utils/asyncHandler';
import { generateStudentUsername } from '../utils/userUtils';

// Generate a random 12-char hex password
const generatePassword = (): string => crypto.randomBytes(6).toString('hex');

// Create User (Student/Worker)
export const createUser = async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    let { username, password, name, role, roomNo, permissions, roleTitle } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    if (role === 'STUDENT' && !roomNo && !username) {
      return res.status(400).json({ message: 'Room number is required for students if username is not provided' });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create users' });
    }

    const hostel = await Hostel.findById(admin.hostelId);
    if (!hostel) {
      return res.status(500).json({ message: 'Hostel information not found' });
    }

    // Generate or format username
    if (username) {
      const suffix = `@${hostel.domain}`;
      if (!username.endsWith(suffix)) {
        username = `${username}${suffix}`;
      }
    } else {
      if (role === 'STUDENT') {
         username = await generateStudentUsername(hostel._id, hostel.domain, roomNo);
      } else if (role === 'ADMIN') {
         const existingAdmins = await User.countDocuments({ hostelId: hostel._id, role: 'ADMIN' });
         const nextId = existingAdmins + 1;
         username = nextId === 1 ? `admin@${hostel.domain}` : `secadmin${nextId}@${hostel.domain}`;
      } else {
         return res.status(400).json({ message: 'Username is required' });
      }
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Generated username already exists' });
    }

    const rawPassword = password || generatePassword();
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const newUser = new User({
      hostelId: admin.hostelId,
      name,
      username,
      role,
      roomNo,
      roleTitle: role === 'ADMIN' ? roleTitle : null,
      permissions: role === 'ADMIN' ? permissions : [],
      passwordHash,
      mustChangePassword: true,
    });

    await newUser.save();

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Created student - ${name || username} (${username})`,});

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        role: newUser.role,
        roomNo: newUser.roomNo,
      },
      rawPassword
    });
};

// Bulk Create Users (students-only, Name/RoomNo, 200-row cap)
export const bulkCreateUsers = async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { users } = req.body; // Array of { name, roomNo }

    if (!Array.isArray(users)) {
      return res.status(400).json({ message: 'users must be an array' });
    }
    if (users.length > 200) {
      return res.status(400).json({ message: 'Cannot import more than 200 students at once' });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can bulk create users' });
    }

    const hostel = await Hostel.findById(admin.hostelId);
    if (!hostel) {
      return res.status(500).json({ message: 'Hostel information not found' });
    }

    const bcrypt = require('bcrypt');
    const rawPassword = hostel.defaultPassword || generatePassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const createdUsers: { username: string; name: string; roomNo: string }[] = [];
    const skipped: string[] = [];
    const errors: { row: number; message: string }[] = [];
    const seenRooms = new Set<string>();

    for (let i = 0; i < users.length; i++) {
      const { name, roomNo } = users[i] ?? {};
      const rowNum = i + 1;

      if (!name?.trim()) {
        errors.push({ row: rowNum, message: 'Name is required' });
        continue;
      }
      if (!roomNo?.trim()) {
        errors.push({ row: rowNum, message: 'Room number is required' });
        continue;
      }

      const normalRoom = roomNo.trim();
      const normalName = name.trim();

      // Deduplicate within the batch
      if (seenRooms.has(normalRoom)) {
        skipped.push(`Row ${rowNum}: duplicate room ${normalRoom} in import`);
        continue;
      }
      seenRooms.add(normalRoom);

      const username = await generateStudentUsername(hostel._id, hostel.domain, normalRoom);

      const existing = await User.findOne({ username });
      if (existing) {
        skipped.push(`Row ${rowNum}: username ${username} already exists`);
        continue;
      }

      const newUser = new User({
        hostelId: admin.hostelId,
        name: normalName,
        username,
        role: 'STUDENT',
        roomNo: normalRoom,
        passwordHash,
        mustChangePassword: true,
      });
      await newUser.save();
      createdUsers.push({ username, name: normalName, roomNo: normalRoom });
    }

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Bulk imported ${createdUsers.length} students`,
    });

    return res.status(201).json({
      message: `${createdUsers.length} students created`,
      createdUsers,
      rawPassword,
      skipped,
      errors,
    });
};

// Get all users for hostel (with filters)
export const getUsers = async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { role, status } = req.query;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can view users' });
    }

    const query: any = { hostelId: admin.hostelId };
    if (status === 'pending' || status === 'PENDING') {
      query.status = 'PENDING';
    } else {
      query.status = { $ne: 'PENDING' };
      if (role) query.role = role;
      if (status === 'inactive') query.isActive = false;
      else if (status === 'active') query.isActive = true;
    }

    const hostel = await Hostel.findById(admin.hostelId);
    if (!hostel) return res.status(500).json({ message: 'Hostel not found' });

    const users = await User.find(query).select('-passwordHash -emailVerificationToken').lean();
    
    const usersWithPrimaryAdmin = users.map(u => ({
      ...u,
      isPrimaryAdmin: u.role === 'ADMIN' && u.username === `admin@${hostel.domain}`
    }));

    return res.status(200).json({ users: usersWithPrimaryAdmin });
};

// Get single user
export const getUser = async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { userId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can view users' });
    }

    const user = await User.findOne({
      _id: userId,
      hostelId: admin.hostelId,
    }).select('-passwordHash -emailVerificationToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hostel = await Hostel.findById(admin.hostelId);
    const userWithPrimaryAdmin = {
      ...(user as any).toObject(),
      isPrimaryAdmin: hostel && user.role === 'ADMIN' && user.username === `admin@${hostel.domain}`
    };

    return res.status(200).json({ user: userWithPrimaryAdmin });
};

// Deactivate user
export const deactivateUser = async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { userId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can deactivate users' });
    }

    const user = await User.findOne({ _id: userId, hostelId: admin.hostelId }).populate('hostelId');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const hostel = user.hostelId as any;
    if (user.role === 'ADMIN' && user.username === `admin@${hostel.domain}`) {
      return res.status(403).json({ message: 'The primary admin cannot be deactivated' });
    }

    user.isActive = false;
    await user.save();

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Deactivated user - ${user.name} (${user.username})`,});

    return res.status(200).json({ message: 'User deactivated successfully' });
};

// Reactivate user
export const reactivateUser = async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { userId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can reactivate users' });
    }

    const user = await User.findOne({ _id: userId, hostelId: admin.hostelId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = true;
    await user.save();

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Reactivated user - ${user.name} (${user.username})`,});

    return res.status(200).json({ message: 'User reactivated successfully' });
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { userId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }

    const user = await User.findOne({ _id: userId, hostelId: admin.hostelId }).populate('hostelId');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hostel = user.hostelId as any;
    if (user.role === 'ADMIN' && user.username === `admin@${hostel.domain}`) {
      return res.status(403).json({ message: 'The primary admin cannot be deleted' });
    }

    await Promise.all([
      StudentVote.deleteMany({ userId }),
      RefreshToken.deleteMany({ userId }),
    ]);

    await User.deleteOne({ _id: userId });

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Deleted user - ${user.name} (${user.username}) and all associated records`,});

    return res.status(200).json({ message: 'User and all associated records deleted successfully' });
};

// Reset a user's password (primary admin only)
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { userId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const target = await User.findOne({ _id: userId, hostelId: admin.hostelId });
    if (!target) return res.status(404).json({ message: 'User not found' });

    const tempPassword = generatePassword();
    const bcrypt = require('bcrypt');
    target.passwordHash = await bcrypt.hash(tempPassword, 10);
    target.mustChangePassword = true;
    await target.save();

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Reset password for ${target.name || target.username} (${target.username})`,
    });

    return res.json({ tempPassword });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, roomNo, permissions, roleTitle } = req.body;
    const userToUpdate = await User.findById(id);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) userToUpdate.name = name;
    if (permissions !== undefined) userToUpdate.permissions = permissions;
    if (roleTitle !== undefined) userToUpdate.roleTitle = roleTitle;
    
    if (roomNo !== undefined && userToUpdate.role === 'STUDENT') {
        userToUpdate.roomNo = roomNo;
    }

    await userToUpdate.save();
    return res.status(200).json({ user: userToUpdate });
});

// Approve pending student (primary admin only)
export const approveUser = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { userId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin || !admin.isPrimaryAdmin) return res.status(403).json({ message: 'Primary admin only' });

    const target = await User.findOne({ _id: userId, hostelId: admin.hostelId });
    if (!target) return res.status(404).json({ message: 'User not found' });

    target.status = 'ACTIVE';
    await target.save();

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Approved student - ${target.name || target.username} (${target.username})`,
    });

    return res.status(200).json({ message: 'Student approved successfully', user: target });
});

// Reject pending student (primary admin only)
export const rejectUser = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?._id;
    const { userId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin || !admin.isPrimaryAdmin) return res.status(403).json({ message: 'Primary admin only' });

    const target = await User.findOne({ _id: userId, hostelId: admin.hostelId });
    if (!target) return res.status(404).json({ message: 'User not found' });

    const name = target.name || target.username;
    const username = target.username;

    await User.deleteOne({ _id: userId });

    await ActivityLog.create({
      hostelId: admin.hostelId,
      userId: adminId,
      action: `Rejected student - ${name} (${username})`,
    });

    return res.status(200).json({ message: 'Student rejected successfully' });
});

