// modules/journal/registry.js
import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { Journal } from './schemas.js';

// Create and register type composers
const typeComposers = {};

// Initialize Journal type composers
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composers for Journal
    const JournalTC = composeMongoose(Journal, { removeFields: ['__v'] });
    
    // Create Journal input types
    const JournalInputTC = schemaComposer.createInputTC({
      name: 'JournalInput',
      fields: {
        title: 'String!',
        description: 'String',
        coverImage: 'String',
        isPrivate: 'Boolean',
        isArchived: 'Boolean',
        category: 'String',
        tags: '[String]'
      }
    });
    
    // Register composers
    typeComposers.JournalTC = JournalTC;
    typeComposers.JournalInputTC = JournalInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Journal Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getters for type composers
export const getJournalTC = () => {
  if (!typeComposers.JournalTC) {
    initTypeComposers();
  }
  return typeComposers.JournalTC;
};

export const getJournalInputTC = () => {
  if (!typeComposers.JournalInputTC) {
    initTypeComposers();
  }
  return typeComposers.JournalInputTC;
};

export default {
  initTypeComposers,
  getJournalTC,
  getJournalInputTC
}; 