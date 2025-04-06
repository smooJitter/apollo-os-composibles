/**
 * JournalEntry validators
 * Provides validation functions for journal entry data
 */

// Validate journal entry
export const validateJournalEntry = (data) => {
  const errors = {};
  
  // Check required content field
  if (!data.content || !data.content.trim()) {
    errors.content = 'Content is required';
  }
  
  // Title length check
  if (data.title && data.title.length > 200) {
    errors.title = 'Title cannot exceed 200 characters';
  }
  
  // Validate mood is valid
  const validMoods = ['happy', 'sad', 'anxious', 'excited', 'neutral', 'productive', 'tired', 'other'];
  if (data.mood && !validMoods.includes(data.mood)) {
    errors.mood = 'Invalid mood';
  }
  
  // Validate entry date is not in the future
  if (data.entryDate && new Date(data.entryDate) > new Date()) {
    errors.entryDate = 'Entry date cannot be in the future';
  }
  
  // Return null if no errors, otherwise return the errors object
  return Object.keys(errors).length ? errors : null;
};

// Validate attachment
export const validateAttachment = (data) => {
  const errors = {};
  
  // Check required fields
  if (!data.type) {
    errors.type = 'Attachment type is required';
  }
  
  if (!data.url) {
    errors.url = 'URL is required';
  } else if (!/^https?:\/\//.test(data.url)) {
    errors.url = 'URL must start with http:// or https://';
  }
  
  // Validate type is valid
  const validTypes = ['image', 'document', 'link', 'other'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.type = 'Invalid attachment type';
  }
  
  // Return null if no errors, otherwise return the errors object
  return Object.keys(errors).length ? errors : null;
};

export default {
  validateJournalEntry,
  validateAttachment
}; 