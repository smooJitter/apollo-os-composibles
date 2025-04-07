import { getHabitTC, getHabitInputTC } from './registry.js';
import mongoose from 'mongoose';
import { Habit } from './schemas.js';

/**
 * Initialize the resolvers for the Habit module
 * @returns {Object} Object containing GraphQL resolvers
 */
export const initResolvers = () => {
  // Get the type composers
  const HabitTC = getHabitTC();
  
  // Define queries
  const queries = {
    // Get a single habit by ID
    habitById: HabitTC.mongooseResolvers.findById(),
    
    // Find one habit based on criteria
    habitOne: HabitTC.mongooseResolvers.findOne(),
    
    // Get multiple habits with filtering and pagination
    habitMany: HabitTC.mongooseResolvers.findMany(),
    
    // Count habits
    habitCount: HabitTC.mongooseResolvers.count(),
    
    // Get all habits for a specific user
    userHabits: {
      type: [HabitTC],
      args: {
        userId: 'MongoID!',
        active: 'Boolean',
        category: 'String',
        frequency: 'String'
      },
      resolve: async (source, args, context) => {
        const { userId, active, category, frequency } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Build query
          const query = { userId: userObjectId };
          
          // Add optional filters
          if (typeof active === 'boolean') {
            query['status.active'] = active;
          }
          
          if (category) {
            query['metadata.category'] = category;
          }
          
          if (frequency) {
            query.frequency = frequency;
          }
          
          // Fetch habits
          const habits = await HabitModel.find(query).sort({ 'metadata.priority': -1, createdAt: -1 });
          logger?.debug(`[Habit] Found ${habits.length} habits for user ${userId}`);
          
          return habits;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error fetching user habits: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Get habits due today for a user
    habitsDueToday: {
      type: [HabitTC],
      args: {
        userId: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { userId } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Get current day of week (0 = Sunday, 6 = Saturday)
          const today = new Date();
          const dayOfWeek = today.getDay();
          
          // Build query for active habits that are scheduled for today
          const query = { 
            userId: userObjectId,
            'status.active': true,
            daysOfWeek: dayOfWeek,
            'status.completedToday': false
          };
          
          // Fetch habits
          const habits = await HabitModel.find(query).sort({ 'metadata.priority': -1 });
          logger?.debug(`[Habit] Found ${habits.length} habits due today for user ${userId}`);
          
          return habits;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error fetching habits due today: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Get habit statistics
    habitStats: {
      type: 'JSON',
      args: {
        userId: 'MongoID!',
        startDate: 'Date',
        endDate: 'Date'
      },
      resolve: async (source, args, context) => {
        const { userId, startDate, endDate } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Build date range
          const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
          const end = endDate ? new Date(endDate) : new Date();
          
          // Fetch habits
          const habits = await HabitModel.find({ userId: userObjectId });
          
          // Calculate statistics
          const stats = {
            totalHabits: habits.length,
            activeHabits: habits.filter(h => h.status.active).length,
            completedToday: habits.filter(h => h.status.completedToday).length,
            streaks: {
              highest: Math.max(...habits.map(h => h.status.streak), 0),
              average: habits.length > 0 ? habits.reduce((sum, h) => sum + h.status.streak, 0) / habits.length : 0
            },
            byCategory: {},
            completionRate: 0,
            historicalData: []
          };
          
          // Group by category
          habits.forEach(habit => {
            const category = habit.metadata.category || 'Other';
            if (!stats.byCategory[category]) {
              stats.byCategory[category] = 0;
            }
            stats.byCategory[category]++;
          });
          
          // Calculate completion rate and historical data
          if (habits.length > 0) {
            let totalPossibleCompletions = 0;
            let totalActualCompletions = 0;
            
            const dateMap = new Map();
            
            // Loop through each day in the date range
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              const dayOfWeek = d.getDay();
              
              let completedCount = 0;
              let scheduledCount = 0;
              
              habits.forEach(habit => {
                // Skip habits that started after this date
                if (new Date(habit.startDate) > d) return;
                
                // Check if this habit was scheduled for this day
                if (habit.daysOfWeek.includes(dayOfWeek)) {
                  scheduledCount++;
                  totalPossibleCompletions++;
                  
                  // Check if it was completed
                  const completed = habit.status.completionHistory.some(entry => {
                    const entryDate = new Date(entry.date).toISOString().split('T')[0];
                    return entryDate === dateStr && entry.completed;
                  });
                  
                  if (completed) {
                    completedCount++;
                    totalActualCompletions++;
                  }
                }
              });
              
              dateMap.set(dateStr, {
                date: dateStr,
                completed: completedCount,
                scheduled: scheduledCount,
                completionRate: scheduledCount > 0 ? completedCount / scheduledCount : 0
              });
            }
            
            // Convert map to array
            stats.historicalData = Array.from(dateMap.values());
            
            // Calculate overall completion rate
            stats.completionRate = totalPossibleCompletions > 0 ? 
              totalActualCompletions / totalPossibleCompletions : 0;
          }
          
          return stats;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error fetching habit stats: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Define mutations
  const mutations = {
    // Create a new habit
    habitCreate: {
      type: HabitTC,
      args: {
        userId: 'MongoID!',
        input: getHabitInputTC()
      },
      resolve: async (source, args, context) => {
        const { userId, input } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Create habit
          const habit = new HabitModel({
            ...input,
            userId: userObjectId
          });
          
          await habit.save();
          logger?.debug(`[Habit] Created habit for user ${userId}: "${input.title}"`);
          
          return habit;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error creating habit: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Update an existing habit
    habitUpdate: {
      type: HabitTC,
      args: {
        id: 'MongoID!',
        input: getHabitInputTC()
      },
      resolve: async (source, args, context) => {
        const { id, input } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Find habit
          const habit = await HabitModel.findById(id);
          
          if (!habit) {
            throw new Error(`Habit not found: ${id}`);
          }
          
          // Security check - only allow users to update their own habits
          if (currentUser && habit.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to update this habit');
          }
          
          // Update fields
          Object.keys(input).forEach(key => {
            // Special handling for nested fields like status and metadata
            if ((key === 'status' || key === 'metadata') && input[key]) {
              if (!habit[key]) habit[key] = {};
              Object.keys(input[key]).forEach(subKey => {
                habit[key][subKey] = input[key][subKey];
              });
            } else {
              habit[key] = input[key];
            }
          });
          
          // Save changes
          await habit.save();
          logger?.debug(`[Habit] Updated habit ${id}`);
          
          return habit;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error updating habit: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Mark a habit as completed for today
    habitMarkCompleted: {
      type: HabitTC,
      args: {
        id: 'MongoID!',
        notes: 'String',
        value: 'Float'
      },
      resolve: async (source, args, context) => {
        const { id, notes, value } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Find habit
          const habit = await HabitModel.findById(id);
          
          if (!habit) {
            throw new Error(`Habit not found: ${id}`);
          }
          
          // Security check
          if (currentUser && habit.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to modify this habit');
          }
          
          // Get today's date
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Normalize to start of day
          
          // Create completion entry
          const completionEntry = {
            date: new Date(),
            completed: true,
            notes: notes || ''
          };
          
          // Check if habit is already completed today
          const todayEntry = habit.status.completionHistory.find(entry => {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === today.getTime();
          });
          
          // If there's already an entry for today, update it
          if (todayEntry) {
            todayEntry.completed = true;
            todayEntry.notes = notes || todayEntry.notes;
          } else {
            // Otherwise add a new entry
            habit.status.completionHistory.push(completionEntry);
            
            // Increment streak if not already completed today
            if (!habit.status.completedToday) {
              habit.status.streak += 1;
            }
          }
          
          // Update completion status
          habit.status.completedToday = true;
          
          // Update current value if provided
          if (typeof value === 'number') {
            habit.currentValue = value;
          } else {
            habit.currentValue += 1; // Increment by default
          }
          
          // Save changes
          await habit.save();
          logger?.debug(`[Habit] Marked habit ${id} as completed`);
          
          return habit;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error marking habit as completed: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Reset completion status for habits (typically run at midnight)
    habitResetDailyStatus: {
      type: 'Boolean',
      args: {
        userId: 'MongoID'
      },
      resolve: async (source, args, context) => {
        const { userId } = args;
        const { models, logger } = context;
        
        try {
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Build query
          const query = {};
          if (userId) {
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
              ? new mongoose.Types.ObjectId(userId)
              : null;
              
            if (!userObjectId) {
              throw new Error(`Invalid user ID: ${userId}`);
            }
            query.userId = userObjectId;
          }
          
          // Get yesterday's date
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          
          // Find habits that need reset
          const habitsToReset = await HabitModel.find({
            ...query,
            'status.completedToday': true
          });
          
          // Get yesterday's day of week
          const yesterdayDayOfWeek = yesterday.getDay();
          
          // Reset each habit
          for (const habit of habitsToReset) {
            // Reset completedToday flag
            habit.status.completedToday = false;
            
            // Check if yesterday was a scheduled day for this habit
            if (!habit.daysOfWeek.includes(yesterdayDayOfWeek)) {
              // If yesterday wasn't scheduled, don't break the streak
              await habit.save();
              continue;
            }
            
            // Check if there's a completion entry for yesterday
            const yesterdayCompleted = habit.status.completionHistory.some(entry => {
              const entryDate = new Date(entry.date);
              entryDate.setHours(0, 0, 0, 0);
              return entryDate.getTime() === yesterday.getTime() && entry.completed;
            });
            
            // If there's no completion for yesterday and it was scheduled, reset streak
            if (!yesterdayCompleted) {
              habit.status.streak = 0;
              
              // Add missed entry
              habit.status.completionHistory.push({
                date: yesterday,
                completed: false,
                notes: 'Missed'
              });
            }
            
            await habit.save();
          }
          
          logger?.debug(`[Habit] Reset daily status for ${habitsToReset.length} habits`);
          return true;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error resetting daily status: ${error.message}`);
          return false;
        }
      }
    },
    
    // Toggle active status of a habit
    habitToggleActive: {
      type: HabitTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Find habit
          const habit = await HabitModel.findById(id);
          
          if (!habit) {
            throw new Error(`Habit not found: ${id}`);
          }
          
          // Security check
          if (currentUser && habit.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to modify this habit');
          }
          
          // Toggle active status
          habit.status.active = !habit.status.active;
          
          // Save changes
          await habit.save();
          logger?.debug(`[Habit] Toggled active status for habit ${id} to ${habit.status.active}`);
          
          return habit;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error toggling active status: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Delete a habit
    habitDelete: {
      type: HabitTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the Habit model from context or import directly
          const HabitModel = models?.Habit || mongoose.model('Habit');
          
          // Find habit
          const habit = await HabitModel.findById(id);
          
          if (!habit) {
            throw new Error(`Habit not found: ${id}`);
          }
          
          // Security check
          if (currentUser && habit.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to delete this habit');
          }
          
          // Delete habit
          await HabitModel.deleteOne({ _id: id });
          logger?.debug(`[Habit] Deleted habit ${id}`);
          
          return habit;
        } catch (error) {
          logger?.error(`[Habit Resolver] Error deleting habit: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Return resolvers in standard format
  return {
    Query: queries,
    Mutation: mutations
  };
};

export default {
  initResolvers
}; 