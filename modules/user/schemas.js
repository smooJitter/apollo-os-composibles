// modules/user/schemas.js
import mongoose from 'mongoose';
import * as R from 'ramda';
const { Schema } = mongoose;

// Define schema configuration with pure functions
const createUserSchema = () => {
  // Field definitions
  const fields = {
    username: { 
      type: String, 
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30
    },
    email: { 
      type: String, 
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: { 
      type: String, 
      required: true 
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
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    }
  };
  
  // Schema options
  const options = { 
    timestamps: true 
  };
  
  return new Schema(fields, options);
};

// Apply schema middleware
const applyMiddleware = schema => {
  // Pre-save hook example (could add password hashing here)
  schema.pre('save', function(next) {
    console.log('[User Schema] Saving user:', this.username);
    next();
  });
  
  return schema;
};

// Create model using functional composition
const createUserModel = R.pipe(
  createUserSchema,
  applyMiddleware,
  schema => mongoose.model('User', schema)
);

// Export schemas using a more functional approach
export const userSchemas = {
  User: createUserModel()
}; 