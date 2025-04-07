// modules/user/schemas.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

/**
 * User schema definition
 */
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    }
  }
});

/**
 * Password hashing middleware
 */
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Password comparison method
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * JWT token generation
 */
UserSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    username: this.username,
    role: this.role
  };
  
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' }
  );
  
  return {
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
  };
};

// Import model creators
import createUserModel from './models/userModel.js';
import createRoleModel from './models/roleModel.js';

/**
 * Export all schemas/models for the user module
 * @param {Object} ctx - Application context with shared plugins and enums
 * @returns {Object} - Map of model names to model constructors
 */
export const userSchemas = (ctx) => {
  const models = {
    User: createUserModel(ctx),
    Role: createRoleModel(ctx),
  };

  return models;
}; 