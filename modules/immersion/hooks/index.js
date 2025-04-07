import { Immersion } from '../schemas.js';
import mongoose from 'mongoose';

export const IMMERSION_EVENTS = {
  CREATED: 'immersion:created',
  UPDATED: 'immersion:updated',
  DELETED: 'immersion:deleted',
  COMPLETED: 'immersion:completed',
  STARTED: 'immersion:started',
  PROGRESS_UPDATED: 'immersion:progress_updated',
  MEDIA_ADDED: 'immersion:media_added',
  LINKED_TO_MANIFESTATION: 'immersion:linked_to_manifestation',
  LINKED_TO_MILESTONE: 'immersion:linked_to_milestone'
};

export const initHooks = (ctx) => {
  const { eventBus, logger } = ctx;
  const log = logger.child({ module: 'immersion-hooks' });
  
  // Listen for user completions and update engagement metrics
  eventBus.on(IMMERSION_EVENTS.COMPLETED, async ({ immersionId, userId, sessionTime, rating }) => {
    try {
      const immersion = await Immersion.findById(immersionId);
      if (!immersion) {
        log.warn(`Immersion not found for completion event: ${immersionId}`);
        return;
      }
      
      // Update engagement metrics
      const metrics = immersion.engagementMetrics || {};
      metrics.completedCount = (metrics.completedCount || 0) + 1;
      
      if (sessionTime) {
        // Update average session time
        const currentAvg = metrics.averageSessionTime || 0;
        const currentCount = metrics.completedCount || 1; // Should be at least 1 now
        metrics.averageSessionTime = ((currentAvg * (currentCount - 1)) + sessionTime) / currentCount;
      }
      
      if (rating) {
        // Update average rating
        const currentRatings = metrics.userRatings || [];
        // Add the new rating to the array
        currentRatings.push(rating);
        metrics.userRatings = currentRatings;
      }
      
      // Save the updated immersion
      await Immersion.updateOne(
        { _id: immersionId },
        { $set: { engagementMetrics: metrics } }
      );
      
      log.info(`Updated engagement metrics for immersion ${immersionId}`);
    } catch (error) {
      log.error(`Error processing immersion completion: ${error.message}`, { error });
    }
  });
  
  // Listen for immersion starts to track engagement
  eventBus.on(IMMERSION_EVENTS.STARTED, async ({ immersionId, userId }) => {
    try {
      const immersion = await Immersion.findById(immersionId);
      if (!immersion) {
        log.warn(`Immersion not found for start event: ${immersionId}`);
        return;
      }
      
      // Update engagement metrics
      const metrics = immersion.engagementMetrics || {};
      metrics.startedCount = (metrics.startedCount || 0) + 1;
      
      // Calculate updated completion rate
      if (metrics.startedCount > 0 && metrics.completedCount >= 0) {
        metrics.completionRate = metrics.completedCount / metrics.startedCount;
      }
      
      // Save the updated immersion
      await Immersion.updateOne(
        { _id: immersionId },
        { $set: { engagementMetrics: metrics } }
      );
      
      log.info(`Updated start count for immersion ${immersionId}`);
    } catch (error) {
      log.error(`Error processing immersion start: ${error.message}`, { error });
    }
  });
  
  // Handle manifestation linking
  eventBus.on(IMMERSION_EVENTS.LINKED_TO_MANIFESTATION, async ({ immersionId, manifestationId }) => {
    try {
      // Verify the manifestation exists if Manifestation model is available
      if (ctx.models.Manifestation) {
        const Manifestation = mongoose.model('Manifestation');
        const manifestation = await Manifestation.findById(manifestationId);
        if (!manifestation) {
          log.warn(`Manifestation not found for linking: ${manifestationId}`);
          return;
        }
      }
      
      // Update the immersion to link to the manifestation if not already linked
      await Immersion.updateOne(
        { 
          _id: immersionId, 
          relatedManifestations: { $ne: manifestationId } 
        },
        { 
          $addToSet: { relatedManifestations: manifestationId } 
        }
      );
      
      log.info(`Linked immersion ${immersionId} to manifestation ${manifestationId}`);
    } catch (error) {
      log.error(`Error linking immersion to manifestation: ${error.message}`, { error });
    }
  });
  
  // Handle milestone linking
  eventBus.on(IMMERSION_EVENTS.LINKED_TO_MILESTONE, async ({ immersionId, milestoneId }) => {
    try {
      // Verify the milestone exists if Milestone model is available
      if (ctx.models.Milestone) {
        const Milestone = mongoose.model('Milestone');
        const milestone = await Milestone.findById(milestoneId);
        if (!milestone) {
          log.warn(`Milestone not found for linking: ${milestoneId}`);
          return;
        }
      }
      
      // Update the immersion to link to the milestone if not already linked
      await Immersion.updateOne(
        { 
          _id: immersionId, 
          relatedMilestones: { $ne: milestoneId } 
        },
        { 
          $addToSet: { relatedMilestones: milestoneId } 
        }
      );
      
      log.info(`Linked immersion ${immersionId} to milestone ${milestoneId}`);
    } catch (error) {
      log.error(`Error linking immersion to milestone: ${error.message}`, { error });
    }
  });
  
  // Optional: Integration with analytics service
  if (ctx.services && ctx.services.analytics) {
    // Track immersion creation analytics
    eventBus.on(IMMERSION_EVENTS.CREATED, async ({ immersion, userId }) => {
      try {
        ctx.services.analytics.trackEvent('immersion_created', {
          userId,
          immersionId: immersion._id,
          immersionType: immersion.type,
          aiGenerated: immersion.isGeneratedByAI
        });
        log.debug(`Tracked analytics for immersion creation: ${immersion._id}`);
      } catch (error) {
        log.warn(`Failed to track immersion creation analytics: ${error.message}`);
      }
    });
    
    // Track immersion completion analytics
    eventBus.on(IMMERSION_EVENTS.COMPLETED, async ({ immersionId, userId, rating, sessionTime }) => {
      try {
        ctx.services.analytics.trackEvent('immersion_completed', {
          userId,
          immersionId,
          rating,
          sessionTime
        });
        log.debug(`Tracked analytics for immersion completion: ${immersionId}`);
      } catch (error) {
        log.warn(`Failed to track immersion completion analytics: ${error.message}`);
      }
    });
  }
  
  return ctx;
};

export default initHooks;