"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const EnvironmentalMetrics_1 = __importDefault(require("../models/EnvironmentalMetrics"));
const SocialMetrics_1 = __importDefault(require("../models/SocialMetrics"));
const GovernanceMetrics_1 = __importDefault(require("../models/GovernanceMetrics"));
const Company_1 = __importDefault(require("../models/Company"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Middleware to verify company ownership
const verifyCompanyOwnership = async (req, res, next) => {
    try {
        const company = await Company_1.default.findOne({
            _id: req.body.companyId,
            userId: req.userId
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found or unauthorized' });
        }
        next();
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
// POST Environmental Metrics
router.post('/environment', auth_1.authenticate, verifyCompanyOwnership, [
    (0, express_validator_1.body)('companyId').notEmpty(),
    (0, express_validator_1.body)('electricityUsageKwh').isNumeric(),
    (0, express_validator_1.body)('fuelConsumptionLitres').isNumeric(),
    (0, express_validator_1.body)('waterUsageKL').isNumeric(),
    (0, express_validator_1.body)('wasteGeneratedKg').isNumeric(),
    (0, express_validator_1.body)('renewableEnergyPercent').isFloat({ min: 0, max: 100 }),
    (0, express_validator_1.body)('carbonEmissionsTons').isNumeric(),
    (0, express_validator_1.body)('period').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const metrics = new EnvironmentalMetrics_1.default(req.body);
        await metrics.save();
        res.status(201).json({
            message: 'Environmental metrics saved successfully',
            metrics
        });
    }
    catch (error) {
        console.error('Save environmental metrics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// POST Social Metrics
router.post('/social', auth_1.authenticate, verifyCompanyOwnership, [
    (0, express_validator_1.body)('companyId').notEmpty(),
    (0, express_validator_1.body)('totalEmployees').isInt({ min: 0 }),
    (0, express_validator_1.body)('femaleEmployees').isInt({ min: 0 }),
    (0, express_validator_1.body)('avgTrainingHours').isNumeric(),
    (0, express_validator_1.body)('workplaceIncidents').isInt({ min: 0 }),
    (0, express_validator_1.body)('employeeTurnoverPercent').isFloat({ min: 0, max: 100 }),
    (0, express_validator_1.body)('period').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const metrics = new SocialMetrics_1.default(req.body);
        await metrics.save();
        res.status(201).json({
            message: 'Social metrics saved successfully',
            metrics
        });
    }
    catch (error) {
        console.error('Save social metrics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// POST Governance Metrics
router.post('/governance', auth_1.authenticate, verifyCompanyOwnership, [
    (0, express_validator_1.body)('companyId').notEmpty(),
    (0, express_validator_1.body)('boardMembers').isInt({ min: 1 }),
    (0, express_validator_1.body)('independentDirectors').isInt({ min: 0 }),
    (0, express_validator_1.body)('antiCorruptionPolicy').isBoolean(),
    (0, express_validator_1.body)('dataPrivacyPolicy').isBoolean(),
    (0, express_validator_1.body)('complianceViolations').isInt({ min: 0 }),
    (0, express_validator_1.body)('period').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const metrics = new GovernanceMetrics_1.default(req.body);
        await metrics.save();
        res.status(201).json({
            message: 'Governance metrics saved successfully',
            metrics
        });
    }
    catch (error) {
        console.error('Save governance metrics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET all metrics for a company
router.get('/:companyId', auth_1.authenticate, async (req, res) => {
    try {
        // Verify company ownership
        const company = await Company_1.default.findOne({
            _id: req.params.companyId,
            userId: req.userId
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found or unauthorized' });
        }
        const [environmental, social, governance] = await Promise.all([
            EnvironmentalMetrics_1.default.find({ companyId: req.params.companyId }).sort({ period: -1 }),
            SocialMetrics_1.default.find({ companyId: req.params.companyId }).sort({ period: -1 }),
            GovernanceMetrics_1.default.find({ companyId: req.params.companyId }).sort({ period: -1 })
        ]);
        res.json({
            environmental,
            social,
            governance
        });
    }
    catch (error) {
        console.error('Get metrics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
