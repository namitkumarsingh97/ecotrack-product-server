"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// Register
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('name').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, name } = req.body;
        // Check if user exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = new User_1.default({
            email,
            password: hashedPassword,
            name,
            plan: 'starter'
        });
        await user.save();
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                plan: user.plan
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Login
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        // Find user
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                plan: user.plan
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
