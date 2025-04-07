// modules/journal/schemas.js
import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
// taggableSchema is available via ctx when the module is initialized

const { Schema } = mongoose;

/**
 * Journal Schema
 * Represents a user's journal for tracking entries
 */
const journalSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['personal', 'work', 'health', 'finance', 'other'],
    default: 'personal'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Apply plugins
journalSchema.plugin(timestampsPlugin);
// Apply taggable plugin when schema is initialized with context

// Create Model
export const Journal = mongoose.model('Journal', journalSchema);

// Export a function that will apply plugins that require context
export const applyContextPlugins = (ctx) => {
  if (ctx && ctx.plugins && ctx.plugins.taggableSchema) {
    journalSchema.plugin(ctx.plugins.taggableSchema, { path: 'tags' });
  }
  return { Journal };
};

export default {
  Journal,
  applyContextPlugins
}; 