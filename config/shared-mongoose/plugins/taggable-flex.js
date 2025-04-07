// plugins/taggable-flex.js
import mongoose from 'mongoose';

export function taggableFlexPlugin(schema, options = {}) {
  const {
    field = 'tags',
    embedded = true,
    tagModel = 'Tag',
    allowedTypes = ['custom', 'topic', 'status', 'label'],
  } = options;

  if (embedded) {
    // Embedded mode: { name, type }
    schema.add({
      [field]: [
        {
          name: { type: String, required: true },
          type: { type: String, enum: allowedTypes, default: 'custom' },
        },
      ],
    });

    schema.methods.addTag = function (name, type = 'custom') {
      name = name.toLowerCase();
      const exists = this[field].some((tag) => tag.name === name && tag.type === type);
      if (!exists) {
        this[field].push({ name, type });
      }
      return this;
    };

    schema.methods.removeTag = function (name, type = null) {
      name = name.toLowerCase();
      this[field] = this[field].filter((tag) => tag.name !== name || (type && tag.type !== type));
      return this;
    };

    schema.methods.getTagsByType = function (type) {
      return this[field].filter((tag) => tag.type === type);
    };
  } else {
    // Reference mode: [ObjectId -> Tag Model]
    const ObjectId = mongoose.Schema.Types.ObjectId;

    schema.add({
      [field]: [{ type: ObjectId, ref: tagModel }],
    });

    schema.methods.addTagById = function (tagId) {
      if (!this[field].includes(tagId)) {
        this[field].push(tagId);
      }
      return this;
    };

    schema.methods.removeTagById = function (tagId) {
      this[field] = this[field].filter((t) => t.toString() !== tagId.toString());
      return this;
    };

    schema.statics.findByTagId = function (tagId) {
      return this.find({ [field]: tagId });
    };
  }
}
