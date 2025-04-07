import { getVisionBoardTC, getMediaTC, getVisionBoardInputTC, getMediaInputTC } from './registry.js';
import mongoose from 'mongoose';
import { VisionBoard, Media } from './schemas.js';

/**
 * Initialize the resolvers for the Vision Board module
 * @returns {Object} Object containing GraphQL resolvers
 */
export const initResolvers = () => {
  // Get the type composers
  const VisionBoardTC = getVisionBoardTC();
  const MediaTC = getMediaTC();
  
  // Ensure VisionBoardTC has mongoose methods
  if (!VisionBoardTC.mongooseResolvers) {
    console.log('[Vision Board] Initializing mongoose resolvers on VisionBoardTC');
    // If mongooseResolvers not available, manually set up basic resolvers
    VisionBoardTC.mongooseResolvers = {
      findById: () => ({
        type: VisionBoardTC,
        args: { _id: 'MongoID!' },
        resolve: async (source, args) => {
          return await VisionBoard.findById(args._id);
        }
      }),
      findOne: () => ({
        type: VisionBoardTC,
        args: { filter: 'JSON' },
        resolve: async (source, args) => {
          return await VisionBoard.findOne(args.filter || {});
        }
      }),
      findMany: () => ({
        type: [VisionBoardTC],
        args: { 
          filter: 'JSON',
          limit: 'Int',
          skip: 'Int',
          sort: 'JSON'
        },
        resolve: async (source, args) => {
          let query = VisionBoard.find(args.filter || {});
          if (args.limit) query = query.limit(args.limit);
          if (args.skip) query = query.skip(args.skip);
          if (args.sort) query = query.sort(args.sort);
          return await query;
        }
      }),
      count: () => ({
        type: 'Int',
        args: { filter: 'JSON' },
        resolve: async (source, args) => {
          return await VisionBoard.countDocuments(args.filter || {});
        }
      })
    };
  }
  
  // Define queries
  const queries = {
    // Get a single vision board by ID
    visionBoardById: VisionBoardTC.mongooseResolvers.findById(),
    
    // Find one vision board based on criteria
    visionBoardOne: VisionBoardTC.mongooseResolvers.findOne(),
    
    // Get multiple vision boards with filtering and pagination
    visionBoardMany: VisionBoardTC.mongooseResolvers.findMany(),
    
    // Count vision boards
    visionBoardCount: VisionBoardTC.mongooseResolvers.count(),
    
    // Get all vision boards for a specific user
    userVisionBoards: {
      type: [VisionBoardTC],
      args: {
        userId: 'MongoID!',
        isArchived: 'Boolean',
        category: 'String'
      },
      resolve: async (source, args, context) => {
        const { userId, isArchived, category } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Build query
          const query = { userId: userObjectId };
          
          // Add optional filters
          if (typeof isArchived === 'boolean') {
            query.isArchived = isArchived;
          }
          
          if (category) {
            query['metadata.category'] = category;
          }
          
          // Fetch vision boards
          const visionBoards = await VisionBoardModel.find(query).sort({ createdAt: -1 });
          logger?.debug(`[Vision Board] Found ${visionBoards.length} vision boards for user ${userId}`);
          
          return visionBoards;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error fetching user vision boards: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Get public vision boards
    publicVisionBoards: {
      type: [VisionBoardTC],
      args: {
        limit: { type: 'Int', defaultValue: 10 },
        category: 'String'
      },
      resolve: async (source, args, context) => {
        const { limit, category } = args;
        const { models, logger } = context;
        
        try {
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Build query for public vision boards
          const query = { 
            'metadata.isPublic': true,
            isArchived: false
          };
          
          if (category) {
            query['metadata.category'] = category;
          }
          
          // Fetch public vision boards
          const visionBoards = await VisionBoardModel.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);
            
          logger?.debug(`[Vision Board] Found ${visionBoards.length} public vision boards`);
          return visionBoards;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error fetching public vision boards: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Define mutations
  const mutations = {
    // Create a new vision board
    visionBoardCreate: {
      type: VisionBoardTC,
      args: {
        userId: 'MongoID!',
        input: getVisionBoardInputTC()
      },
      resolve: async (source, args, context) => {
        const { userId, input } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Create vision board
          const visionBoard = new VisionBoardModel({
            ...input,
            userId: userObjectId
          });
          
          await visionBoard.save();
          logger?.debug(`[Vision Board] Created vision board for user ${userId}: "${input.title}"`);
          
          return visionBoard;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error creating vision board: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Update an existing vision board
    visionBoardUpdate: {
      type: VisionBoardTC,
      args: {
        id: 'MongoID!',
        input: getVisionBoardInputTC()
      },
      resolve: async (source, args, context) => {
        const { id, input } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Find vision board
          const visionBoard = await VisionBoardModel.findById(id);
          
          if (!visionBoard) {
            throw new Error(`Vision board not found: ${id}`);
          }
          
          // Security check - only allow users to update their own vision boards or if they're a collaborator
          if (currentUser) {
            const isOwner = visionBoard.userId.toString() === currentUser.id.toString();
            const isCollaborator = visionBoard.metadata?.collaborators?.some(
              collabId => collabId.toString() === currentUser.id.toString()
            );
            
            if (!isOwner && !isCollaborator) {
              throw new Error('Not authorized to update this vision board');
            }
          }
          
          // Update fields
          Object.keys(input).forEach(key => {
            // Special handling for nested fields like metadata
            if (key === 'metadata' && input.metadata) {
              if (!visionBoard.metadata) visionBoard.metadata = {};
              Object.keys(input.metadata).forEach(metaKey => {
                visionBoard.metadata[metaKey] = input.metadata[metaKey];
              });
            } else {
              visionBoard[key] = input[key];
            }
          });
          
          // Save changes
          await visionBoard.save();
          logger?.debug(`[Vision Board] Updated vision board ${id}`);
          
          return visionBoard;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error updating vision board: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Add a media item to a vision board
    visionBoardAddItem: {
      type: VisionBoardTC,
      args: {
        visionBoardId: 'MongoID!',
        item: getMediaInputTC()
      },
      resolve: async (source, args, context) => {
        const { visionBoardId, item } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Find vision board
          const visionBoard = await VisionBoardModel.findById(visionBoardId);
          
          if (!visionBoard) {
            throw new Error(`Vision board not found: ${visionBoardId}`);
          }
          
          // Security check
          if (currentUser) {
            const isOwner = visionBoard.userId.toString() === currentUser.id.toString();
            const isCollaborator = visionBoard.metadata?.collaborators?.some(
              collabId => collabId.toString() === currentUser.id.toString()
            );
            
            if (!isOwner && !isCollaborator) {
              throw new Error('Not authorized to modify this vision board');
            }
          }
          
          // Add new item
          if (!visionBoard.items) visionBoard.items = [];
          visionBoard.items.push(item);
          
          // Save changes
          await visionBoard.save();
          logger?.debug(`[Vision Board] Added item to vision board ${visionBoardId}`);
          
          return visionBoard;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error adding item to vision board: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Remove a media item from a vision board
    visionBoardRemoveItem: {
      type: VisionBoardTC,
      args: {
        visionBoardId: 'MongoID!',
        itemId: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { visionBoardId, itemId } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Find vision board
          const visionBoard = await VisionBoardModel.findById(visionBoardId);
          
          if (!visionBoard) {
            throw new Error(`Vision board not found: ${visionBoardId}`);
          }
          
          // Security check
          if (currentUser) {
            const isOwner = visionBoard.userId.toString() === currentUser.id.toString();
            const isCollaborator = visionBoard.metadata?.collaborators?.some(
              collabId => collabId.toString() === currentUser.id.toString()
            );
            
            if (!isOwner && !isCollaborator) {
              throw new Error('Not authorized to modify this vision board');
            }
          }
          
          // Remove item by id
          if (visionBoard.items && visionBoard.items.length > 0) {
            visionBoard.items = visionBoard.items.filter(item => item._id.toString() !== itemId);
          }
          
          // Save changes
          await visionBoard.save();
          logger?.debug(`[Vision Board] Removed item ${itemId} from vision board ${visionBoardId}`);
          
          return visionBoard;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error removing item from vision board: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Archive/unarchive a vision board
    visionBoardToggleArchive: {
      type: VisionBoardTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Find vision board
          const visionBoard = await VisionBoardModel.findById(id);
          
          if (!visionBoard) {
            throw new Error(`Vision board not found: ${id}`);
          }
          
          // Security check - only owners can archive/unarchive
          if (currentUser && visionBoard.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to archive/unarchive this vision board');
          }
          
          // Toggle archived status
          visionBoard.isArchived = !visionBoard.isArchived;
          
          // Save changes
          await visionBoard.save();
          logger?.debug(`[Vision Board] Toggled archive status for vision board ${id} to ${visionBoard.isArchived}`);
          
          return visionBoard;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error toggling archive status: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Delete a vision board
    visionBoardDelete: {
      type: VisionBoardTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the VisionBoard model from context or import directly
          const VisionBoardModel = models?.VisionBoard || mongoose.model('VisionBoard');
          
          // Find vision board
          const visionBoard = await VisionBoardModel.findById(id);
          
          if (!visionBoard) {
            throw new Error(`Vision board not found: ${id}`);
          }
          
          // Security check - only owners can delete
          if (currentUser && visionBoard.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to delete this vision board');
          }
          
          // Delete vision board
          await VisionBoardModel.deleteOne({ _id: id });
          logger?.debug(`[Vision Board] Deleted vision board ${id}`);
          
          return visionBoard;
        } catch (error) {
          logger?.error(`[Vision Board Resolver] Error deleting vision board: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Return resolvers in standard format
  return {
    Query: queries,
    Mutation: mutations
  };
};

export default {
  initResolvers
}; 