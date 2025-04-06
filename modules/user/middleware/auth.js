import jwt from 'jsonwebtoken';
import createUserModel from '../models/userModel.js';
import { ROLES, ROLE_VALUES } from '../../../config/enums/roles.js';
import { plugins as sharedMongoosePlugins } from '../../../config/shared-mongoose/index.js';

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const UserModel = createUserModel({ 
      enums: { roles: { ROLES, ROLE_VALUES } },
      sharedMongoose: { plugins: sharedMongoosePlugins }
    }); // Pass required context
    const user = await UserModel.findById(decoded.id).select('-password');

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}; 