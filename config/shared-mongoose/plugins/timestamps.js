/**
 * A basic Mongoose plugin to add createdAt and updatedAt timestamps.
 */
export function timestampsPlugin(schema) {
  schema.add({
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  });

  schema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
  });

  schema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: new Date() });
    next();
  });
}
