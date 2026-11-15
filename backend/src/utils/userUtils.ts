import crypto from 'crypto';
import { User } from '../models/User';

export const generateJoinCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateStudentUsername = async (
  hostelId: any,
  domain: string,
  roomNo: string
): Promise<string> => {
  const existingInRoom = await User.countDocuments({ hostelId, roomNo: roomNo.trim() });
  const nextId = existingInRoom + 1;
  return `${roomNo.trim()}.${nextId}@${domain}`;
};
