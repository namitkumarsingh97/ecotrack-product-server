"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Company_1 = __importDefault(require("../models/Company"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Create company
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('name').trim().notEmpty(),
    (0, express_validator_1.body)('industry').notEmpty(),
    (0, express_validator_1.body)('employeeCount').isInt({ min: 10, max: 500 }),
    (0, express_validator_1.body)('annualRevenue').isNumeric(),
    (0, express_validator_1.body)('location').trim().notEmpty(),
    (0, express_validator_1.body)('reportingYear').isInt({ min: 2020, max: 2030 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const company = new Company_1.default({
            userId: req.userId,
            ...req.body
        });
        await company.save();
        res.status(201).json({
            message: 'Company created successfully',
            company
        });
    }
    catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Get company by ID
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const company = await Company_1.default.findOne({
            _id: req.params.id,
            userId: req.userId
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json({ company });
    }
    catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Get all companies for user
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const companies = await Company_1.default.find({ userId: req.userId });
        res.json({ companies });
    }
    catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Update company
router.put('/:id', auth_1.authenticate, [
    (0, express_validator_1.body)('name').optional().trim().notEmpty(),
    (0, express_validator_1.body)('industry').optional().notEmpty(),
    (0, express_validator_1.body)('employeeCount').optional().isInt({ min: 10, max: 500 }),
    (0, express_validator_1.body)('annualRevenue').optional().isNumeric(),
    (0, express_validator_1.body)('location').optional().trim().notEmpty(),
    (0, express_validator_1.body)('reportingYear').optional().isInt({ min: 2020, max: 2030 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const company = await Company_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json({
            message: 'Company updated successfully',
            company
        });
    }
    catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
