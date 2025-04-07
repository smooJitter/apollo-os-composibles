// scripts/seed-data.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define test users data
const testUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    active: true,
  },
  {
    name: 'Test User',
    email: 'user@example.com',
    password: 'password123',
    role: 'user',
    active: true,
  },
  {
    name: 'Inactive User',
    email: 'inactive@example.com',
    password: 'password123',
    role: 'user',
    active: false,
  },
];

// Connect to MongoDB
async function connectToMongoDB() {
  // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
  const uri = (process.env.MONGODB_URI || 'mongodb://localhost:27017/apolloos_dev').replace(
    'localhost',
    '127.0.0.1'
  );

  try {
    console.log(`Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      family: 4, // Use IPv4, skip trying IPv6
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Define a basic user schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  active: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Create the model
const User = mongoose.model('User', userSchema);

// Main function to seed data
async function seedData() {
  try {
    await connectToMongoDB();

    // Clear existing users
    console.log('Clearing existing users...');
    await User.deleteMany({});

    // Insert new users
    console.log('Creating new test users...');
    const createdUsers = await Promise.all(
      testUsers.map(async (userData) => {
        const user = new User(userData);
        await user.save();
        return user;
      })
    );

    console.log(`Successfully created ${createdUsers.length} test users:`);
    createdUsers.forEach((user) => {
      console.log(`- ${user.name} (${user.email}): role=${user.role}, active=${user.active}`);
    });

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Run the seed function
seedData();
