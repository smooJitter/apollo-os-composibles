// plugins/taggable-flex-weighted.js
import mongoose from 'mongoose';

export function taggableFlexWeightedPlugin(schema, options = {}) {
  const {
    field = 'tags',
    embedded = true,
    tagModel = 'Tag',
    allowedTypes = ['custom', 'topic', 'status', 'priority'],
    weightRange = { min: 0, max: 1 },
    normalize = true,
  } = options;

  const normalizeTag = (str) => (normalize ? str.trim().toLowerCase() : str);

  if (embedded) {
    // === Embedded Mode ===
    schema.add({
      [field]: [
        {
          name: { type: String, required: true },
          type: { type: String, enum: allowedTypes, default: 'custom' },
          weight: {
            type: Number,
            default: 1.0,
            min: weightRange.min,
            max: weightRange.max,
          },
        },
      ],
    });

    schema.methods.addTag = function (name, type = 'custom', weight = 1.0) {
      name = normalizeTag(name);
      const existing = this[field].find((tag) => tag.name === name && tag.type === type);

      if (existing) {
        if (weight > existing.weight) {
          existing.weight = Math.min(weight, weightRange.max);
        }
      } else {
        this[field].push({
          name,
          type,
          weight: Math.min(weight, weightRange.max),
        });
      }
      return this;
    };

    schema.methods.removeTag = function (name, type = null) {
      name = normalizeTag(name);
      this[field] = this[field].filter((tag) => tag.name !== name || (type && tag.type !== type));
      return this;
    };

    schema.methods.getTagsByType = function (type) {
      return this[field].filter((tag) => tag.type === type);
    };

    schema.methods.getTagsSortedByWeight = function () {
      return [...this[field]].sort((a, b) => b.weight - a.weight);
    };
  } else {
    // === Referenced Mode ===
    const ObjectId = mongoose.Schema.Types.ObjectId;

    schema.add({
      [field]: [
        {
          ref: { type: ObjectId, ref: tagModel },
          weight: {
            type: Number,
            default: 1.0,
            min: weightRange.min,
            max: weightRange.max,
          },
        },
      ],
    });

    schema.methods.addTagById = function (tagId, weight = 1.0) {
      const existing = this[field].find((tag) => tag.ref.toString() === tagId.toString());

      if (existing) {
        if (weight > existing.weight) {
          existing.weight = Math.min(weight, weightRange.max);
        }
      } else {
        this[field].push({
          ref: tagId,
          weight: Math.min(weight, weightRange.max),
        });
      }
      return this;
    };

    schema.methods.removeTagById = function (tagId) {
      this[field] = this[field].filter((tag) => tag.ref.toString() !== tagId.toString());
      return this;
    };

    schema.methods.getTagsSortedByWeight = function () {
      return [...this[field]].sort((a, b) => b.weight - a.weight);
    };

    schema.statics.findByTagId = function (tagId) {
      return this.find({ [`${field}.ref`]: tagId });
    };
  }
}
