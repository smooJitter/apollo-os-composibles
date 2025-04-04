import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Note: ctx is passed in but not strictly needed for this basic schema
// unless using shared plugins or enums directly injected.
// We get enums and plugins via the passed-in ctx.
export default function createUserModel(ctx) {
  const { ROLES, ROLE_VALUES } = ctx.enums.roles; // Get roles from context
  const { timestamps } = ctx.sharedMongoose.plugins; // Get shared timestamp plugin

  const UserSchema = new mongoose.Schema({
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      // Basic email format validation
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters long.'],
      select: false, // Exclude password field by default when querying users
    },
    role: {
      type: String,
      enum: {
        values: ROLE_VALUES,
        message: 'Invalid role: {VALUE}',
      },
      default: ROLES.USER,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Add other user fields as needed, e.g., avatarUrl, lastLogin
  },
  {
    // Schema options
    // Enable virtuals for JSON output (like toObject or toJSON)
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  // --- Plugins ---
  UserSchema.plugin(timestamps); // Apply the shared timestamps plugin

  // --- Hooks (Middleware) ---

  // Hash password before saving a new user or when password is modified
  UserSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    try {
      // Hash the password with cost of 12
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (err) {
      next(err);
    }
  });

  // --- Methods ---

  // Method to check if entered password is correct
  UserSchema.methods.comparePassword = async function (candidatePassword) {
    // 'this.password' refers to the hashed password in the document
    // Need to select it explicitly if it was excluded by default
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // --- Statics ---
  // (Add static methods if needed, e.g., User.findByEmail())

  // --- Virtuals ---
  // (Add virtual properties if needed)

  // Avoid recompiling the model if it already exists (useful for HMR)
  return mongoose.models.User || mongoose.model('User', UserSchema);
} 