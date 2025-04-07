import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { Habit } from './schemas.js';

// Create and register type composers
const typeComposers = {};

// Initialize Habit type composers
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composer for Habit
    const HabitTC = composeMongoose(Habit, { removeFields: ['__v'] });
    
    // Create input types
    const StatusInputTC = schemaComposer.createInputTC({
      name: 'HabitStatusInput',
      fields: {
        active: 'Boolean',
        completedToday: 'Boolean',
        streak: 'Int',
        completionHistory: '[JSON]'
      }
    });
    
    const MetadataInputTC = schemaComposer.createInputTC({
      name: 'HabitMetadataInput',
      fields: {
        color: 'String',
        icon: 'String',
        priority: 'String',
        category: 'String',
        tags: '[String]'
      }
    });
    
    const HabitInputTC = schemaComposer.createInputTC({
      name: 'HabitInput',
      fields: {
        title: 'String!',
        description: 'String',
        startDate: 'Date',
        frequency: 'String',
        daysOfWeek: '[Int]',
        reminderTime: 'Date',
        status: 'HabitStatusInput',
        metadata: 'HabitMetadataInput',
        targetValue: 'Float',
        currentValue: 'Float',
        unit: 'String'
      }
    });
    
    // Create enums for more type safety
    const FrequencyEnumTC = schemaComposer.createEnumTC({
      name: 'HabitFrequencyEnum',
      values: {
        DAILY: { value: 'Daily' },
        WEEKLY: { value: 'Weekly' },
        MONTHLY: { value: 'Monthly' }
      }
    });
    
    const PriorityEnumTC = schemaComposer.createEnumTC({
      name: 'HabitPriorityEnum',
      values: {
        LOW: { value: 'Low' },
        MEDIUM: { value: 'Medium' },
        HIGH: { value: 'High' }
      }
    });
    
    const CategoryEnumTC = schemaComposer.createEnumTC({
      name: 'HabitCategoryEnum',
      values: {
        HEALTH: { value: 'Health' },
        WORK: { value: 'Work' },
        PERSONAL: { value: 'Personal' },
        LEARNING: { value: 'Learning' },
        FINANCE: { value: 'Finance' },
        SOCIAL: { value: 'Social' },
        OTHER: { value: 'Other' }
      }
    });
    
    // Register composers
    typeComposers.HabitTC = HabitTC;
    typeComposers.HabitInputTC = HabitInputTC;
    typeComposers.StatusInputTC = StatusInputTC;
    typeComposers.MetadataInputTC = MetadataInputTC;
    typeComposers.FrequencyEnumTC = FrequencyEnumTC;
    typeComposers.PriorityEnumTC = PriorityEnumTC;
    typeComposers.CategoryEnumTC = CategoryEnumTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Habit Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getHabitTC = () => {
  if (!typeComposers.HabitTC) {
    initTypeComposers();
  }
  return typeComposers.HabitTC;
};

export const getHabitInputTC = () => {
  if (!typeComposers.HabitInputTC) {
    initTypeComposers();
  }
  return typeComposers.HabitInputTC;
};

export const getStatusInputTC = () => {
  if (!typeComposers.StatusInputTC) {
    initTypeComposers();
  }
  return typeComposers.StatusInputTC;
};

export const getMetadataInputTC = () => {
  if (!typeComposers.MetadataInputTC) {
    initTypeComposers();
  }
  return typeComposers.MetadataInputTC;
};

export default {
  initTypeComposers,
  getHabitTC,
  getHabitInputTC,
  getStatusInputTC,
  getMetadataInputTC
}; 