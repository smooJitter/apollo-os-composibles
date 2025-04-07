import { schemaComposer } from 'graphql-compose';
import { 
  getAIConversationTC, 
  getCreateConversationInputTC, 
  getUpdateConversationInputTC,
  getAddInteractionInputTC,
  getCompleteInteractionInputTC,
  getFeedbackInputTC,
  getFilterInputTC
} from './registry.js';
import { AIConversation } from './schemas.js';
import { CONVERSATION_EVENTS } from './constants.js';
import mongoose from 'mongoose';

export const initResolvers = (ctx) => {
  const log = ctx.logger.child({ module: 'ai-conversation-resolvers' });

  // Get type composers
  const AIConversationTC = getAIConversationTC();
  const CreateConversationInputTC = getCreateConversationInputTC();
  const UpdateConversationInputTC = getUpdateConversationInputTC();
  const AddInteractionInputTC = getAddInteractionInputTC();
  const CompleteInteractionInputTC = getCompleteInteractionInputTC();
  const FeedbackInputTC = getFeedbackInputTC();
  const FilterInputTC = getFilterInputTC();

  // Query Resolvers
  schemaComposer.Query.addFields({
    // Get conversation by ID
    aiConversationById: AIConversationTC.getResolver('findById')
      .wrapResolve(next => async rp => {
        // Validate user has access
        if (!rp.context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        const result = await next(rp);
        
        // Ensure user only sees their own conversations
        if (result && result.userId.toString() !== rp.context.user._id.toString()) {
          throw new Error('You do not have access to this conversation');
        }
        
        return result;
      }),

    // Get conversation by session ID
    aiConversationBySessionId: {
      type: AIConversationTC,
      args: {
        sessionId: 'String!'
      },
      resolve: async (_, { sessionId }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        try {
          const conversation = await AIConversation.findOne({
            sessionId,
            userId: context.user._id,
            isActive: true
          });
          
          if (!conversation) {
            throw new Error('Conversation not found');
          }
          
          return conversation;
        } catch (error) {
          log.error('Error finding conversation by sessionId:', error);
          throw error;
        }
      }
    },

    // Get conversations for current user
    myConversations: AIConversationTC.mongooseResolvers
      .findMany({ 
        filter: {
          onlyIndexed: true,
          isActive: true
        },
        sort: { lastInteraction: -1 }
      })
      .withArgs({
        filter: FilterInputTC,
        limit: 'Int',
        skip: 'Int'
      })
      .wrapResolve(next => async rp => {
        // Validate user is logged in
        if (!rp.context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        // Set userId filter to current user
        const filter = {
          ...rp.args.filter,
          userId: rp.context.user._id
        };
        
        // Handle additional filter parameters
        if (filter.searchQuery) {
          filter.$or = [
            { title: { $regex: filter.searchQuery, $options: 'i' } },
            { summary: { $regex: filter.searchQuery, $options: 'i' } },
            { 'interactions.message': { $regex: filter.searchQuery, $options: 'i' } },
            { 'interactions.response': { $regex: filter.searchQuery, $options: 'i' } }
          ];
          delete filter.searchQuery;
        }
        
        if (filter.startDate) {
          filter.start = { $gte: filter.startDate };
          delete filter.startDate;
        }
        
        if (filter.endDate) {
          filter.start = { ...filter.start, $lte: filter.endDate };
          delete filter.endDate;
        }
        
        if (filter.hasUserFeedback !== undefined) {
          if (filter.hasUserFeedback) {
            filter['metadata.userFeedback.rating'] = { $exists: true };
          } else {
            filter['metadata.userFeedback.rating'] = { $exists: false };
          }
          delete filter.hasUserFeedback;
        }
        
        rp.args.filter = filter;
        
        return next(rp);
      }),
    
    // Get conversation stats for current user
    myConversationStats: {
      type: 'JSON',
      args: {
        timeframe: {
          type: 'String',
          description: 'Timeframe for stats (day, week, month, year, all)',
          defaultValue: 'all'
        }
      },
      resolve: async (_, { timeframe }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        try {
          const userId = context.user._id;
          
          // Set date filter based on timeframe
          const dateFilter = {};
          const now = new Date();
          
          if (timeframe === 'day') {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            dateFilter.start = { $gte: startOfDay };
          } else if (timeframe === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            dateFilter.start = { $gte: startOfWeek };
          } else if (timeframe === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter.start = { $gte: startOfMonth };
          } else if (timeframe === 'year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            dateFilter.start = { $gte: startOfYear };
          }
          
          // Get total conversation count
          const totalCount = await AIConversation.countDocuments({
            userId,
            isActive: true,
            ...dateFilter
          });
          
          // Get counts by type
          const typeStats = await AIConversation.aggregate([
            { 
              $match: { 
                userId: mongoose.Types.ObjectId(userId),
                isActive: true,
                ...(dateFilter.start ? { start: dateFilter.start } : {})
              } 
            },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]);
          
          // Get interaction counts
          const interactionCounts = await AIConversation.aggregate([
            { 
              $match: { 
                userId: mongoose.Types.ObjectId(userId),
                isActive: true,
                ...(dateFilter.start ? { start: dateFilter.start } : {})
              } 
            },
            { $project: { interactionCount: { $size: '$interactions' } } },
            { 
              $group: { 
                _id: null, 
                totalInteractions: { $sum: '$interactionCount' },
                averagePerConversation: { $avg: '$interactionCount' },
                maxInteractions: { $max: '$interactionCount' }
              } 
            }
          ]);
          
          // Calculate average duration
          const durationData = await AIConversation.aggregate([
            { 
              $match: { 
                userId: mongoose.Types.ObjectId(userId),
                isActive: true,
                lastInteraction: { $exists: true },
                ...(dateFilter.start ? { start: dateFilter.start } : {})
              } 
            },
            { 
              $project: { 
                durationMs: { $subtract: ['$lastInteraction', '$start'] }
              } 
            },
            { 
              $group: { 
                _id: null, 
                averageDuration: { $avg: '$durationMs' },
                totalDuration: { $sum: '$durationMs' }
              } 
            }
          ]);
          
          // Get feedback stats
          const feedbackStats = await AIConversation.aggregate([
            { 
              $match: { 
                userId: mongoose.Types.ObjectId(userId),
                isActive: true,
                'metadata.userFeedback.rating': { $exists: true },
                ...(dateFilter.start ? { start: dateFilter.start } : {})
              } 
            },
            { 
              $group: { 
                _id: null, 
                averageRating: { $avg: '$metadata.userFeedback.rating' },
                ratingCount: { $sum: 1 }
              } 
            }
          ]);
          
          return {
            totalConversations: totalCount,
            byType: typeStats.reduce((acc, type) => {
              acc[type._id] = type.count;
              return acc;
            }, {}),
            interactions: interactionCounts.length > 0 ? {
              total: interactionCounts[0].totalInteractions,
              averagePerConversation: Math.round(interactionCounts[0].averagePerConversation * 10) / 10,
              max: interactionCounts[0].maxInteractions
            } : { total: 0, averagePerConversation: 0, max: 0 },
            duration: durationData.length > 0 ? {
              averageMinutes: Math.round((durationData[0].averageDuration / 60000) * 10) / 10,
              totalHours: Math.round((durationData[0].totalDuration / 3600000) * 10) / 10
            } : { averageMinutes: 0, totalHours: 0 },
            feedback: feedbackStats.length > 0 ? {
              averageRating: Math.round(feedbackStats[0].averageRating * 10) / 10,
              count: feedbackStats[0].ratingCount,
              percentage: Math.round((feedbackStats[0].ratingCount / totalCount) * 100)
            } : { averageRating: 0, count: 0, percentage: 0 },
            timeframe
          };
        } catch (error) {
          log.error('Error getting conversation stats:', error);
          throw error;
        }
      }
    },
    
    // Search conversations
    searchConversations: {
      type: [AIConversationTC],
      args: {
        searchQuery: 'String!',
        limit: {
          type: 'Int',
          defaultValue: 20
        },
        skip: {
          type: 'Int',
          defaultValue: 0
        }
      },
      resolve: async (_, { searchQuery, limit, skip }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in to access this resource');
        }
        
        try {
          const userId = context.user._id;
          
          const conversations = await AIConversation.find({
            userId,
            isActive: true,
            $or: [
              { title: { $regex: searchQuery, $options: 'i' } },
              { summary: { $regex: searchQuery, $options: 'i' } },
              { 'interactions.message': { $regex: searchQuery, $options: 'i' } },
              { 'interactions.response': { $regex: searchQuery, $options: 'i' } },
              { 'metadata.tags': { $regex: searchQuery, $options: 'i' } }
            ]
          })
          .sort({ lastInteraction: -1 })
          .skip(skip)
          .limit(limit);
          
          return conversations;
        } catch (error) {
          log.error('Error searching conversations:', error);
          throw error;
        }
      }
    }
  });

  // Mutation Resolvers
  schemaComposer.Mutation.addFields({
    // Create a new conversation
    createAIConversation: {
      type: AIConversationTC,
      args: {
        input: CreateConversationInputTC
      },
      resolve: async (_, { input }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in to create a conversation');
        }
        
        try {
          // Create the conversation
          const userId = context.user._id.toString();
          const conversation = new AIConversation({
            userId,
            title: input.title || 'New Conversation',
            type: input.type,
            model: input.model,
            metadata: input.metadata || {},
            start: new Date(),
            lastInteraction: new Date()
          });
          
          // Add initial message if provided
          if (input.initialMessage) {
            conversation.interactions.push({
              message: input.initialMessage,
              timestamp: new Date(),
              status: 'Completed'
            });
          }
          
          await conversation.save();
          
          log.info(`Created new AI conversation for user ${userId}`);
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit(CONVERSATION_EVENTS.CONVERSATION_CREATED, {
              conversation,
              userId
            });
          }
          
          return conversation;
        } catch (error) {
          log.error('Error creating AI conversation:', error);
          throw error;
        }
      }
    },
    
    // Update a conversation
    updateAIConversation: {
      type: AIConversationTC,
      args: {
        id: 'MongoID!',
        input: UpdateConversationInputTC
      },
      resolve: async (_, { id, input }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the conversation
          const conversation = await AIConversation.findById(id);
          
          if (!conversation) {
            throw new Error('Conversation not found');
          }
          
          // Ensure user has permission
          if (conversation.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to update this conversation');
          }
          
          // Update fields
          if (input.title !== undefined) conversation.title = input.title;
          if (input.type !== undefined) conversation.type = input.type;
          if (input.isArchived !== undefined) conversation.isArchived = input.isArchived;
          
          // Update metadata
          if (input.metadata) {
            conversation.metadata = {
              ...conversation.metadata,
              ...input.metadata
            };
          }
          
          await conversation.save();
          
          log.info(`Updated AI conversation ${id}`);
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit(CONVERSATION_EVENTS.CONVERSATION_UPDATED, {
              conversation,
              userId: conversation.userId
            });
          }
          
          return conversation;
        } catch (error) {
          log.error('Error updating AI conversation:', error);
          throw error;
        }
      }
    },
    
    // Add an interaction to a conversation
    addInteraction: {
      type: AIConversationTC,
      args: {
        conversationId: 'MongoID!',
        input: AddInteractionInputTC
      },
      resolve: async (_, { conversationId, input }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the conversation
          const conversation = await AIConversation.findById(conversationId);
          
          if (!conversation) {
            throw new Error('Conversation not found');
          }
          
          // Ensure user has permission
          if (conversation.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to update this conversation');
          }
          
          // Add the interaction
          const interactionData = {
            message: input.message,
            messageType: input.messageType || 'Statement',
            timestamp: new Date(),
            status: 'Pending'
          };
          
          conversation.interactions.push(interactionData);
          conversation.lastInteraction = interactionData.timestamp;
          
          await conversation.save();
          
          // Get the newly added interaction
          const newInteraction = conversation.interactions[conversation.interactions.length - 1];
          
          log.info(`Added interaction to AI conversation ${conversationId}`);
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit(CONVERSATION_EVENTS.INTERACTION_ADDED, {
              conversation,
              interaction: newInteraction,
              userId: conversation.userId
            });
          }
          
          return conversation;
        } catch (error) {
          log.error('Error adding interaction:', error);
          throw error;
        }
      }
    },
    
    // Complete an interaction with AI response
    completeInteraction: {
      type: AIConversationTC,
      args: {
        conversationId: 'MongoID!',
        interactionId: 'MongoID!',
        input: CompleteInteractionInputTC
      },
      resolve: async (_, { conversationId, interactionId, input }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the conversation
          const conversation = await AIConversation.findById(conversationId);
          
          if (!conversation) {
            throw new Error('Conversation not found');
          }
          
          // Ensure user has permission
          if (conversation.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to update this conversation');
          }
          
          // Find the interaction
          const interaction = conversation.interactions.id(interactionId);
          
          if (!interaction) {
            throw new Error('Interaction not found');
          }
          
          // Update the interaction with response data
          interaction.response = input.response;
          interaction.status = 'Completed';
          
          // Update response metadata
          interaction.responseMetadata = {
            model: input.model || conversation.model,
            tokens: {
              prompt: input.promptTokens || 0,
              completion: input.completionTokens || 0,
              total: (input.promptTokens || 0) + (input.completionTokens || 0)
            },
            processingTime: input.processingTime || 0,
            aiSettings: input.aiSettings || {}
          };
          
          conversation.lastInteraction = new Date();
          
          await conversation.save();
          
          log.info(`Completed interaction in AI conversation ${conversationId}`);
          
          return conversation;
        } catch (error) {
          log.error('Error completing interaction:', error);
          throw error;
        }
      }
    },
    
    // Add feedback to a conversation
    addConversationFeedback: {
      type: AIConversationTC,
      args: {
        conversationId: 'MongoID!',
        input: FeedbackInputTC
      },
      resolve: async (_, { conversationId, input }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the conversation
          const conversation = await AIConversation.findById(conversationId);
          
          if (!conversation) {
            throw new Error('Conversation not found');
          }
          
          // Ensure user has permission
          if (conversation.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to update this conversation');
          }
          
          // Add feedback
          if (!conversation.metadata) conversation.metadata = {};
          
          conversation.metadata.userFeedback = {
            rating: input.rating,
            comments: input.comments,
            submittedAt: new Date()
          };
          
          await conversation.save();
          
          log.info(`Added feedback to AI conversation ${conversationId}`);
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit(CONVERSATION_EVENTS.USER_FEEDBACK_ADDED, {
              conversation,
              feedback: conversation.metadata.userFeedback,
              userId: conversation.userId
            });
          }
          
          return conversation;
        } catch (error) {
          log.error('Error adding feedback:', error);
          throw error;
        }
      }
    },
    
    // Archive a conversation
    archiveConversation: {
      type: AIConversationTC,
      args: {
        conversationId: 'MongoID!'
      },
      resolve: async (_, { conversationId }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the conversation
          const conversation = await AIConversation.findById(conversationId);
          
          if (!conversation) {
            throw new Error('Conversation not found');
          }
          
          // Ensure user has permission
          if (conversation.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to archive this conversation');
          }
          
          // Archive the conversation
          conversation.isArchived = true;
          await conversation.save();
          
          log.info(`Archived AI conversation ${conversationId}`);
          
          // Emit event through event bus
          if (context.eventBus) {
            context.eventBus.emit(CONVERSATION_EVENTS.CONVERSATION_ARCHIVED, {
              conversation,
              userId: conversation.userId
            });
          }
          
          return conversation;
        } catch (error) {
          log.error('Error archiving conversation:', error);
          throw error;
        }
      }
    },
    
    // Generate summary for a conversation
    generateConversationSummary: {
      type: AIConversationTC,
      args: {
        conversationId: 'MongoID!'
      },
      resolve: async (_, { conversationId }, context) => {
        // Validate user is logged in
        if (!context.user) {
          throw new Error('You must be logged in');
        }
        
        try {
          // Find the conversation
          const conversation = await AIConversation.findById(conversationId);
          
          if (!conversation) {
            throw new Error('Conversation not found');
          }
          
          // Ensure user has permission
          if (conversation.userId.toString() !== context.user._id.toString()) {
            throw new Error('You do not have permission to update this conversation');
          }
          
          // Generate the summary
          // This would typically call an AI service, but for now we use the simple method
          await conversation.generateSummary();
          
          log.info(`Generated summary for AI conversation ${conversationId}`);
          
          return conversation;
        } catch (error) {
          log.error('Error generating conversation summary:', error);
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