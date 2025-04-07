import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { VisionBoard, Media } from './schemas.js';

// Create and register type composers
const typeComposers = {};

// Initialize Vision Board type composers
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composers for Vision Board and Media
    const VisionBoardTC = composeMongoose(VisionBoard, { removeFields: ['__v'] });
    const MediaTC = composeMongoose(Media, { removeFields: ['__v'] });
    
    // Create input types
    const MediaInputTC = schemaComposer.createInputTC({
      name: 'MediaInput',
      fields: {
        type: 'String!',
        url: 'String!',
        title: 'String',
        description: 'String',
        position: 'JSON',
        tags: '[String]'
      }
    });
    
    const MetadataInputTC = schemaComposer.createInputTC({
      name: 'VisionBoardMetadataInput',
      fields: {
        theme: 'String',
        background: 'String',
        isPublic: 'Boolean',
        collaborators: '[MongoID]',
        category: 'String',
        tags: '[String]'
      }
    });
    
    const VisionBoardInputTC = schemaComposer.createInputTC({
      name: 'VisionBoardInput',
      fields: {
        title: 'String!',
        description: 'String',
        items: '[MediaInput]',
        metadata: 'VisionBoardMetadataInput',
        isArchived: 'Boolean'
      }
    });
    
    // Create category enum for more type-safe input
    const CategoryEnumTC = schemaComposer.createEnumTC({
      name: 'VisionBoardCategoryEnum',
      values: {
        PERSONAL: { value: 'personal' },
        CAREER: { value: 'career' },
        TRAVEL: { value: 'travel' },
        FITNESS: { value: 'fitness' },
        EDUCATION: { value: 'education' },
        FINANCIAL: { value: 'financial' },
        OTHER: { value: 'other' }
      }
    });
    
    // Create media type enum
    const MediaTypeEnumTC = schemaComposer.createEnumTC({
      name: 'MediaTypeEnum',
      values: {
        IMAGE: { value: 'image' },
        VIDEO: { value: 'video' },
        TEXT: { value: 'text' },
        URL: { value: 'url' }
      }
    });
    
    // Register composers
    typeComposers.VisionBoardTC = VisionBoardTC;
    typeComposers.MediaTC = MediaTC;
    typeComposers.VisionBoardInputTC = VisionBoardInputTC;
    typeComposers.MediaInputTC = MediaInputTC;
    typeComposers.MetadataInputTC = MetadataInputTC;
    typeComposers.CategoryEnumTC = CategoryEnumTC;
    typeComposers.MediaTypeEnumTC = MediaTypeEnumTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Vision Board Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getVisionBoardTC = () => {
  if (!typeComposers.VisionBoardTC) {
    initTypeComposers();
  }
  return typeComposers.VisionBoardTC;
};

export const getMediaTC = () => {
  if (!typeComposers.MediaTC) {
    initTypeComposers();
  }
  return typeComposers.MediaTC;
};

export const getVisionBoardInputTC = () => {
  if (!typeComposers.VisionBoardInputTC) {
    initTypeComposers();
  }
  return typeComposers.VisionBoardInputTC;
};

export const getMediaInputTC = () => {
  if (!typeComposers.MediaInputTC) {
    initTypeComposers();
  }
  return typeComposers.MediaInputTC;
};

export default {
  initTypeComposers,
  getVisionBoardTC,
  getMediaTC,
  getVisionBoardInputTC,
  getMediaInputTC
}; 