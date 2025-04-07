/**
 * Initialization function for the Habit module
 * @param {Object} ctx - Application context
 */
export function habitInit(ctx) {
  const { logger } = ctx;

  try {
    // Initialize any resources that the habit module needs
    logger?.info('[Habit] Module initialized successfully');
    
    // Schedule the daily reset job if possible
    if (ctx.scheduler) {
      // Schedule habit reset job to run at midnight
      ctx.scheduler.schedule('0 0 * * *', async () => {
        logger?.info('[Habit] Running scheduled daily habit reset');
        
        try {
          const { models } = ctx;
          const Habit = models.Habit;
          
          if (!Habit) {
            logger?.warn('[Habit] Habit model not found in context');
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
          
          logger?.debug(`[Habit] Found ${habitsToReset.length} habits to reset`);
          
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
          
          logger?.info('[Habit] Completed daily habit reset');
          
          // Emit day change event
          if (ctx.hooks) {
            const HOOK_EVENTS = ctx.HOOK_EVENTS || { DAY_CHANGE: 'system:day_change' };
            ctx.hooks.emit(HOOK_EVENTS.DAY_CHANGE);
          }
        } catch (error) {
          logger?.error(`[Habit] Error in scheduled habit reset: ${error.message}`);
        }
      });
      
      logger?.info('[Habit] Scheduled daily habit reset job');
    }
    
    return ctx;
  } catch (error) {
    logger?.error(`[Habit] Initialization failed: ${error.message}`);
    return ctx;
  }
}

export default habitInit; 