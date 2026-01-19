"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const ESGScore_1 = __importDefault(require("../models/ESGScore"));
const Company_1 = __importDefault(require("../models/Company"));
const auth_1 = require("../middleware/auth");
const esgScoring_1 = require("../services/esgScoring");
const reportGenerator_1 = require("../services/reportGenerator");
const router = express_1.default.Router();
// Calculate ESG Score
router.post('/calculate/:companyId', auth_1.authenticate, [(0, express_validator_1.body)('period').notEmpty()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { companyId } = req.params;
        const { period } = req.body;
        // Verify company ownership
        const company = await Company_1.default.findOne({
            _id: companyId,
            userId: req.userId
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found or unauthorized' });
        }
        // Calculate scores
        const scores = await (0, esgScoring_1.calculateESGScore)(companyId, period);
        // Save or update ESG score
        let esgScore = await ESGScore_1.default.findOne({ companyId, period });
        if (esgScore) {
            esgScore.environmentalScore = scores.environmentalScore;
            esgScore.socialScore = scores.socialScore;
            esgScore.governanceScore = scores.governanceScore;
            esgScore.overallScore = scores.overallScore;
            esgScore.calculatedAt = new Date();
            await esgScore.save();
        }
        else {
            esgScore = new ESGScore_1.default({
                companyId,
                period,
                ...scores
            });
            await esgScore.save();
        }
        res.json({
            message: 'ESG score calculated successfully',
            score: esgScore
        });
    }
    catch (error) {
        console.error('Calculate ESG score error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
// Get ESG Score
router.get('/score/:companyId', auth_1.authenticate, async (req, res) => {
    try {
        const { companyId } = req.params;
        // Verify company ownership
        const company = await Company_1.default.findOne({
            _id: companyId,
            userId: req.userId
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found or unauthorized' });
        }
        const scores = await ESGScore_1.default.find({ companyId }).sort({ period: -1 });
        res.json({ scores });
    }
    catch (error) {
        console.error('Get ESG score error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Generate Report
router.get('/report/:companyId', auth_1.authenticate, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { format = 'json', period } = req.query;
        // Verify company ownership
        const company = await Company_1.default.findOne({
            _id: companyId,
            userId: req.userId
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found or unauthorized' });
        }
        if (format === 'pdf') {
            const buffer = await (0, reportGenerator_1.generatePDFReport)(companyId, period);
            res.contentType('application/pdf');
            res.send(buffer);
        }
        else if (format === 'excel') {
            const buffer = await (0, reportGenerator_1.generateExcelReport)(companyId, period);
            res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        }
        else {
            // Return JSON report
            const esgScore = await ESGScore_1.default.findOne({
                companyId,
                period: period || { $exists: true }
            }).sort({ period: -1 });
            res.json({
                company,
                esgScore
            });
        }
    }
    catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
exports.default = router;
