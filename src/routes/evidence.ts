import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Evidence from '../models/Evidence';
import Company from '../models/Company';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'evidence');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Office documents are allowed'));
    }
  }
});

// Get Evidence Dashboard Summary
router.get('/dashboard/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;

    // Verify company ownership
    const company = await Company.findOne({
      _id: companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    // Get all evidence for the company
    const allEvidence = await Evidence.find({ companyId });

    // Calculate statistics
    const totalDocuments = allEvidence.length;
    const linkedDocuments = allEvidence.filter(e => e.status === 'Linked').length;
    const pendingEvidence = allEvidence.filter(e => e.status === 'Pending').length;
    
    // Expiring soon (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = allEvidence.filter(e => 
      e.expiryDate && 
      e.expiryDate > now && 
      e.expiryDate <= thirtyDaysFromNow
    ).length;

    // Get evidence status table data
    const evidenceTable = allEvidence.map(evidence => ({
      _id: evidence._id,
      evidenceType: evidence.evidenceType,
      esgArea: evidence.esgArea,
      linkedTo: evidence.linkedTo || '-',
      status: evidence.status,
      expiryDate: evidence.expiryDate,
      uploadedAt: evidence.uploadedAt
    }));

    res.json({
      statistics: {
        totalDocuments,
        linkedDocuments,
        pendingEvidence,
        expiringSoon
      },
      evidenceTable
    });
  } catch (error: any) {
    console.error('Get evidence dashboard error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Upload Evidence
router.post(
  '/upload/:companyId',
  authenticate,
  upload.single('file'),
  [
    body('evidenceType').notEmpty().withMessage('Evidence type is required'),
    body('esgArea').isIn(['Environmental', 'Social', 'Governance']).withMessage('Invalid ESG area'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { companyId } = req.params;
      const { evidenceType, esgArea, linkedTo, expiryDate, tags } = req.body;

      // Verify company ownership
      const company = await Company.findOne({
        _id: companyId,
        userId: req.userId
      });

      if (!company) {
        // Delete uploaded file if company not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Company not found or unauthorized' });
      }

      // Determine status
      let status: 'Linked' | 'Missing' | 'Pending' = 'Pending';
      if (linkedTo && linkedTo.trim() !== '') {
        status = 'Linked';
      }

      // Parse tags if provided
      let parsedTags = undefined;
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          parsedTags = undefined;
        }
      }

      const evidence = new Evidence({
        companyId,
        userId: req.userId,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        evidenceType,
        esgArea,
        linkedTo: linkedTo || undefined,
        status,
        tags: parsedTags,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined
      });

      await evidence.save();

      res.json({
        message: 'Evidence uploaded successfully',
        evidence: {
          _id: evidence._id,
          evidenceType: evidence.evidenceType,
          esgArea: evidence.esgArea,
          status: evidence.status
        }
      });
    } catch (error: any) {
      console.error('Upload evidence error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

// Link Evidence to Metric
router.put(
  '/link/:id',
  authenticate,
  [
    body('linkedTo').notEmpty().withMessage('Linked to field is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { linkedTo } = req.body;

      const evidence = await Evidence.findOne({
        _id: id,
        userId: req.userId
      });

      if (!evidence) {
        return res.status(404).json({ error: 'Evidence not found or unauthorized' });
      }

      evidence.linkedTo = linkedTo;
      evidence.status = 'Linked';
      await evidence.save();

      res.json({
        message: 'Evidence linked successfully',
        evidence
      });
    } catch (error: any) {
      console.error('Link evidence error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

// Get All Evidence for Company
router.get('/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const { esgArea, status } = req.query;

    // Verify company ownership
    const company = await Company.findOne({
      _id: companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    const query: any = { companyId };
    if (esgArea) query.esgArea = esgArea;
    if (status) query.status = status;

    const evidence = await Evidence.find(query).sort({ uploadedAt: -1 });

    res.json({ evidence });
  } catch (error: any) {
    console.error('Get evidence error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete Evidence
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const evidence = await Evidence.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found or unauthorized' });
    }

    // Delete file from filesystem
    if (fs.existsSync(evidence.filePath)) {
      fs.unlinkSync(evidence.filePath);
    }

    await Evidence.deleteOne({ _id: evidence._id });

    res.json({ message: 'Evidence deleted successfully' });
  } catch (error: any) {
    console.error('Delete evidence error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;

