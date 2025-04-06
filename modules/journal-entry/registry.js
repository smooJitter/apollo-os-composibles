// modules/journal-entry/registry.js
import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { JournalEntry } from './schemas.js';

// Create and register type composers
const typeComposers = {};

// Initialize JournalEntry type composers
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composers for JournalEntry
    const JournalEntryTC = composeMongoose(JournalEntry, { removeFields: ['__v'] });
    
    // Create JournalEntry input types
    const JournalEntryInputTC = schemaComposer.createInputTC({
      name: 'JournalEntryInput',
      fields: {
        title: 'String',
        content: 'String!',
        mood: 'String',
        location: 'String',
        entryDate: 'Date',
        isPrivate: 'Boolean',
        tags: '[String]'
      }
    });
    
    // Create attachment input type
    const AttachmentInputTC = schemaComposer.createInputTC({
      name: 'AttachmentInput',
      fields: {
        type: 'String!',
        url: 'String!',
        name: 'String'
      }
    });
    
    // Register composers
    typeComposers.JournalEntryTC = JournalEntryTC;
    typeComposers.JournalEntryInputTC = JournalEntryInputTC;
    typeComposers.AttachmentInputTC = AttachmentInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[JournalEntry Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getters for type composers
export const getJournalEntryTC = () => {
  if (!typeComposers.JournalEntryTC) {
    initTypeComposers();
  }
  return typeComposers.JournalEntryTC;
};

export const getJournalEntryInputTC = () => {
  if (!typeComposers.JournalEntryInputTC) {
    initTypeComposers();
  }
  return typeComposers.JournalEntryInputTC;
};

export const getAttachmentInputTC = () => {
  if (!typeComposers.AttachmentInputTC) {
    initTypeComposers();
  }
  return typeComposers.AttachmentInputTC;
};

export default {
  initTypeComposers,
  getJournalEntryTC,
  getJournalEntryInputTC,
  getAttachmentInputTC
}; 