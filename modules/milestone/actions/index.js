import { Milestone } from '../schemas.js';
import { STATUS_ENUMS, TYPE_ENUMS } from '../constants.js';

/**
 * Create a new milestone
 * @param {Object} ctx - Application context
 * @param {Object} params - Milestone creation parameters
 * @returns {Promise<Object>} - Created milestone object
 */
export const createMilestone = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'milestone-actions' });
  
  try {
    const { 
      userId, 
      title, 
      description = '', 
      milestoneType = 'achievement',
      parentGoalId = null,
      startDate,
      targetDate,
      subMilestones = [],
      metadata = {},
      thresholdValue,
      unit,
      relatedHabits = []
    } = params;
    
    // Validate required fields
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!title) {
      throw new Error('title is required');
    }
    
    // Validate milestone type
    if (milestoneType && !TYPE_ENUMS.includes(milestoneType)) {
      throw new Error(`Invalid milestone type: ${milestoneType}`);
    }
    
    // Calculate initial progress if sub-milestones are provided
    let progressPercentage = 0;
    if (subMilestones && subMilestones.length > 0) {
      const completedCount = subMilestones.filter(sm => sm.completed).length;
      progressPercentage = (completedCount / subMilestones.length) * 100;
    }
    
    // Create milestone
    const milestone = new Milestone({
      userId,
      title,
      description,
      milestoneType,
      parentGoalId,
      startDate,
      targetDate,
      progressPercentage,
      thresholdValue,
      unit,
      subMilestones,
      relatedHabits,
      status: 'planned',
      metadata
    });
    
    await milestone.save();
    logger.info(`Created milestone ${milestone._id} for user ${userId}`);
    
    return milestone;
  } catch (error) {
    logger.error('Error creating milestone:', error);
    throw error;
  }
};

/**
 * Update milestone status with notes
 * @param {Object} ctx - Application context
 * @param {Object} params - Status update parameters
 * @returns {Promise<Object>} - Updated milestone object 
 */
export const updateMilestoneStatus = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'milestone-actions' });
  
  try {
    const { milestoneId, userId, status, statusNote } = params;
    
    // Validate params
    if (!milestoneId) {
      throw new Error('milestoneId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!status) {
      throw new Error('status is required');
    }
    
    // Validate status
    if (!STATUS_ENUMS.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    // Get milestone
    const milestone = await Milestone.findOne({ _id: milestoneId, userId });
    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }
    
    // Check if transition is allowed
    if (!milestone.canTransitionTo(status)) {
      throw new Error(`Cannot transition from ${milestone.status} to ${status}`);
    }
    
    // Update status
    await milestone.setStatus(status, statusNote);
    
    // If milestone is achieved, set completedDate
    if (status === 'achieved' && !milestone.completedDate) {
      milestone.completedDate = new Date();
    }
    
    await milestone.save();
    logger.info(`Updated milestone ${milestoneId} status to ${status}`);
    
    return milestone;
  } catch (error) {
    logger.error('Error updating milestone status:', error);
    throw error;
  }
};

/**
 * Add a sub-milestone to a parent milestone
 * @param {Object} ctx - Application context 
 * @param {Object} params - Sub-milestone parameters
 * @returns {Promise<Object>} - Updated parent milestone
 */
export const addSubMilestone = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'milestone-actions' });
  
  try {
    const { milestoneId, userId, title, description, order } = params;
    
    // Validate params
    if (!milestoneId) {
      throw new Error('milestoneId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!title) {
      throw new Error('title is required');
    }
    
    // Get milestone
    const milestone = await Milestone.findOne({ _id: milestoneId, userId });
    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }
    
    // Initialize subMilestones array if not exists
    if (!milestone.subMilestones) {
      milestone.subMilestones = [];
    }
    
    // Add sub-milestone
    const subMilestone = {
      title,
      description: description || '',
      completed: false,
      order: order !== undefined ? order : milestone.subMilestones.length
    };
    
    milestone.subMilestones.push(subMilestone);
    
    // Recalculate progress
    const completedCount = milestone.subMilestones.filter(sm => sm.completed).length;
    milestone.progressPercentage = 
      (completedCount / milestone.subMilestones.length) * 100;
    
    await milestone.save();
    logger.info(`Added sub-milestone to milestone ${milestoneId}`);
    
    return milestone;
  } catch (error) {
    logger.error('Error adding sub-milestone:', error);
    throw error;
  }
};

/**
 * Toggle completion status of a sub-milestone
 * @param {Object} ctx - Application context
 * @param {Object} params - Toggle parameters
 * @returns {Promise<Object>} - Updated parent milestone
 */
export const toggleSubMilestoneCompletion = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'milestone-actions' });
  
  try {
    const { milestoneId, userId, subMilestoneId } = params;
    
    // Validate params
    if (!milestoneId) {
      throw new Error('milestoneId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!subMilestoneId) {
      throw new Error('subMilestoneId is required');
    }
    
    // Get milestone
    const milestone = await Milestone.findOne({ _id: milestoneId, userId });
    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }
    
    // Find sub-milestone
    const subMilestoneIdx = milestone.subMilestones.findIndex(
      sm => sm._id.toString() === subMilestoneId.toString()
    );
    
    if (subMilestoneIdx === -1) {
      throw new Error('Sub-milestone not found');
    }
    
    // Toggle completion and set date
    milestone.subMilestones[subMilestoneIdx].completed = 
      !milestone.subMilestones[subMilestoneIdx].completed;
    
    if (milestone.subMilestones[subMilestoneIdx].completed) {
      milestone.subMilestones[subMilestoneIdx].completedDate = new Date();
    } else {
      milestone.subMilestones[subMilestoneIdx].completedDate = null;
    }
    
    // Recalculate progress
    const completedCount = milestone.subMilestones.filter(sm => sm.completed).length;
    milestone.progressPercentage = 
      (completedCount / milestone.subMilestones.length) * 100;
    
    // If all sub-milestones are completed, suggest updating milestone status
    if (completedCount === milestone.subMilestones.length && 
        milestone.status !== 'achieved' && 
        milestone.progressPercentage === 100) {
      
      // Only automatically update if in certain statuses
      if (['in_progress', 'nearly_complete'].includes(milestone.status)) {
        await milestone.setStatus('nearly_complete', 'All sub-milestones completed');
      }
    }
    
    await milestone.save();
    logger.info(`Toggled sub-milestone ${subMilestoneId} completion for milestone ${milestoneId}`);
    
    return milestone;
  } catch (error) {
    logger.error('Error toggling sub-milestone completion:', error);
    throw error;
  }
};

/**
 * Update milestone threshold progress value
 * @param {Object} ctx - Application context
 * @param {Object} params - Progress update parameters
 * @returns {Promise<Object>} - Updated milestone
 */
export const updateMilestoneProgress = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'milestone-actions' });
  
  try {
    const { milestoneId, userId, currentValue, progressPercentage } = params;
    
    // Validate params
    if (!milestoneId) {
      throw new Error('milestoneId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
    if (currentValue === undefined && progressPercentage === undefined) {
      throw new Error('Either currentValue or progressPercentage is required');
    }
    
    // Get milestone
    const milestone = await Milestone.findOne({ _id: milestoneId, userId });
    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }
    
    // Update progress based on milestone type
    if (milestone.milestoneType === 'threshold' && currentValue !== undefined) {
      // For threshold milestones, update the current value and calculate percentage
      milestone.currentValue = currentValue;
      
      if (milestone.thresholdValue) {
        milestone.progressPercentage = 
          Math.min(100, (currentValue / milestone.thresholdValue) * 100);
      }
    } else if (progressPercentage !== undefined) {
      // For other milestone types, directly update progress percentage
      milestone.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    }
    
    // Suggest status update if progress indicates milestone is near completion
    if (milestone.progressPercentage >= 90 && 
        milestone.status !== 'achieved' && 
        milestone.status !== 'nearly_complete') {
      
      await milestone.setStatus('nearly_complete', 'Progress at or above 90%');
    }
    
    await milestone.save();
    logger.info(`Updated progress for milestone ${milestoneId}`);
    
    return milestone;
  } catch (error) {
    logger.error('Error updating milestone progress:', error);
    throw error;
  }
};

/**
 * Link habits to a milestone
 * @param {Object} ctx - Application context
 * @param {Object} params - Link parameters
 * @returns {Promise<Object>} - Updated milestone
 */
export const linkHabitsToMilestone = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'milestone-actions' });
  
  try {
    const { milestoneId, userId, habitIds } = params;
    
    // Validate params
    if (!milestoneId) {
      throw new Error('milestoneId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!habitIds || !Array.isArray(habitIds) || habitIds.length === 0) {
      throw new Error('habitIds array is required');
    }
    
    // Get milestone
    const milestone = await Milestone.findOne({ _id: milestoneId, userId });
    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }
    
    // Initialize related habits array if not exists
    if (!milestone.relatedHabits) {
      milestone.relatedHabits = [];
    }
    
    // Add new habit IDs (avoid duplicates)
    habitIds.forEach(habitId => {
      if (!milestone.relatedHabits.some(id => id.toString() === habitId.toString())) {
        milestone.relatedHabits.push(habitId);
      }
    });
    
    // If milestone is not already habit-based, mark it as such
    if (milestone.milestoneType !== 'habit_based') {
      milestone.milestoneType = 'habit_based';
    }
    
    await milestone.save();
    logger.info(`Linked habits to milestone ${milestoneId}`);
    
    return milestone;
  } catch (error) {
    logger.error('Error linking habits to milestone:', error);
    throw error;
  }
};

// Export all actions
export default {
  createMilestone,
  updateMilestoneStatus,
  addSubMilestone,
  toggleSubMilestoneCompletion,
  updateMilestoneProgress,
  linkHabitsToMilestone
}; 