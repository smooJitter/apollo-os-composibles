/**
 * Journal validators
 * Provides validation functions for journal data
 */

// Validate new journal
export const validateJournal = (data) => {
  const errors = {};
  
  // Check required fields
  if (!data.title || !data.title.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.length > 100) {
    errors.title = 'Title cannot exceed 100 characters';
  }
  
  if (data.description && data.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }
  
  // Validate category is valid
  const validCategories = ['personal', 'work', 'health', 'finance', 'other'];
  if (data.category && !validCategories.includes(data.category)) {
    errors.category = 'Invalid category';
  }
  
  // Return null if no errors, otherwise return the errors object
  return Object.keys(errors).length ? errors : null;
};

export default {
  validateJournal
}; 