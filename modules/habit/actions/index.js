import mongoose from 'mongoose';

/**
 * Create a new habit
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.userId - The user ID
 * @param {string} params.title - The habit title
 * @param {string} [params.description] - Optional description
 * @param {string} [params.frequency] - Frequency (Daily, Weekly, Monthly)
 * @param {Array<number>} [params.daysOfWeek] - Days of week to perform the habit
 * @param {Object} [params.metadata] - Optional metadata
 * @param {Array} [params.tags] - Optional weighted tags [{name, type, weight}]
 * @returns {Promise<Object>} The created habit
 */
export async function createHabit(ctx, params) {
  const { 
    userId, 
    title, 
    description = '', 
    frequency = 'Daily', 
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6], 
    metadata = {},
    tags = []
  } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!userId) throw new Error('User ID is required');
    if (!title) throw new Error('Title is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Create new habit
    const habit = new Habit({
      userId,
      title,
      description,
      frequency,
      daysOfWeek,
      metadata: {
        ...metadata,
        color: metadata.color || '#4285F4',
        icon: metadata.icon || 'star',
        priority: metadata.priority || 'Medium',
        category: metadata.category || 'Personal'
      }
    });
    
    // Add timeline event
    habit.logEvent('created', userId);
    
    // Add weighted tags if provided
    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => {
        if (tag.name && tag.type) {
          habit.addTag(tag.name, tag.type, tag.weight || 5.0); // Default mid-range weight
        }
      });
    }
    
    // Save to database
    await habit.save();
    logger?.debug(`Created habit "${title}" for user ${userId}`);
    
    return habit;
  } catch (error) {
    logger?.error(`Error creating habit: ${error.message}`);
    throw error;
  }
}

/**
 * Mark a habit as completed for today
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.habitId - The habit ID
 * @param {string} [params.notes] - Optional notes about completion
 * @param {number} [params.value] - Value to record (for habits tracking values)
 * @param {string} [params.userId] - User ID completing the habit
 * @returns {Promise<Object>} The updated habit
 */
export async function markHabitCompleted(ctx, params) {
  const { habitId, notes = '', value, userId } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!habitId) throw new Error('Habit ID is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Find habit
    const habit = await Habit.findById(habitId);
    if (!habit) throw new Error(`Habit not found: ${habitId}`);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Create completion entry
    const completionEntry = {
      date: new Date(),
      completed: true,
      notes: notes
    };
    
    // Check if habit is already completed today
    const todayEntry = habit.status.completionHistory.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
    
    const wasCompletedBefore = habit.status.completedToday;
    const newStreak = habit.status.streak + (wasCompletedBefore ? 0 : 1);
    
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
    
    // Log completion event
    habit.logEvent('completed', userId, notes);
    
    // Check for streak milestones (5, 10, 25, 50, 100, etc.)
    const streakMilestones = [5, 10, 25, 50, 100, 150, 200, 365];
    if (!wasCompletedBefore && streakMilestones.includes(newStreak)) {
      habit.logEvent('streak_milestone', userId, `Reached ${newStreak} day streak!`);
    }
    
    // Save changes
    await habit.save();
    logger?.debug(`Marked habit ${habitId} as completed`);
    
    return habit;
  } catch (error) {
    logger?.error(`Error marking habit as completed: ${error.message}`);
    throw error;
  }
}

/**
 * Get habit statistics for a user
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.userId - The user ID
 * @param {Date} [params.startDate] - Start date for statistics
 * @param {Date} [params.endDate] - End date for statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getHabitStats(ctx, params) {
  const { userId, startDate, endDate } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!userId) throw new Error('User ID is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Build date range
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Fetch habits
    const habits = await Habit.find({ userId });
    
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
      historicalData: [],
      weightedTags: {},
      recentActivity: []
    };
    
    // Process timeline events for recent activity
    habits.forEach(habit => {
      if (habit.timeline && habit.timeline.length > 0) {
        habit.timeline.slice(-10).forEach(event => {
          stats.recentActivity.push({
            habitId: habit._id,
            habitTitle: habit.title,
            event: event.event,
            timestamp: event.timestamp,
            note: event.note
          });
        });
      }
    });
    
    // Sort recent activity by timestamp (most recent first)
    stats.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to 20 most recent events
    stats.recentActivity = stats.recentActivity.slice(0, 20);
    
    // Group by category
    habits.forEach(habit => {
      const category = habit.metadata.category || 'Other';
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = 0;
      }
      stats.byCategory[category]++;
      
      // Process weighted tags
      if (habit.weightedTags && habit.weightedTags.length > 0) {
        habit.weightedTags.forEach(tag => {
          if (!stats.weightedTags[tag.type]) {
            stats.weightedTags[tag.type] = {};
          }
          
          if (!stats.weightedTags[tag.type][tag.name]) {
            stats.weightedTags[tag.type][tag.name] = {
              count: 0,
              avgWeight: 0,
              totalWeight: 0
            };
          }
          
          stats.weightedTags[tag.type][tag.name].count++;
          stats.weightedTags[tag.type][tag.name].totalWeight += tag.weight;
          stats.weightedTags[tag.type][tag.name].avgWeight = 
            stats.weightedTags[tag.type][tag.name].totalWeight / 
            stats.weightedTags[tag.type][tag.name].count;
        });
      }
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
    logger?.error(`Error getting habit stats: ${error.message}`);
    throw error;
  }
}

/**
 * Get habits due today for a user
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.userId - The user ID
 * @returns {Promise<Array>} List of habits due today
 */
export async function getHabitsDueToday(ctx, params) {
  const { userId } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!userId) throw new Error('User ID is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Get current day of week (0 = Sunday, 6 = Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Find habits scheduled for today that are not completed
    const habits = await Habit.find({
      userId,
      'status.active': true,
      daysOfWeek: dayOfWeek,
      'status.completedToday': false
    }).sort({ 'metadata.priority': -1 });
    
    logger?.debug(`Found ${habits.length} habits due today for user ${userId}`);
    return habits;
  } catch (error) {
    logger?.error(`Error getting habits due today: ${error.message}`);
    throw error;
  }
}

/**
 * Add a tag to a habit
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.habitId - The habit ID
 * @param {string} params.name - Tag name
 * @param {string} params.type - Tag type
 * @param {number} [params.weight] - Tag weight
 * @param {string} [params.userId] - User ID making the change
 * @returns {Promise<Object>} The updated habit
 */
export async function addHabitTag(ctx, params) {
  const { habitId, name, type, weight = 5, userId } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!habitId) throw new Error('Habit ID is required');
    if (!name) throw new Error('Tag name is required');
    if (!type) throw new Error('Tag type is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Find habit
    const habit = await Habit.findById(habitId);
    if (!habit) throw new Error(`Habit not found: ${habitId}`);
    
    // Add tag
    habit.addTag(name, type, weight);
    
    // Log event
    habit.logEvent('updated', userId, `Added tag: ${type}:${name}`);
    
    // Save changes
    await habit.save();
    logger?.debug(`Added tag ${type}:${name} to habit ${habitId}`);
    
    return habit;
  } catch (error) {
    logger?.error(`Error adding habit tag: ${error.message}`);
    throw error;
  }
}

/**
 * Remove a tag from a habit
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.habitId - The habit ID
 * @param {string} params.name - Tag name
 * @param {string} [params.type] - Tag type (optional)
 * @param {string} [params.userId] - User ID making the change
 * @returns {Promise<Object>} The updated habit
 */
export async function removeHabitTag(ctx, params) {
  const { habitId, name, type, userId } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!habitId) throw new Error('Habit ID is required');
    if (!name) throw new Error('Tag name is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Find habit
    const habit = await Habit.findById(habitId);
    if (!habit) throw new Error(`Habit not found: ${habitId}`);
    
    // Remove tag
    habit.removeTag(name, type);
    
    // Log event
    habit.logEvent('updated', userId, `Removed tag: ${type ? type + ':' : ''}${name}`);
    
    // Save changes
    await habit.save();
    logger?.debug(`Removed tag ${name} from habit ${habitId}`);
    
    return habit;
  } catch (error) {
    logger?.error(`Error removing habit tag: ${error.message}`);
    throw error;
  }
}

/**
 * Get habits by tag
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.userId - The user ID
 * @param {string} params.tagName - Tag name to search for
 * @param {string} [params.tagType] - Optional tag type
 * @returns {Promise<Array>} List of matching habits
 */
export async function getHabitsByTag(ctx, params) {
  const { userId, tagName, tagType } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!userId) throw new Error('User ID is required');
    if (!tagName) throw new Error('Tag name is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Build query
    const query = { userId };
    
    if (tagType) {
      query.weightedTags = {
        $elemMatch: {
          name: tagName,
          type: tagType
        }
      };
    } else {
      query['weightedTags.name'] = tagName;
    }
    
    // Find habits with the tag
    const habits = await Habit.find(query).sort({ 'metadata.priority': -1 });
    
    logger?.debug(`Found ${habits.length} habits with tag ${tagName} for user ${userId}`);
    return habits;
  } catch (error) {
    logger?.error(`Error getting habits by tag: ${error.message}`);
    throw error;
  }
}

/**
 * Get activity timeline for a habit
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.habitId - The habit ID
 * @param {number} [params.limit] - Maximum number of events to return
 * @returns {Promise<Array>} Timeline events
 */
export async function getHabitTimeline(ctx, params) {
  const { habitId, limit = 20 } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!habitId) throw new Error('Habit ID is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Find habit
    const habit = await Habit.findById(habitId);
    if (!habit) throw new Error(`Habit not found: ${habitId}`);
    
    // Get timeline
    const timeline = habit.getTimeline ? habit.getTimeline() : (habit.timeline || []);
    
    // Sort by timestamp (newest first) and limit
    const sortedTimeline = [...timeline].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, limit);
    
    return sortedTimeline;
  } catch (error) {
    logger?.error(`Error getting habit timeline: ${error.message}`);
    throw error;
  }
}

/**
 * Toggle active status of a habit
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.habitId - The habit ID
 * @param {string} [params.userId] - User ID making the change
 * @returns {Promise<Object>} The updated habit
 */
export async function toggleHabitActiveStatus(ctx, params) {
  const { habitId, userId } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!habitId) throw new Error('Habit ID is required');
    
    // Use model from context or directly
    const Habit = models?.Habit || mongoose.model('Habit');
    
    // Find habit
    const habit = await Habit.findById(habitId);
    if (!habit) throw new Error(`Habit not found: ${habitId}`);
    
    // Toggle active status
    habit.status.active = !habit.status.active;
    
    // Log the appropriate event
    if (habit.status.active) {
      habit.logEvent('resumed', userId);
    } else {
      habit.logEvent('paused', userId);
    }
    
    // Save changes
    await habit.save();
    logger?.debug(`Toggled active status for habit ${habitId} to ${habit.status.active}`);
    
    return habit;
  } catch (error) {
    logger?.error(`Error toggling habit active status: ${error.message}`);
    throw error;
  }
}

export default {
  createHabit,
  markHabitCompleted,
  getHabitStats,
  getHabitsDueToday,
  addHabitTag,
  removeHabitTag,
  getHabitsByTag,
  getHabitTimeline,
  toggleHabitActiveStatus
}; 