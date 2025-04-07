import mongoose from 'mongoose';

/**
 * Create a new vision board
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.userId - The user ID
 * @param {string} params.title - The vision board title
 * @param {string} [params.description] - Optional description
 * @param {Object} [params.metadata] - Optional metadata
 * @returns {Promise<Object>} The created vision board
 */
export async function createVisionBoard(ctx, params) {
  const { userId, title, description = '', metadata = {} } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!userId) throw new Error('User ID is required');
    if (!title) throw new Error('Title is required');
    
    // Use model from context or directly
    const VisionBoard = models?.VisionBoard || mongoose.model('VisionBoard');
    
    // Create new vision board
    const visionBoard = new VisionBoard({
      userId,
      title,
      description,
      items: [],
      metadata: {
        ...metadata,
        theme: metadata.theme || 'default',
        isPublic: metadata.isPublic || false,
        category: metadata.category || 'personal'
      }
    });
    
    // Save to database
    await visionBoard.save();
    logger?.debug(`Created vision board "${title}" for user ${userId}`);
    
    return visionBoard;
  } catch (error) {
    logger?.error(`Error creating vision board: ${error.message}`);
    throw error;
  }
}

/**
 * Add an item to a vision board
 * @param {Object} ctx - Application context
 * @param {Object} params - Function parameters
 * @param {string} params.visionBoardId - The vision board ID
 * @param {string} params.mediaType - Type of media ('image', 'video', 'text', 'url')
 * @param {string} params.url - URL of the media
 * @param {string} [params.title] - Optional title for the media
 * @param {string} [params.description] - Optional description
 * @param {Object} [params.position] - Position data (x, y, width, height, zIndex)
 * @returns {Promise<Object>} The updated vision board
 */
export async function addVisionBoardItem(ctx, params) {
  const { visionBoardId, mediaType, url, title = '', description = '', position = {} } = params;
  const { models, logger } = ctx;
  
  try {
    // Validate inputs
    if (!visionBoardId) throw new Error('Vision board ID is required');
    if (!mediaType) throw new Error('Media type is required');
    if (!url) throw new Error('URL is required');
    
    // Use model from context or directly
    const VisionBoard = models?.VisionBoard || mongoose.model('VisionBoard');
    
    // Find vision board
    const visionBoard = await VisionBoard.findById(visionBoardId);
    if (!visionBoard) throw new Error(`Vision board not found: ${visionBoardId}`);
    
    // Create new media item
    const mediaItem = {
      type: mediaType,
      url,
      title,
      description,
      position: {
        x: position.x || 0,
        y: position.y || 0,
        width: position.width || 200,
        height: position.height || 200,
        zIndex: position.zIndex || (visionBoard.items.length + 1)
      }
    };
    
    // Add to vision board
    visionBoard.items.push(mediaItem);
    
    // Save changes
    await visionBoard.save();
    logger?.debug(`Added ${mediaType} item to vision board ${visionBoardId}`);
    
    return visionBoard;
  } catch (error) {
    logger?.error(`Error adding item to vision board: ${error.message}`);
    throw error;
  }
}

export default {
  createVisionBoard,
  addVisionBoardItem
}; 