import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { Affirmation } from './schemas.js';

// Create and register type composers
const typeComposers = {};

// Initialize Affirmation type composers
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composers for Affirmation
    const AffirmationTC = composeMongoose(Affirmation, { removeFields: ['__v'] });
    
    // Create Affirmation input types
    const AffirmationInputTC = schemaComposer.createInputTC({
      name: 'AffirmationInput',
      fields: {
        text: 'String!',
        scheduledTime: 'String',
        isActive: 'Boolean',
        category: 'String',
        reminderFrequency: 'String',
        tags: '[String]'
      }
    });
    
    // Create category enum for more type-safe input
    const CategoryEnumTC = schemaComposer.createEnumTC({
      name: 'AffirmationCategoryEnum',
      values: {
        HEALTH: { value: 'health' },
        CAREER: { value: 'career' },
        RELATIONSHIPS: { value: 'relationships' },
        PERSONAL: { value: 'personal' },
        OTHER: { value: 'other' }
      }
    });
    
    // Create frequency enum
    const FrequencyEnumTC = schemaComposer.createEnumTC({
      name: 'AffirmationFrequencyEnum',
      values: {
        DAILY: { value: 'daily' },
        WEEKDAYS: { value: 'weekdays' },
        WEEKENDS: { value: 'weekends' },
        WEEKLY: { value: 'weekly' },
        MONTHLY: { value: 'monthly' }
      }
    });
    
    // Update the fields to use enums
    AffirmationInputTC.extendField('category', {
      type: CategoryEnumTC
    });
    
    AffirmationInputTC.extendField('reminderFrequency', {
      type: FrequencyEnumTC
    });
    
    // Register composers
    typeComposers.AffirmationTC = AffirmationTC;
    typeComposers.AffirmationInputTC = AffirmationInputTC;
    typeComposers.CategoryEnumTC = CategoryEnumTC;
    typeComposers.FrequencyEnumTC = FrequencyEnumTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Affirmation Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getAffirmationTC = () => {
  if (!typeComposers.AffirmationTC) {
    initTypeComposers();
  }
  return typeComposers.AffirmationTC;
};

export const getAffirmationInputTC = () => {
  if (!typeComposers.AffirmationInputTC) {
    initTypeComposers();
  }
  return typeComposers.AffirmationInputTC;
};

export default {
  initTypeComposers,
  getAffirmationTC,
  getAffirmationInputTC
}; 