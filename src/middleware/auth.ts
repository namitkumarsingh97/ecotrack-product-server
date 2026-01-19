import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      req.userId = decoded.userId;
      next();
    } catch (jwtError) {
      // Token is invalid or expired
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

