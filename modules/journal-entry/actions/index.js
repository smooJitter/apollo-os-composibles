/**
 * JournalEntry actions
 * Provides business logic for journal entry operations
 */

// Create a new journal entry
export const createJournalEntry = async (data, context) => {
  const { models, logger } = context;
  
  try {
    const entry = new models.JournalEntry({
      ...data,
      entryDate: data.entryDate || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await entry.save();
    logger?.debug(`[JournalEntry Action] Created entry for journal: ${entry.journalId}`);
    
    return entry;
  } catch (error) {
    logger?.error(`[JournalEntry Action] Error creating entry: ${error.message}`);
    throw error;
  }
};

// Update an existing journal entry
export const updateJournalEntry = async (id, data, context) => {
  const { models, logger } = context;
  
  try {
    const entry = await models.JournalEntry.findById(id);
    
    if (!entry) {
      throw new Error(`Journal entry not found: ${id}`);
    }
    
    // Update fields
    Object.keys(data).forEach(key => {
      entry[key] = data[key];
    });
    
    entry.updatedAt = new Date();
    
    await entry.save();
    logger?.debug(`[JournalEntry Action] Updated entry: ${id}`);
    
    return entry;
  } catch (error) {
    logger?.error(`[JournalEntry Action] Error updating entry: ${error.message}`);
    throw error;
  }
};

// Delete a journal entry
export const deleteJournalEntry = async (id, context) => {
  const { models, logger } = context;
  
  try {
    const entry = await models.JournalEntry.findByIdAndDelete(id);
    
    if (!entry) {
      throw new Error(`Journal entry not found: ${id}`);
    }
    
    logger?.debug(`[JournalEntry Action] Deleted entry: ${id}`);
    
    return entry;
  } catch (error) {
    logger?.error(`[JournalEntry Action] Error deleting entry: ${error.message}`);
    throw error;
  }
};

// Add an attachment to a journal entry
export const addAttachment = async (entryId, attachment, context) => {
  const { models, logger } = context;
  
  try {
    const entry = await models.JournalEntry.findById(entryId);
    
    if (!entry) {
      throw new Error(`Journal entry not found: ${entryId}`);
    }
    
    entry.attachments.push(attachment);
    entry.updatedAt = new Date();
    
    await entry.save();
    logger?.debug(`[JournalEntry Action] Added attachment to entry: ${entryId}`);
    
    return entry;
  } catch (error) {
    logger?.error(`[JournalEntry Action] Error adding attachment: ${error.message}`);
    throw error;
  }
};

export default {
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  addAttachment
}; 