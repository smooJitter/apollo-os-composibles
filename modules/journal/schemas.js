// modules/journal/schemas.js
import mongoose from 'mongoose';
import { timestamps } from '../../config/shared-mongoose/plugins/timestamps.js';
import { taggableSchema } from '../../config/shared-mongoose/plugins/taggable.js';

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
journalSchema.plugin(timestamps);
journalSchema.plugin(taggableSchema, { path: 'tags' });

// Create Model
export const Journal = mongoose.model('Journal', journalSchema);

export default {
  Journal
}; 