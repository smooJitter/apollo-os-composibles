import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';

const { Schema } = mongoose;

/**
 * Media Schema
 * Represents media items in a vision board (images, videos, etc)
 */
const mediaSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'text', 'url'],
    default: 'image',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 200 },
    height: { type: Number, default: 200 },
    zIndex: { type: Number, default: 0 }
  },
  tags: [String]
});

/**
 * Metadata Schema
 * Additional metadata for vision boards
 */
const metadataSchema = new Schema({
  theme: {
    type: String,
    default: 'default'
  },
  background: {
    type: String,
    default: '#ffffff'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    enum: ['personal', 'career', 'travel', 'fitness', 'education', 'financial', 'other'],
    default: 'personal'
  },
  tags: [String]
}, { _id: false });

/**
 * Vision Board Schema
 * Main schema for vision boards
 */
const visionBoardSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  items: [mediaSchema],
  metadata: {
    type: metadataSchema,
    default: () => ({})
  },
  isArchived: {
    type: Boolean,
    default: false
  }
});

// Apply plugins
visionBoardSchema.plugin(timestampsPlugin);

// Create Model
export const VisionBoard = mongoose.model('VisionBoard', visionBoardSchema);
export const Media = mongoose.model('Media', mediaSchema);

// Export a function that will apply plugins that require context
export const applyContextPlugins = (ctx) => {
  if (ctx && ctx.plugins) {
    // Add any context-dependent plugins here
    if (ctx.plugins.taggableSchema) {
      visionBoardSchema.plugin(ctx.plugins.taggableSchema, { path: 'tags' });
    }
  }
  return { VisionBoard, Media };
};

export default {
  VisionBoard,
  Media,
  applyContextPlugins
}; 