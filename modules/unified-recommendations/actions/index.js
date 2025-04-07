import { UnifiedRecsAndNotifs } from '../schemas.js';
import { 
  ENTRY_TYPES, 
  STATUS_TYPES, 
  CONTENT_TYPES, 
  RECOMMENDATION_REASONS, 
  NOTIFICATION_REASONS 
} from '../constants.js';
import { UNIFIED_EVENTS } from '../hooks/index.js';
import mongoose from 'mongoose';

/**
 * Business logic for the Unified Recommendations and Notifications module
 */
export const initActions = (ctx) => {
  const { eventBus, logger } = ctx;
  const log = logger.child({ module: 'unified-recommendations-actions' });
  
  return {
    /**
     * Create a notification
     */
    async createNotification(data, userId) {
      try {
        // Basic validation
        if (!data.title) {
          throw new Error('Notification title is required');
        }
        
        if (!data.message) {
          throw new Error('Notification message is required');
        }
        
        if (!userId) {
          throw new Error('User ID is required');
        }
        
        // Create the notification
        const notification = new UnifiedRecsAndNotifs({
          userId,
          type: ENTRY_TYPES.NOTIFICATION,
          contentType: data.contentType || CONTENT_TYPES.SYSTEM,
          contentId: data.contentId,
          contentModel: data.contentModel,
          title: data.title,
          message: data.message,
          reason: data.reason || NOTIFICATION_REASONS.SYSTEM_NOTIFICATION,
          metadata: data.metadata || {},
          additionalDetails: data.additionalDetails || {},
          scheduledFor: data.scheduledFor,
          recurrencePattern: data.recurrencePattern
        });
        
        await notification.save();
        
        log.info(`Created notification "${notification.title}" for user ${userId}`);
        
        // Emit event
        if (eventBus) {
          eventBus.emit(UNIFIED_EVENTS.ENTRY_CREATED, {
            entry: notification,
            userId
          });
        }
        
        return notification;
      } catch (error) {
        log.error(`Failed to create notification: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Create a recommendation
     */
    async createRecommendation(data, userId) {
      try {
        // Basic validation
        if (!data.title) {
          throw new Error('Recommendation title is required');
        }
        
        if (!data.message) {
          throw new Error('Recommendation message is required');
        }
        
        if (!userId) {
          throw new Error('User ID is required');
        }
        
        if (!data.contentType || !data.contentId) {
          throw new Error('Content type and ID are required for recommendations');
        }
        
        // Create the recommendation
        const recommendation = new UnifiedRecsAndNotifs({
          userId,
          type: ENTRY_TYPES.RECOMMENDATION,
          contentType: data.contentType,
          contentId: data.contentId,
          contentModel: data.contentModel,
          title: data.title,
          message: data.message,
          reason: data.reason || RECOMMENDATION_REASONS.SIMILAR_CONTENT,
          metadata: data.metadata || {},
          additionalDetails: data.additionalDetails || {}
        });
        
        await recommendation.save();
        
        log.info(`Created recommendation "${recommendation.title}" for user ${userId}`);
        
        // Emit event
        if (eventBus) {
          eventBus.emit(UNIFIED_EVENTS.ENTRY_CREATED, {
            entry: recommendation,
            userId
          });
        }
        
        return recommendation;
      } catch (error) {
        log.error(`Failed to create recommendation: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Get active notifications for a user
     */
    async getNotifications(userId, options = {}) {
      try {
        const { limit = 20, skip = 0, includeRead = false, sort = '-createdAt' } = options;
        
        // Build the query
        const query = {
          userId,
          type: ENTRY_TYPES.NOTIFICATION,
          isActive: true
        };
        
        // Filter by status if requested
        if (!includeRead) {
          query.status = STATUS_TYPES.SENT;
        }
        
        // Execute query
        const notifications = await UnifiedRecsAndNotifs.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit);
        
        return notifications;
      } catch (error) {
        log.error(`Failed to get notifications: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Get recommendations for a user
     */
    async getRecommendations(userId, options = {}) {
      try {
        const { 
          limit = 20, 
          skip = 0, 
          contentType = null, 
          includeDismissed = false, 
          sort = '-metadata.priority -createdAt' 
        } = options;
        
        // Build the query
        const query = {
          userId,
          type: ENTRY_TYPES.RECOMMENDATION,
          isActive: true
        };
        
        // Filter by content type if specified
        if (contentType) {
          query.contentType = contentType;
        }
        
        // Filter out dismissed recommendations if requested
        if (!includeDismissed) {
          query.status = { $ne: STATUS_TYPES.DISMISSED };
        }
        
        // Execute query
        const recommendations = await UnifiedRecsAndNotifs.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit);
        
        return recommendations;
      } catch (error) {
        log.error(`Failed to get recommendations: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Mark an entry as seen
     */
    async markAsSeen(entryId, userId) {
      try {
        // Find the entry and validate ownership
        const entry = await UnifiedRecsAndNotifs.findOne({
          _id: entryId,
          userId
        });
        
        if (!entry) {
          throw new Error(`Entry not found or access denied: ${entryId}`);
        }
        
        // Mark as seen
        if (entry.status === STATUS_TYPES.SENT) {
          await entry.markAsSeen();
          
          // Emit event
          if (eventBus) {
            eventBus.emit(UNIFIED_EVENTS.ENTRY_SEEN, {
              entry,
              userId
            });
          }
        }
        
        return entry;
      } catch (error) {
        log.error(`Failed to mark entry as seen: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Mark an entry as acted upon
     */
    async markAsActedUpon(entryId, userId) {
      try {
        // Find the entry and validate ownership
        const entry = await UnifiedRecsAndNotifs.findOne({
          _id: entryId,
          userId
        });
        
        if (!entry) {
          throw new Error(`Entry not found or access denied: ${entryId}`);
        }
        
        // Mark as acted upon
        await entry.markAsActedUpon();
        
        // Emit event
        if (eventBus) {
          eventBus.emit(UNIFIED_EVENTS.ENTRY_ACTED_UPON, {
            entry,
            userId
          });
        }
        
        return entry;
      } catch (error) {
        log.error(`Failed to mark entry as acted upon: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Dismiss an entry
     */
    async dismissEntry(entryId, userId) {
      try {
        // Find the entry and validate ownership
        const entry = await UnifiedRecsAndNotifs.findOne({
          _id: entryId,
          userId
        });
        
        if (!entry) {
          throw new Error(`Entry not found or access denied: ${entryId}`);
        }
        
        // Dismiss the entry
        await entry.dismiss();
        
        // Emit event
        if (eventBus) {
          eventBus.emit(UNIFIED_EVENTS.ENTRY_DISMISSED, {
            entry,
            userId
          });
        }
        
        return entry;
      } catch (error) {
        log.error(`Failed to dismiss entry: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Mark all notifications as seen
     */
    async markAllNotificationsSeen(userId) {
      try {
        const now = new Date();
        
        // Update all unseen notifications
        const result = await UnifiedRecsAndNotifs.updateMany(
          {
            userId,
            type: ENTRY_TYPES.NOTIFICATION,
            status: STATUS_TYPES.SENT,
            isActive: true
          },
          {
            $set: {
              status: STATUS_TYPES.SEEN,
              'analytics.lastSeenAt': now
            },
            $inc: { 'analytics.impressionCount': 1 }
          }
        );
        
        // Set firstSeenAt for entries that don't have it
        await UnifiedRecsAndNotifs.updateMany(
          {
            userId,
            type: ENTRY_TYPES.NOTIFICATION,
            status: STATUS_TYPES.SEEN,
            'analytics.firstSeenAt': { $exists: false }
          },
          {
            $set: { 'analytics.firstSeenAt': now }
          }
        );
        
        // Emit event
        if (eventBus) {
          eventBus.emit(UNIFIED_EVENTS.ALL_NOTIFICATIONS_SEEN, {
            userId,
            count: result.nModified
          });
        }
        
        return result.nModified;
      } catch (error) {
        log.error(`Failed to mark all notifications as seen: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Get entry counts and stats
     */
    async getStats(userId) {
      try {
        // Get counts by type and status
        const [
          notificationsCount,
          unreadNotificationsCount,
          recommendationsCount,
          notDismissedRecommendationsCount
        ] = await Promise.all([
          UnifiedRecsAndNotifs.countDocuments({
            userId,
            type: ENTRY_TYPES.NOTIFICATION,
            isActive: true
          }),
          UnifiedRecsAndNotifs.countDocuments({
            userId,
            type: ENTRY_TYPES.NOTIFICATION,
            status: STATUS_TYPES.SENT,
            isActive: true
          }),
          UnifiedRecsAndNotifs.countDocuments({
            userId,
            type: ENTRY_TYPES.RECOMMENDATION,
            isActive: true
          }),
          UnifiedRecsAndNotifs.countDocuments({
            userId,
            type: ENTRY_TYPES.RECOMMENDATION,
            status: { $ne: STATUS_TYPES.DISMISSED },
            isActive: true
          })
        ]);
        
        // Get counts by content type
        const contentTypeCounts = await UnifiedRecsAndNotifs.aggregate([
          { $match: { userId: mongoose.Types.ObjectId(userId), isActive: true } },
          { $group: { _id: '$contentType', count: { $sum: 1 } } }
        ]);
        
        // Map to a more user-friendly format
        const contentTypeStats = contentTypeCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {});
        
        return {
          total: notificationsCount + recommendationsCount,
          notifications: {
            total: notificationsCount,
            unread: unreadNotificationsCount
          },
          recommendations: {
            total: recommendationsCount,
            active: notDismissedRecommendationsCount
          },
          byContentType: contentTypeStats
        };
      } catch (error) {
        log.error(`Failed to get stats: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Schedule a recurring notification
     */
    async scheduleRecurringNotification(data, userId) {
      try {
        // Basic validation
        if (!data.title || !data.message) {
          throw new Error('Title and message are required');
        }
        
        if (!data.recurrencePattern) {
          throw new Error('Recurrence pattern is required');
        }
        
        // Create the notification with scheduling information
        const notification = new UnifiedRecsAndNotifs({
          userId,
          type: ENTRY_TYPES.NOTIFICATION,
          contentType: data.contentType || CONTENT_TYPES.SYSTEM,
          contentId: data.contentId,
          contentModel: data.contentModel,
          title: data.title,
          message: data.message,
          reason: NOTIFICATION_REASONS.SCHEDULED_REMINDER,
          scheduledFor: data.scheduledFor || new Date(),
          recurrencePattern: data.recurrencePattern,
          metadata: {
            ...(data.metadata || {}),
            requiresAction: data.requiresAction || false
          },
          additionalDetails: data.additionalDetails || {}
        });
        
        await notification.save();
        
        log.info(`Scheduled recurring notification "${notification.title}" for user ${userId}`);
        
        return notification;
      } catch (error) {
        log.error(`Failed to schedule recurring notification: ${error.message}`, { error });
        throw error;
      }
    },
    
    /**
     * Get personalized recommendations for a user
     * This is a more complex function that considers user preferences and behavior
     */
    async getPersonalizedRecommendations(userId, options = {}) {
      try {
        const { limit = 5, contentTypes = null } = options;
        
        // Build base query
        const query = {
          userId,
          type: ENTRY_TYPES.RECOMMENDATION,
          status: { $ne: STATUS_TYPES.DISMISSED },
          isActive: true
        };
        
        // Filter by content types if specified
        if (contentTypes && Array.isArray(contentTypes) && contentTypes.length > 0) {
          query.contentType = { $in: contentTypes };
        }
        
        // Get recommendations sorted by priority
        const recommendations = await UnifiedRecsAndNotifs.find(query)
          .sort({ 'metadata.priority': -1, createdAt: -1 })
          .limit(limit);
        
        // If we don't have enough recommendations, we could generate more here
        // based on user preferences and behavior
        
        return recommendations;
      } catch (error) {
        log.error(`Failed to get personalized recommendations: ${error.message}`, { error });
        throw error;
      }
    }
  };
};

export default initActions; 