import { schemaComposer } from 'graphql-compose';
import { 
  getUnifiedRecsAndNotifsTC, 
  getCreateEntryInputTC, 
  getUpdateEntryInputTC, 
  getFilterInputTC 
} from './registry.js';
import { UnifiedRecsAndNotifs } from './schemas.js';
import { ENTRY_TYPES, RECOMMENDATION_REASONS, NOTIFICATION_REASONS } from './constants.js';

export const initResolvers = (ctx) => {
  const log = ctx.logger.child({ module: 'unified-recommendations-resolvers' });

  // Get type composers
  const UnifiedRecsAndNotifsTC = getUnifiedRecsAndNotifsTC();
  const CreateEntryInputTC = getCreateEntryInputTC();
  const UpdateEntryInputTC = getUpdateEntryInputTC();
  const FilterInputTC = getFilterInputTC();

  // Query Resolvers
  schemaComposer.Query.addFields({
    // Get entry by ID
    unifiedEntryById: UnifiedRecsAndNotifsTC.getResolver('findById')
      .wrapResolve(next => async rp => {
        // Validate user has access
        if (!rp.context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        const result = await next(rp);
        
        // Ensure user only sees their own entries
        if (result && result.userId.toString() !== rp.context.user._id.toString()) {
          throw new Error('You do not have access to this entry');
        }
        
        return result;
      }),

    // Get entries for current user
    myUnifiedEntries: UnifiedRecsAndNotifsTC.mongooseResolvers
      .findMany({ 
        filter: {
          // Only include isActive: true by default
          onlyIndexed: true,
          isActive: true,
        },
        sort: { createdAt: -1 }
      })
      .withArgs({
        filter: FilterInputTC
      })
      .wrapResolve(next => async rp => {
        // Validate user is logged in
        if (!rp.context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        // Set userId filter to current user
        rp.args.filter = {
          ...rp.args.filter,
          userId: rp.context.user._id
        };
        
        return next(rp);
      }),
    
    // Get notifications for current user
    myNotifications: UnifiedRecsAndNotifsTC.mongooseResolvers
      .findMany({ 
        filter: {
          onlyIndexed: true,
          isActive: true,
        },
        sort: { createdAt: -1 }
      })
      .withArgs({
        limit: 'Int',
        offset: 'Int',
        status: 'String',
        filter: FilterInputTC
      })
      .wrapResolve(next => async rp => {
        // Validate user is logged in
        if (!rp.context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        // Set filters for notifications
        rp.args.filter = {
          ...rp.args.filter,
          userId: rp.context.user._id,
          type: ENTRY_TYPES.NOTIFICATION
        };
        
        // Apply status filter if provided
        if (rp.args.status) {
          rp.args.filter.status = rp.args.status;
        }
        
        return next(rp);
      }),
    
    // Get recommendations for current user
    myRecommendations: UnifiedRecsAndNotifsTC.mongooseResolvers
      .findMany({ 
        filter: {
          onlyIndexed: true,
          isActive: true,
        },
        sort: { 'metadata.priority': -1, createdAt: -1 }
      })
      .withArgs({
        limit: 'Int',
        offset: 'Int',
        contentType: 'String',
        filter: FilterInputTC
      })
      .wrapResolve(next => async rp => {
        // Validate user is logged in
        if (!rp.context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        // Set filters for recommendations
        rp.args.filter = {
          ...rp.args.filter,
          userId: rp.context.user._id,
          type: ENTRY_TYPES.RECOMMENDATION,
          // Don't show dismissed recommendations by default
          status: { $ne: 'Dismissed' }
        };
        
        // Apply contentType filter if provided
        if (rp.args.contentType) {
          rp.args.filter.contentType = rp.args.contentType;
        }
        
        return next(rp);
      }),
    
    // Count unseen notifications
    unreadNotificationCount: {
      type: 'Int',
      args: {},
      resolve: async (_, args, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        try {
          const count = await UnifiedRecsAndNotifs.countDocuments({
            userId: context.user._id,
            type: ENTRY_TYPES.NOTIFICATION,
            status: 'Sent',
            isActive: true
          });
          
          return count;
        } catch (error) {
          log.error('Error counting unread notifications:', error);
          throw error;
        }
      }
    },
    
    // Get stats for unified entries
    unifiedEntriesStats: {
      type: 'JSON',
      args: {},
      resolve: async (_, args, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        try {
          const userId = context.user._id;
          
          // Get counts by type and status
          const [
            notificationsCount,
            unreadNotificationsCount,
            recommendationsCount,
            unreadRecommendationsCount
          ] = await Promise.all([
            UnifiedRecsAndNotifs.countDocuments({
              userId,
              type: ENTRY_TYPES.NOTIFICATION,
              isActive: true
            }),
            UnifiedRecsAndNotifs.countDocuments({
              userId,
              type: ENTRY_TYPES.NOTIFICATION,
              status: 'Sent',
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
              status: 'Sent',
              isActive: true
            })
          ]);
          
          // Get counts by content type
          const contentTypeCounts = await UnifiedRecsAndNotifs.aggregate([
            { $match: { userId: userId, isActive: true } },
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
              unread: unreadRecommendationsCount
            },
            byContentType: contentTypeStats
          };
        } catch (error) {
          log.error('Error getting unified entries stats:', error);
          throw error;
        }
      }
    }
  });

  // Mutation Resolvers
  schemaComposer.Mutation.addFields({
    // Create a new unified entry
    createUnifiedEntry: {
      type: UnifiedRecsAndNotifsTC,
      args: {
        record: CreateEntryInputTC
      },
      resolve: async (_, { record }, context) => {
        // Validate permission
        if (!context.user || !context.user.isAdmin) {
          throw new Error('You do not have permission to create entries');
        }
        
        try {
          // Create the entry
          const entry = new UnifiedRecsAndNotifs(record);
          await entry.save();
          
          log.info(`Created new ${record.type} for user ${record.userId}`);
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit('unified:entry_created', {
              entry,
              userId: record.userId
            });
          }
          
          return entry;
        } catch (error) {
          log.error('Error creating unified entry:', error);
          throw error;
        }
      }
    },
    
    // Update an existing entry
    updateUnifiedEntry: {
      type: UnifiedRecsAndNotifsTC,
      args: {
        id: 'MongoID!',
        record: UpdateEntryInputTC
      },
      resolve: async (_, { id, record }, context) => {
        // Validate permission
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the entry
          const entry = await UnifiedRecsAndNotifs.findById(id);
          
          if (!entry) {
            throw new Error('Entry not found');
          }
          
          // Ensure user has permission to update (either admin or owner)
          if (!context.user.isAdmin && entry.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to update this entry');
          }
          
          // Update the entry
          Object.keys(record).forEach(key => {
            if (key !== 'userId') { // Prevent changing the owner
              if (key === 'metadata' || key === 'additionalDetails') {
                entry[key] = { ...entry[key], ...record[key] };
              } else {
                entry[key] = record[key];
              }
            }
          });
          
          await entry.save();
          
          log.info(`Updated ${entry.type} ${id}`);
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit('unified:entry_updated', {
              entry,
              userId: entry.userId
            });
          }
          
          return entry;
        } catch (error) {
          log.error('Error updating unified entry:', error);
          throw error;
        }
      }
    },
    
    // Mark entry as seen
    markEntrySeen: {
      type: UnifiedRecsAndNotifsTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (_, { id }, context) => {
        // Validate permission
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the entry
          const entry = await UnifiedRecsAndNotifs.findById(id);
          
          if (!entry) {
            throw new Error('Entry not found');
          }
          
          // Ensure user has permission
          if (entry.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to access this entry');
          }
          
          // Mark as seen if not already
          if (entry.status === 'Sent') {
            await entry.markAsSeen();
            
            // Emit event through event bus
            if (context.eventBus) {
              context.eventBus.emit('unified:entry_seen', {
                entry,
                userId: entry.userId
              });
            }
          }
          
          return entry;
        } catch (error) {
          log.error('Error marking entry as seen:', error);
          throw error;
        }
      }
    },
    
    // Mark entry as acted upon
    markEntryActedUpon: {
      type: UnifiedRecsAndNotifsTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (_, { id }, context) => {
        // Validate permission
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the entry
          const entry = await UnifiedRecsAndNotifs.findById(id);
          
          if (!entry) {
            throw new Error('Entry not found');
          }
          
          // Ensure user has permission
          if (entry.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to access this entry');
          }
          
          // Mark as acted upon
          await entry.markAsActedUpon();
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit('unified:entry_acted_upon', {
              entry,
              userId: entry.userId
            });
          }
          
          return entry;
        } catch (error) {
          log.error('Error marking entry as acted upon:', error);
          throw error;
        }
      }
    },
    
    // Dismiss entry
    dismissEntry: {
      type: UnifiedRecsAndNotifsTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (_, { id }, context) => {
        // Validate permission
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the entry
          const entry = await UnifiedRecsAndNotifs.findById(id);
          
          if (!entry) {
            throw new Error('Entry not found');
          }
          
          // Ensure user has permission
          if (entry.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to access this entry');
          }
          
          // Dismiss the entry
          await entry.dismiss();
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit('unified:entry_dismissed', {
              entry,
              userId: entry.userId
            });
          }
          
          return entry;
        } catch (error) {
          log.error('Error dismissing entry:', error);
          throw error;
        }
      }
    },
    
    // Mark all notifications as seen
    markAllNotificationsSeen: {
      type: 'Boolean',
      args: {},
      resolve: async (_, args, context) => {
        // Validate permission
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          const now = new Date();
          
          // Update all unseen notifications
          const result = await UnifiedRecsAndNotifs.updateMany(
            {
              userId: context.user._id,
              type: ENTRY_TYPES.NOTIFICATION,
              status: 'Sent',
              isActive: true
            },
            {
              $set: {
                status: 'Seen',
                'analytics.lastSeenAt': now
              },
              $inc: { 'analytics.impressionCount': 1 }
            }
          );
          
          // Set firstSeenAt for entries that don't have it
          await UnifiedRecsAndNotifs.updateMany(
            {
              userId: context.user._id,
              type: ENTRY_TYPES.NOTIFICATION,
              status: 'Seen',
              'analytics.firstSeenAt': { $exists: false }
            },
            {
              $set: { 'analytics.firstSeenAt': now }
            }
          );
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit('unified:all_notifications_seen', {
              userId: context.user._id,
              count: result.nModified
            });
          }
          
          return true;
        } catch (error) {
          log.error('Error marking all notifications as seen:', error);
          throw error;
        }
      }
    }
  });

  // Return the resolvers
  return {
    Query: schemaComposer.Query.getFields(),
    Mutation: schemaComposer.Mutation.getFields()
  };
};

export default initResolvers; 