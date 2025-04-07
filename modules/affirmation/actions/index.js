/**
 * Affirmation actions
 * Provides business logic for affirmation operations
 */

// Create a new affirmation
export const createAffirmation = async (data, context) => {
  const { models, logger } = context;
  
  try {
    const affirmation = new models.Affirmation({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await affirmation.save();
    logger?.debug(`[Affirmation Action] Created affirmation: ${affirmation.text.substring(0, 20)}...`);
    
    return affirmation;
  } catch (error) {
    logger?.error(`[Affirmation Action] Error creating affirmation: ${error.message}`);
    throw error;
  }
};

// Get active affirmations for a specific user
export const getUserAffirmations = async (userId, filters, context) => {
  const { models, logger } = context;
  
  try {
    // Build query
    const query = { userId };
    
    // Add optional filters
    if (filters) {
      if (typeof filters.isActive === 'boolean') {
        query.isActive = filters.isActive;
      }
      
      if (filters.category) {
        query.category = filters.category;
      }
    }
    
    const affirmations = await models.Affirmation.find(query).sort({ createdAt: -1 });
    logger?.debug(`[Affirmation Action] Retrieved ${affirmations.length} affirmations for user ${userId}`);
    
    return affirmations;
  } catch (error) {
    logger?.error(`[Affirmation Action] Error retrieving affirmations: ${error.message}`);
    throw error;
  }
};

// Get today's affirmations for a user based on frequency settings
export const getTodaysAffirmations = async (userId, context) => {
  const { models, logger } = context;
  
  try {
    // Get current day info
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayOfMonth = now.getDate();
    
    // Build query for appropriate frequency
    const affirmations = await models.Affirmation.find({
      userId,
      isActive: true,
      $or: [
        { reminderFrequency: 'daily' },
        { reminderFrequency: 'weekdays', $expr: { $not: isWeekend } },
        { reminderFrequency: 'weekends', $expr: isWeekend },
        { reminderFrequency: 'weekly', $expr: { $eq: [dayOfWeek, 1] } }, // Mondays
        { reminderFrequency: 'monthly', $expr: { $eq: [dayOfMonth, 1] } } // 1st of month
      ]
    });
    
    logger?.debug(`[Affirmation Action] Retrieved ${affirmations.length} affirmations for today for user ${userId}`);
    return affirmations;
  } catch (error) {
    logger?.error(`[Affirmation Action] Error retrieving today's affirmations: ${error.message}`);
    throw error;
  }
};

// Update an affirmation
export const updateAffirmation = async (id, data, context) => {
  const { models, logger } = context;
  
  try {
    const affirmation = await models.Affirmation.findById(id);
    
    if (!affirmation) {
      throw new Error(`Affirmation not found: ${id}`);
    }
    
    // Update fields
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        affirmation[key] = data[key];
      }
    });
    
    affirmation.updatedAt = new Date();
    await affirmation.save();
    
    logger?.debug(`[Affirmation Action] Updated affirmation: ${id}`);
    return affirmation;
  } catch (error) {
    logger?.error(`[Affirmation Action] Error updating affirmation: ${error.message}`);
    throw error;
  }
};

// Delete an affirmation
export const deleteAffirmation = async (id, context) => {
  const { models, logger } = context;
  
  try {
    const affirmation = await models.Affirmation.findById(id);
    
    if (!affirmation) {
      throw new Error(`Affirmation not found: ${id}`);
    }
    
    await models.Affirmation.deleteOne({ _id: id });
    logger?.debug(`[Affirmation Action] Deleted affirmation: ${id}`);
    
    return affirmation;
  } catch (error) {
    logger?.error(`[Affirmation Action] Error deleting affirmation: ${error.message}`);
    throw error;
  }
};

// Toggle the active status of an affirmation
export const toggleAffirmationActive = async (id, context) => {
  const { models, logger } = context;
  
  try {
    const affirmation = await models.Affirmation.findById(id);
    
    if (!affirmation) {
      throw new Error(`Affirmation not found: ${id}`);
    }
    
    affirmation.isActive = !affirmation.isActive;
    affirmation.updatedAt = new Date();
    
    await affirmation.save();
    logger?.debug(`[Affirmation Action] Toggled affirmation active status: ${id} to ${affirmation.isActive}`);
    
    return affirmation;
  } catch (error) {
    logger?.error(`[Affirmation Action] Error toggling affirmation status: ${error.message}`);
    throw error;
  }
};

export default {
  createAffirmation,
  getUserAffirmations,
  getTodaysAffirmations,
  updateAffirmation,
  deleteAffirmation,
  toggleAffirmationActive
}; 