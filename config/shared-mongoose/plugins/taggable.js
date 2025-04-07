// plugins/taggable.js

/**
 * A Mongoose plugin that adds tagging functionality to a schema
 */
export function taggablePlugin(schema, options = {}) {
  const tagField = options.field || 'tags';

  schema.add({
    [tagField]: [
      {
        name: { type: String, required: true },
        type: { type: String, default: 'custom' },
      },
    ],
  });

  schema.methods.addTag = function (name, type = 'custom') {
    const exists = this[tagField].some(
      (tag) => tag.name.toLowerCase() === name.toLowerCase() && tag.type === type
    );
    if (!exists) {
      this[tagField].push({ name: name.toLowerCase(), type });
    }
    return this;
  };

  schema.methods.findTagsByType = function (type) {
    return this[tagField].filter((tag) => tag.type === type);
  };
}
