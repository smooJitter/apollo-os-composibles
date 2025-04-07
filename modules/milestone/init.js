/**
 * Milestone module initialization
 * Sets up necessary resources and configurations for the milestone module
 */

/**
 * Initialize resources needed by the Milestone module
 * @param {Object} ctx - Application context
 * @returns {Object} ctx - Updated application context
 */
const milestoneInit = (ctx) => {
  const logger = ctx.logger.child({ module: 'milestone-init' });
  
  try {
    logger.info('Initializing Milestone module');
    
    // Register models if needed
    if (ctx.registerModel && !ctx.models.Milestone) {
      const { Milestone } = require('./schemas.js');
      ctx.registerModel('Milestone', Milestone);
    }
    
    // Set up scheduled tasks
    if (ctx.scheduler) {
      // Task: Update milestone due dates
      ctx.scheduler.registerTask('milestone-due-dates', '0 0 * * *', async () => {
        try {
          const { Milestone } = ctx.models;
          
          // Find milestones that are due in the next 24 hours and not completed
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          
          const dueSoon = await Milestone.find({
            targetDate: { $gte: today, $lt: tomorrow },
            status: { $nin: ['achieved', 'abandoned'] }
          });
          
          // Emit events for each milestone that's due soon
          for (const milestone of dueSoon) {
            ctx.events.emit('milestone:dueSoon', {
              milestoneId: milestone._id,
              userId: milestone.userId,
              title: milestone.title,
              targetDate: milestone.targetDate
            });
          }
          
          logger.debug(`Processed ${dueSoon.length} milestones due soon`);
        } catch (error) {
          logger.error('Error in milestone-due-dates scheduled task:', error);
        }
      });
      
      // Task: Update milestone status suggestions
      ctx.scheduler.registerTask('milestone-status-suggestions', '0 1 * * *', async () => {
        try {
          const { Milestone } = ctx.models;
          
          // Find in-progress milestones with high progress
          const highProgress = await Milestone.find({
            status: 'in_progress',
            progressPercentage: { $gte: 90 }
          });
          
          // Update status suggestions
          for (const milestone of highProgress) {
            ctx.events.emit('milestone:suggestStatusChange', {
              milestoneId: milestone._id,
              userId: milestone.userId,
              currentStatus: milestone.status,
              suggestedStatus: 'nearly_complete',
              reason: 'Progress is at or above 90%'
            });
          }
          
          // Find stale in-progress milestones
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          
          const stale = await Milestone.find({
            status: 'in_progress',
            updatedAt: { $lt: twoWeeksAgo }
          });
          
          // Emit stale milestone events
          for (const milestone of stale) {
            ctx.events.emit('milestone:stale', {
              milestoneId: milestone._id,
              userId: milestone.userId,
              lastUpdated: milestone.updatedAt
            });
          }
          
          logger.debug(`Processed status suggestions for ${highProgress.length} milestones`);
          logger.debug(`Found ${stale.length} stale milestones`);
        } catch (error) {
          logger.error('Error in milestone-status-suggestions scheduled task:', error);
        }
      });
    }
    
    logger.info('Milestone module initialized successfully');
    return ctx;
  } catch (error) {
    logger.error('Error initializing Milestone module:', error);
    // Return context even in case of error to not break the pipeline
    return ctx;
  }
};

export default milestoneInit; 