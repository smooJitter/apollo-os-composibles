import mongoose from 'mongoose';
import { Manifestation } from '../schemas.js';
import { STATE_ENUMS, STATE_TRANSITIONS } from '../constants.js';

/**
 * Create a new manifestation for a user
 * 
 * @param {Object} ctx - Application context
 * @param {Object} params - Manifestation parameters
 * @param {String} params.userId - User ID
 * @param {String} params.title - Manifestation title
 * @param {String} params.description - Manifestation description
 * @param {String} params.manifestationType - Type of manifestation
 * @param {String} params.timeframe - Timeframe (short_term, medium_term, long_term)
 * @param {Object} params.intention - Intention details
 * @param {Date} params.targetDate - Target date for manifestation
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} - Created manifestation
 */
export const createManifestation = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'manifestation-actions', action: 'createManifestation' });
  
  try {
    // Validate required fields
    if (!params.userId) throw new Error('User ID is required');
    if (!params.title) throw new Error('Title is required');
    if (!params.manifestationType) throw new Error('Manifestation type is required');

    logger.debug('Creating manifestation for user', {
      userId: params.userId,
      title: params.title,
      type: params.manifestationType
    });

    // Create the manifestation with initial state
    const manifestation = new Manifestation({
      userId: params.userId,
      title: params.title,
      description: params.description,
      manifestationType: params.manifestationType,
      timeframe: params.timeframe || 'medium_term',
      state: params.state || 'visioning',
      intention: params.intention || {},
      targetDate: params.targetDate,
      metadata: params.metadata || {},
      affirmations: params.affirmations || [],
      evidence: [],
      relatedMilestones: params.relatedMilestones || [],
      relatedHabits: params.relatedHabits || []
    });

    // Save to database
    await manifestation.save();
    
    // Emit event
    if (ctx.events) {
      ctx.events.emit('manifestation:created', {
        userId: params.userId,
        manifestationId: manifestation._id,
        manifestation
      });
    }

    logger.info('Manifestation created successfully', {
      manifestationId: manifestation._id.toString()
    });

    return manifestation;
  } catch (error) {
    logger.error('Error creating manifestation', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

/**
 * Update a manifestation's state with optional note
 * 
 * @param {Object} ctx - Application context
 * @param {Object} params - Update parameters
 * @param {String} params.userId - User ID
 * @param {String} params.manifestationId - Manifestation ID
 * @param {String} params.state - New state
 * @param {String} params.stateNote - Optional note about state change
 * @returns {Promise<Object>} - Updated manifestation
 */
export const updateManifestationState = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'manifestation-actions', action: 'updateManifestationState' });
  
  try {
    // Validate required fields
    if (!params.userId) throw new Error('User ID is required');
    if (!params.manifestationId) throw new Error('Manifestation ID is required');
    if (!params.state) throw new Error('State is required');
    
    // Validate state
    if (!STATE_ENUMS.includes(params.state)) {
      throw new Error(`Invalid state: ${params.state}. Valid states are: ${STATE_ENUMS.join(', ')}`);
    }

    // Find manifestation
    const manifestation = await Manifestation.findOne({
      _id: params.manifestationId,
      userId: params.userId
    });
    
    if (!manifestation) {
      throw new Error('Manifestation not found or access denied');
    }
    
    // Check if transition is allowed
    const currentState = manifestation.state;
    const targetState = params.state;
    
    if (currentState === targetState) {
      logger.info('Manifestation already in requested state', {
        manifestationId: manifestation._id.toString(),
        state: currentState
      });
      return manifestation;
    }
    
    // Check if this transition is allowed
    if (!manifestation.canTransitionTo(targetState)) {
      throw new Error(`Cannot transition from ${currentState} to ${targetState}`);
    }
    
    // Update state
    await manifestation.setState(targetState, params.stateNote);
    
    // If manifested, set manifestedDate
    if (targetState === 'manifested' && !manifestation.manifestedDate) {
      manifestation.manifestedDate = new Date();
    }
    
    await manifestation.save();
    
    // Emit event
    if (ctx.events) {
      ctx.events.emit('manifestation:stateChanged', {
        userId: params.userId,
        manifestationId: manifestation._id,
        previousState: currentState,
        newState: targetState,
        stateNote: params.stateNote
      });
    }
    
    logger.info('Manifestation state updated', {
      manifestationId: manifestation._id.toString(),
      from: currentState,
      to: targetState
    });
    
    return manifestation;
  } catch (error) {
    logger.error('Error updating manifestation state', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

/**
 * Add evidence to a manifestation
 * 
 * @param {Object} ctx - Application context
 * @param {Object} params - Evidence parameters
 * @param {String} params.userId - User ID
 * @param {String} params.manifestationId - Manifestation ID
 * @param {String} params.title - Evidence title
 * @param {String} params.description - Evidence description
 * @param {String} params.mediaUrl - Optional URL to media
 * @param {String} params.mediaType - Type of media (image, video, etc)
 * @returns {Promise<Object>} - Updated manifestation
 */
export const addManifestationEvidence = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'manifestation-actions', action: 'addManifestationEvidence' });
  
  try {
    // Validate required fields
    if (!params.userId) throw new Error('User ID is required');
    if (!params.manifestationId) throw new Error('Manifestation ID is required');
    if (!params.title) throw new Error('Evidence title is required');

    // Find manifestation
    const manifestation = await Manifestation.findOne({
      _id: params.manifestationId,
      userId: params.userId
    });
    
    if (!manifestation) {
      throw new Error('Manifestation not found or access denied');
    }
    
    // Create evidence entry
    const evidenceEntry = {
      title: params.title,
      description: params.description || '',
      date: new Date(),
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType
    };
    
    // Use the schema method to add evidence
    const result = manifestation.addEvidence(evidenceEntry);
    
    await manifestation.save();
    
    // Emit event
    if (ctx.events) {
      ctx.events.emit('manifestation:evidenceAdded', {
        userId: params.userId,
        manifestationId: manifestation._id,
        evidence: evidenceEntry
      });
      
      // If the method suggests a state change, emit additional event
      if (result && result.suggestStateChange) {
        ctx.events.emit('manifestation:stateChangeSuggested', {
          userId: params.userId,
          manifestationId: manifestation._id,
          currentState: manifestation.state,
          suggestedState: result.suggestStateChange,
          reason: result.message
        });
      }
    }
    
    logger.info('Added evidence to manifestation', {
      manifestationId: manifestation._id.toString(),
      evidenceTitle: params.title
    });
    
    return manifestation;
  } catch (error) {
    logger.error('Error adding manifestation evidence', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

/**
 * Add an affirmation to a manifestation
 * 
 * @param {Object} ctx - Application context
 * @param {Object} params - Affirmation parameters
 * @param {String} params.userId - User ID
 * @param {String} params.manifestationId - Manifestation ID
 * @param {String} params.text - Affirmation text
 * @param {Boolean} params.isPrimary - Whether this is the primary affirmation
 * @returns {Promise<Object>} - Updated manifestation
 */
export const addManifestationAffirmation = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'manifestation-actions', action: 'addManifestationAffirmation' });
  
  try {
    // Validate required fields
    if (!params.userId) throw new Error('User ID is required');
    if (!params.manifestationId) throw new Error('Manifestation ID is required');
    if (!params.text) throw new Error('Affirmation text is required');

    // Find manifestation
    const manifestation = await Manifestation.findOne({
      _id: params.manifestationId,
      userId: params.userId
    });
    
    if (!manifestation) {
      throw new Error('Manifestation not found or access denied');
    }
    
    // Use the schema method to add affirmation
    manifestation.addAffirmation(
      params.text, 
      params.isPrimary || false
    );
    
    await manifestation.save();
    
    // Emit event
    if (ctx.events) {
      ctx.events.emit('manifestation:affirmationAdded', {
        userId: params.userId,
        manifestationId: manifestation._id,
        affirmation: params.text,
        isPrimary: params.isPrimary
      });
    }
    
    logger.info('Added affirmation to manifestation', {
      manifestationId: manifestation._id.toString(),
      isPrimary: params.isPrimary || false
    });
    
    return manifestation;
  } catch (error) {
    logger.error('Error adding manifestation affirmation', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

/**
 * Link milestones to a manifestation
 * 
 * @param {Object} ctx - Application context
 * @param {Object} params - Parameters
 * @param {String} params.userId - User ID
 * @param {String} params.manifestationId - Manifestation ID
 * @param {Array<String>} params.milestoneIds - Array of milestone IDs to link
 * @returns {Promise<Object>} - Updated manifestation
 */
export const linkMilestonesToManifestation = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'manifestation-actions', action: 'linkMilestonesToManifestation' });
  
  try {
    // Validate required fields
    if (!params.userId) throw new Error('User ID is required');
    if (!params.manifestationId) throw new Error('Manifestation ID is required');
    if (!params.milestoneIds || !Array.isArray(params.milestoneIds) || params.milestoneIds.length === 0) {
      throw new Error('At least one milestone ID is required');
    }

    // Find manifestation
    const manifestation = await Manifestation.findOne({
      _id: params.manifestationId,
      userId: params.userId
    });
    
    if (!manifestation) {
      throw new Error('Manifestation not found or access denied');
    }
    
    // Initialize related milestones array if not exists
    if (!manifestation.relatedMilestones) {
      manifestation.relatedMilestones = [];
    }
    
    // Add new milestone IDs (avoid duplicates)
    params.milestoneIds.forEach(milestoneId => {
      if (!manifestation.relatedMilestones.some(id => id.toString() === milestoneId)) {
        manifestation.relatedMilestones.push(mongoose.Types.ObjectId(milestoneId));
      }
    });
    
    await manifestation.save();
    
    // Emit event
    if (ctx.events) {
      ctx.events.emit('manifestation:milestonesLinked', {
        userId: params.userId,
        manifestationId: manifestation._id,
        milestoneIds: params.milestoneIds
      });
    }
    
    logger.info('Linked milestones to manifestation', {
      manifestationId: manifestation._id.toString(),
      milestoneCount: manifestation.relatedMilestones.length
    });
    
    return manifestation;
  } catch (error) {
    logger.error('Error linking milestones to manifestation', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

/**
 * Link habits to a manifestation
 * 
 * @param {Object} ctx - Application context
 * @param {Object} params - Parameters
 * @param {String} params.userId - User ID
 * @param {String} params.manifestationId - Manifestation ID
 * @param {Array<String>} params.habitIds - Array of habit IDs to link
 * @returns {Promise<Object>} - Updated manifestation
 */
export const linkHabitsToManifestation = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'manifestation-actions', action: 'linkHabitsToManifestation' });
  
  try {
    // Validate required fields
    if (!params.userId) throw new Error('User ID is required');
    if (!params.manifestationId) throw new Error('Manifestation ID is required');
    if (!params.habitIds || !Array.isArray(params.habitIds) || params.habitIds.length === 0) {
      throw new Error('At least one habit ID is required');
    }

    // Find manifestation
    const manifestation = await Manifestation.findOne({
      _id: params.manifestationId,
      userId: params.userId
    });
    
    if (!manifestation) {
      throw new Error('Manifestation not found or access denied');
    }
    
    // Initialize related habits array if not exists
    if (!manifestation.relatedHabits) {
      manifestation.relatedHabits = [];
    }
    
    // Add new habit IDs (avoid duplicates)
    params.habitIds.forEach(habitId => {
      if (!manifestation.relatedHabits.some(id => id.toString() === habitId)) {
        manifestation.relatedHabits.push(mongoose.Types.ObjectId(habitId));
      }
    });
    
    await manifestation.save();
    
    // Emit event
    if (ctx.events) {
      ctx.events.emit('manifestation:habitsLinked', {
        userId: params.userId,
        manifestationId: manifestation._id,
        habitIds: params.habitIds
      });
    }
    
    logger.info('Linked habits to manifestation', {
      manifestationId: manifestation._id.toString(),
      habitCount: manifestation.relatedHabits.length
    });
    
    return manifestation;
  } catch (error) {
    logger.error('Error linking habits to manifestation', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

/**
 * Get all manifestations for a user with optional filtering
 * 
 * @param {Object} ctx - Application context
 * @param {Object} params - Query parameters
 * @param {String} params.userId - User ID
 * @param {Array<String>} params.states - Optional states to filter by
 * @param {Array<String>} params.types - Optional types to filter by
 * @param {Array<String>} params.timeframes - Optional timeframes to filter by
 * @param {Boolean} params.isFeatured - Optional filter for featured manifestations
 * @param {Number} params.limit - Optional limit of results
 * @param {Number} params.skip - Optional number of results to skip
 * @param {String} params.sortBy - Optional field to sort by
 * @param {String} params.sortOrder - Optional sort order ('asc' or 'desc')
 * @returns {Promise<Array>} - Array of manifestations
 */
export const getUserManifestations = async (ctx, params) => {
  const logger = ctx.logger.child({ module: 'manifestation-actions', action: 'getUserManifestations' });
  
  try {
    // Validate required fields
    if (!params.userId) throw new Error('User ID is required');

    // Build query
    const query = { userId: params.userId };
    
    // Apply filters
    if (params.states && Array.isArray(params.states) && params.states.length > 0) {
      query.state = { $in: params.states };
    }
    
    if (params.types && Array.isArray(params.types) && params.types.length > 0) {
      query.manifestationType = { $in: params.types };
    }
    
    if (params.timeframes && Array.isArray(params.timeframes) && params.timeframes.length > 0) {
      query.timeframe = { $in: params.timeframes };
    }
    
    if (params.isFeatured !== undefined) {
      query['metadata.isFeatured'] = params.isFeatured;
    }
    
    // Set query options
    const options = {};
    
    // Pagination
    if (params.limit) options.limit = parseInt(params.limit);
    if (params.skip) options.skip = parseInt(params.skip);
    
    // Sorting
    if (params.sortBy) {
      options.sort = {
        [params.sortBy]: params.sortOrder === 'desc' ? -1 : 1
      };
    } else {
      // Default sort by creation date, newest first
      options.sort = { createdAt: -1 };
    }
    
    // Execute query
    const manifestations = await Manifestation.find(query, null, options);
    
    logger.info('Retrieved user manifestations', {
      userId: params.userId,
      count: manifestations.length,
      filters: {
        states: params.states,
        types: params.types,
        timeframes: params.timeframes,
        isFeatured: params.isFeatured
      }
    });
    
    return manifestations;
  } catch (error) {
    logger.error('Error getting user manifestations', {
      error: error.message,
      stack: error.stack,
      params
    });
    throw error;
  }
};

// Export all actions
export default {
  createManifestation,
  updateManifestationState,
  addManifestationEvidence,
  addManifestationAffirmation,
  linkMilestonesToManifestation,
  linkHabitsToManifestation,
  getUserManifestations
}; 