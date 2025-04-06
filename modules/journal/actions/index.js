/**
 * Journal actions
 * Provides business logic for journal operations
 */

// Create a new journal
export const createJournal = async (data, context) => {
  const { models, logger } = context;
  
  try {
    const journal = new models.Journal({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await journal.save();
    logger?.debug(`[Journal Action] Created journal: ${journal.title}`);
    
    return journal;
  } catch (error) {
    logger?.error(`[Journal Action] Error creating journal: ${error.message}`);
    throw error;
  }
};

// Update an existing journal
export const updateJournal = async (id, data, context) => {
  const { models, logger } = context;
  
  try {
    const journal = await models.Journal.findById(id);
    
    if (!journal) {
      throw new Error(`Journal not found: ${id}`);
    }
    
    // Update fields
    Object.keys(data).forEach(key => {
      journal[key] = data[key];
    });
    
    journal.updatedAt = new Date();
    
    await journal.save();
    logger?.debug(`[Journal Action] Updated journal: ${journal.title}`);
    
    return journal;
  } catch (error) {
    logger?.error(`[Journal Action] Error updating journal: ${error.message}`);
    throw error;
  }
};

// Delete a journal
export const deleteJournal = async (id, context) => {
  const { models, logger } = context;
  
  try {
    const journal = await models.Journal.findByIdAndDelete(id);
    
    if (!journal) {
      throw new Error(`Journal not found: ${id}`);
    }
    
    logger?.debug(`[Journal Action] Deleted journal: ${journal.title}`);
    
    return journal;
  } catch (error) {
    logger?.error(`[Journal Action] Error deleting journal: ${error.message}`);
    throw error;
  }
};

export default {
  createJournal,
  updateJournal,
  deleteJournal
}; 