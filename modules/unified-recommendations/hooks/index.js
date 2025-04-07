import { UnifiedRecsAndNotifs } from '../schemas.js';
import { ENTRY_TYPES, NOTIFICATION_REASONS, CONTENT_TYPES } from '../constants.js';
import mongoose from 'mongoose';

// Define module-specific events
export const UNIFIED_EVENTS = {
  ENTRY_CREATED: 'unified:entry_created',
  ENTRY_UPDATED: 'unified:entry_updated',
  ENTRY_SEEN: 'unified:entry_seen',
  ENTRY_ACTED_UPON: 'unified:entry_acted_upon',
  ENTRY_DISMISSED: 'unified:entry_dismissed',
  ALL_NOTIFICATIONS_SEEN: 'unified:all_notifications_seen'
};

export const initHooks = (ctx) => {
  const { eventBus, logger } = ctx;
  const log = logger.child({ module: 'unified-recommendations-hooks' });
  
  // Handle Milestone events to create notifications
  if (eventBus) {
    // Listen for milestone approaching deadline
    eventBus.on('milestone:approaching_deadline', async ({ milestone, userId, daysRemaining }) => {
      try {
        if (!milestone || !userId) return;
        
        // Create a notification for the approaching milestone
        const notification = new UnifiedRecsAndNotifs({
          userId,
          type: ENTRY_TYPES.NOTIFICATION,
          contentType: CONTENT_TYPES.MILESTONE,
          contentId: milestone._id,
          contentModel: 'Milestone',
          title: 'Milestone Deadline Approaching',
          message: `Your milestone "${milestone.title}" is due in ${daysRemaining} days.`,
          reason: NOTIFICATION_REASONS.MILESTONE_REMINDER,
          metadata: {
            priority: daysRemaining <= 1 ? 'High' : 'Medium',
            requiresAction: true,
            actionText: 'View Milestone',
            iconUrl: 'flag',
            color: daysRemaining <= 1 ? '#e53935' : '#fb8c00'
          }
        });
        
        await notification.save();
        
        log.info(`Created milestone reminder notification for user ${userId}, milestone ${milestone._id}`);
        
        // Emit the entry creation event
        eventBus.emit(UNIFIED_EVENTS.ENTRY_CREATED, {
          entry: notification,
          userId
        });
      } catch (error) {
        log.error(`Error creating milestone notification: ${error.message}`, { error });
      }
    });
    
    // Listen for habit streak alerts
    eventBus.on('habit:streak_at_risk', async ({ habit, userId, daysMissed }) => {
      try {
        if (!habit || !userId) return;
        
        // Create a notification for the habit streak at risk
        const notification = new UnifiedRecsAndNotifs({
          userId,
          type: ENTRY_TYPES.NOTIFICATION,
          contentType: CONTENT_TYPES.HABIT,
          contentId: habit._id,
          contentModel: 'Habit',
          title: 'Habit Streak at Risk',
          message: `Don't break your streak for "${habit.title}". It's been ${daysMissed} days since your last check-in.`,
          reason: NOTIFICATION_REASONS.STREAK_ALERT,
          metadata: {
            priority: 'High',
            requiresAction: true,
            actionText: 'Complete Habit',
            iconUrl: 'repeat',
            color: '#e53935'
          }
        });
        
        await notification.save();
        
        log.info(`Created habit streak notification for user ${userId}, habit ${habit._id}`);
        
        // Emit the entry creation event
        eventBus.emit(UNIFIED_EVENTS.ENTRY_CREATED, {
          entry: notification,
          userId
        });
      } catch (error) {
        log.error(`Error creating habit notification: ${error.message}`, { error });
      }
    });
    
    // Listen for new immersions to create recommendations
    eventBus.on('immersion:created', async ({ immersion, userId }) => {
      try {
        if (!immersion || !userId || immersion.metadata?.isPublic !== true) return;
        
        // Get users who might be interested in this immersion
        // For example, users with similar interests based on tags
        if (!ctx.models || !ctx.models.User) return;
        
        // Simple implementation: recommend to all users except creator
        // In a real system, you would use a more sophisticated recommendation algorithm
        const users = await ctx.models.User.find({ 
          _id: { $ne: immersion.userId },
          isActive: true
        }).limit(20);
        
        const createdRecommendations = [];
        
        for (const user of users) {
          // Create a recommendation for the user
          const recommendation = new UnifiedRecsAndNotifs({
            userId: user._id,
            type: ENTRY_TYPES.RECOMMENDATION,
            contentType: CONTENT_TYPES.IMMERSION,
            contentId: immersion._id,
            contentModel: 'Immersion',
            title: 'New Immersion Experience',
            message: `Try this new ${immersion.type} experience: "${immersion.title}"`,
            reason: NOTIFICATION_REASONS.NEW_CONTENT,
            metadata: {
              priority: 'Medium',
              category: immersion.type,
              tags: immersion.weightedTags?.map(tag => tag.name) || [],
              requiresAction: false,
              iconUrl: 'visibility',
              color: '#4a6da7'
            }
          });
          
          await recommendation.save();
          createdRecommendations.push(recommendation);
        }
        
        log.info(`Created ${createdRecommendations.length} recommendations for new immersion ${immersion._id}`);
        
        // Emit events for each created recommendation
        createdRecommendations.forEach(rec => {
          eventBus.emit(UNIFIED_EVENTS.ENTRY_CREATED, {
            entry: rec,
            userId: rec.userId
          });
        });
      } catch (error) {
        log.error(`Error creating immersion recommendations: ${error.message}`, { error });
      }
    });
    
    // Listen for manifestation progress updates
    eventBus.on('manifestation:progress_updated', async ({ manifestation, userId, oldProgress, newProgress }) => {
      try {
        if (!manifestation || !userId) return;
        
        // Only create notification for significant progress (e.g., 25%, 50%, 75%, 100%)
        const progressMilestones = [25, 50, 75, 100];
        const oldMilestone = Math.floor(oldProgress / 25) * 25;
        const newMilestone = Math.floor(newProgress / 25) * 25;
        
        if (newMilestone <= oldMilestone || !progressMilestones.includes(newMilestone)) {
          return;
        }
        
        // Create a notification for the progress milestone
        const notification = new UnifiedRecsAndNotifs({
          userId,
          type: ENTRY_TYPES.NOTIFICATION,
          contentType: CONTENT_TYPES.MANIFESTATION,
          contentId: manifestation._id,
          contentModel: 'Manifestation',
          title: 'Manifestation Milestone Reached',
          message: `You've reached ${newMilestone}% progress on your manifestation "${manifestation.title}"! Keep going!`,
          reason: NOTIFICATION_REASONS.PROGRESS_UPDATE,
          metadata: {
            priority: newMilestone === 100 ? 'High' : 'Medium',
            requiresAction: false,
            iconUrl: 'star',
            color: newMilestone === 100 ? '#4caf50' : '#fb8c00'
          }
        });
        
        await notification.save();
        
        log.info(`Created manifestation progress notification for user ${userId}, manifestation ${manifestation._id}`);
        
        // Emit the entry creation event
        eventBus.emit(UNIFIED_EVENTS.ENTRY_CREATED, {
          entry: notification,
          userId
        });
        
        // If 100% is reached, create recommendations for related content
        if (newMilestone === 100) {
          await createRelatedContentRecommendations(userId, manifestation, ctx, log, eventBus);
        }
      } catch (error) {
        log.error(`Error creating manifestation progress notification: ${error.message}`, { error });
      }
    });
    
    // Listen for entry actions to update analytics
    eventBus.on(UNIFIED_EVENTS.ENTRY_ACTED_UPON, async ({ entry, userId }) => {
      try {
        if (!entry || !userId) return;
        
        // Update any related analytics or trigger subsequent recommendations
        // For example, if user acts on a recommendation, we might recommend similar content
        
        log.info(`User ${userId} acted upon entry ${entry._id}`);
      } catch (error) {
        log.error(`Error processing entry acted upon: ${error.message}`, { error });
      }
    });
  }
  
  return ctx;
};

// Helper function to create recommendations for related content
async function createRelatedContentRecommendations(userId, manifestation, ctx, log, eventBus) {
  try {
    // Get related immersions based on tags or content type
    if (!ctx.models || !ctx.models.Immersion) return;
    
    // Example: Find immersions that match the manifestation's tags or type
    const relatedImmersions = await ctx.models.Immersion.find({
      'metadata.isPublic': true,
      $or: [
        // Match by tags if the manifestation has any
        ...(manifestation.tags?.length > 0 ? 
          [{ 'tags.name': { $in: manifestation.tags.map(tag => tag.name) } }] : 
          []),
        // Or match by life area if the manifestation has metadata
        ...(manifestation.metadata?.lifeAreas?.length > 0 ? 
          [{ 'metadata.lifeAreas': { $in: manifestation.metadata.lifeAreas } }] : 
          [])
      ]
    }).limit(3);
    
    for (const immersion of relatedImmersions) {
      // Create a recommendation for each related immersion
      const recommendation = new UnifiedRecsAndNotifs({
        userId,
        type: ENTRY_TYPES.RECOMMENDATION,
        contentType: CONTENT_TYPES.IMMERSION,
        contentId: immersion._id,
        contentModel: 'Immersion',
        title: 'Try This Immersion',
        message: `Based on your completed manifestation, we thought you might enjoy this ${immersion.type}: "${immersion.title}"`,
        reason: NOTIFICATION_REASONS.RELATED_TO_PROGRESS,
        metadata: {
          priority: 'Medium',
          requiresAction: false,
          iconUrl: 'psychology',
          color: '#4a6da7'
        },
        additionalDetails: {
          relatedManifestationId: manifestation._id
        }
      });
      
      await recommendation.save();
      
      // Emit created event
      if (eventBus) {
        eventBus.emit(UNIFIED_EVENTS.ENTRY_CREATED, {
          entry: recommendation,
          userId
        });
      }
    }
    
    log.info(`Created ${relatedImmersions.length} immersion recommendations for user ${userId} based on manifestation completion`);
  } catch (error) {
    log.error(`Error creating related content recommendations: ${error.message}`, { error });
  }
}

export default initHooks; 