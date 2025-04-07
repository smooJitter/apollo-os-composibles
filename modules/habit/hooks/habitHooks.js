/**
 * Habit module hooks
 * Contains hooks for the habit module
 */

/**
 * Add hooks for the habit module
 * @param {Object} ctx - The application context
 * @returns {Object} The application context
 */
export function habitHooks(ctx) {
  const { hooks, logger, models } = ctx;
  
  // Define hook constants if not already defined
  const HOOK_EVENTS = ctx.HOOK_EVENTS || {
    USER_CREATED: 'user:created',
    DAY_CHANGE: 'system:day_change'
  };
  
  // Register hooks
  if (hooks) {
    // Create default habits for new users
    hooks.on(HOOK_EVENTS.USER_CREATED, async (user) => {
      try {
        logger?.debug(`[Habit Hooks] Creating default habits for new user: ${user._id}`);
        
        const Habit = models.Habit;
        if (!Habit) {
          logger?.warn('[Habit Hooks] Habit model not found in context');
          return;
        }
        
        // Create a sample habit for the new user
        const defaultHabit = new Habit({
          userId: user._id,
          title: 'Drink water',
          description: 'Stay hydrated by drinking at least 8 glasses of water daily',
          frequency: 'Daily',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day
          metadata: {
            category: 'Health',
            priority: 'High',
            icon: 'water_drop'
          }
        });
        
        await defaultHabit.save();
        logger?.debug(`[Habit Hooks] Created default habit for user ${user._id}`);
      } catch (error) {
        logger?.error(`[Habit Hooks] Error creating default habits: ${error.message}`);
      }
    });
    
    // Reset daily habit status at midnight
    hooks.on(HOOK_EVENTS.DAY_CHANGE, async () => {
      try {
        logger?.debug('[Habit Hooks] Resetting daily habit status');
        
        const Habit = models.Habit;
        if (!Habit) {
          logger?.warn('[Habit Hooks] Habit model not found in context');
          return;
        }
        
        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        // Get yesterday's day of week
        const yesterdayDayOfWeek = yesterday.getDay();
        
        // Find habits that need reset
        const habitsToReset = await Habit.find({
          'status.completedToday': true
        });
        
        logger?.debug(`[Habit Hooks] Found ${habitsToReset.length} habits to reset`);
        
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
        
        logger?.debug('[Habit Hooks] Completed daily habit status reset');
      } catch (error) {
        logger?.error(`[Habit Hooks] Error resetting habit status: ${error.message}`);
      }
    });
  }

  return ctx;
}

export default habitHooks; 