import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { Issue } from '../models/Issue';
import { User } from '../models/User';
import { buildComplaintQuery } from '../utils/buildComplaintQuery';

interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

// CREATE ISSUE
export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
    const { subject, description } = req.body;
    const userId = req.user?._id;

    if (!subject?.trim() || !description?.trim()) {
      res.status(400).json({ message: 'All fields (subject, description) are required' });
      return;
    }

    if (subject.trim().length > 80) {
      res.status(400).json({ message: 'Subject must be 80 characters or less' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const issue = new Issue({
      hostelId: user.hostelId,
      raisedBy: userId,
      raisedByName: user.name || user.username || 'Unknown User',
      roomNo: user.roomNo || 'Unknown Room',
      subject: subject.trim(),
      description: description.trim(),
      status: 'OPEN'
    });

    await issue.save();

    res.status(201).json({
      message: 'Issue created successfully',
      issue
    });
};

// GET ALL ISSUES (Admin)
export const getAllIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?._id;
    
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const { filter, sort, skip, limit } = buildComplaintQuery({
      ...req.query,
      hostelId: user.hostelId
    });

    const [issues, total] = await Promise.all([
      Issue.find(filter).populate('raisedBy', 'name roomNo').sort(sort).skip(skip).limit(limit),
      Issue.countDocuments(filter)
    ]);

    const page = Math.floor(skip / limit) + 1;
    const pages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      issues,
      total,
      page,
      pages
    });
};

// GET MY ISSUES (Student)
export const getMyIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?._id;

    const issues = await Issue.find({ raisedBy: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      issues
    });
};

// UPDATE ISSUE STATUS (Admin)
export const updateIssueStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const { issueId } = req.params;
    const { status, resolverNote } = req.body;
    const userId = req.user?._id;

    if (!['OPEN', 'CLOSED'].includes(status?.toUpperCase())) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      res.status(404).json({ message: 'Issue not found' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isAdmin = user.role === 'ADMIN';

    if (isAdmin && issue.hostelId.toString() !== user.hostelId.toString()) {
      res.status(403).json({ message: 'Unauthorized to update issues from other hostels' });
      return;
    }

    if (!isAdmin) {
      res.status(403).json({ message: 'Unauthorized to update this issue' });
      return;
    }

    issue.status = status.toUpperCase();
    if (resolverNote !== undefined) {
      issue.resolverNote = resolverNote;
    }
    await issue.save();

    res.status(200).json({
      message: 'Issue updated successfully',
      issue
    });
};

// DELETE ISSUE
export const deleteIssue = async (req: AuthRequest, res: Response): Promise<void> => {
    const { issueId } = req.params;
    const userId = req.user?._id;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      res.status(404).json({ message: 'Issue not found' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isAdmin = user.role === 'ADMIN';
    const isCreator = issue.raisedBy.toString() === userId?.toString();

    if (isAdmin && issue.hostelId.toString() !== user.hostelId.toString()) {
      res.status(403).json({ message: 'Unauthorized to delete issues from other hostels' });
      return;
    }

    if (!isAdmin && !isCreator) {
      res.status(403).json({ message: 'Unauthorized to delete this issue' });
      return;
    }

    await Issue.findByIdAndDelete(issueId);

    res.status(200).json({ message: 'Issue deleted successfully' });
};

export const exportIssuesPdf = async (req: Request, res: Response) => {
    const hostelId = req.user!.hostelId;
    const { filter, sort } = buildComplaintQuery({
      ...req.query,
      hostelId
    });

    const issues = await Issue.find(filter).populate('raisedBy', 'name roomNo').sort(sort);

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=issues-report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Complaints Report', { align: 'center' }).moveDown();

    issues.forEach(issue => {
        doc.fontSize(12).text(`Subject: ${issue.subject}`);
        doc.fontSize(10).text(`Status: ${issue.status}`);
        doc.fontSize(10).text(`Description: ${issue.description}`);
        if (issue.resolverNote) {
            doc.fontSize(10).text(`Admin Remark: ${issue.resolverNote}`);
        }
        doc.fontSize(10).text(`Reported By: ${(issue.raisedBy as any)?.name || issue.raisedByName} (Room: ${(issue.raisedBy as any)?.roomNo || issue.roomNo})`);
        doc.moveDown();
    });

    doc.end();
};
