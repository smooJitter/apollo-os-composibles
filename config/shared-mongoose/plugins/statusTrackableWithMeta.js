// plugins/status-trackable-meta.js
import mongoose from 'mongoose';
import { STATUS_META, STATUS_ENUMS } from '../constants/status.constants.js';

export function statusTrackableWithMetaPlugin(schema, options = {}) {
  const { field = 'status', userField = 'updatedBy', trackHistory = true } = options;

  // Core field
  schema.add({
    [field]: {
      type: String,
      enum: STATUS_ENUMS,
      default: STATUS_ENUMS[0],
    },
  });

  // Optional status history
  if (trackHistory) {
    schema.add({
      [`${field}History`]: [
        {
          value: { type: String, enum: STATUS_ENUMS },
          changedAt: { type: Date, default: Date.now },
          [userField]: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          reason: String,
        },
      ],
    });
  }

  // Set status with validation
  schema.methods.setStatus = function (newStatus, updatedBy = null, reason = null) {
    const currentStatus = this[field];
    const allowed = STATUS_META[currentStatus]?.transitionsTo || [];

    if (!STATUS_ENUMS.includes(newStatus)) {
      throw new Error(`Invalid status: "${newStatus}". Must be one of: ${STATUS_ENUMS.join(', ')}`);
    }

    if (currentStatus === newStatus) return this; // No-op

    if (allowed.length > 0 && !allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: "${currentStatus}" → "${newStatus}" not allowed.`);
    }

    this[field] = newStatus;

    if (trackHistory) {
      this[`${field}History`] = this[`${field}History`] || [];
      this[`${field}History`].push({
        value: newStatus,
        changedAt: new Date(),
        [userField]: updatedBy,
        reason,
      });
    }

    return this;
  };

  schema.methods.isStatus = function (status) {
    return this[field] === status;
  };

  schema.methods.getStatusHistory = function () {
    return this[`${field}History`] || [];
  };

  schema.methods.getStatusMeta = function () {
    return STATUS_META[this[field]] || {};
  };

  schema.statics.getAllStatusMeta = function () {
    return STATUS_META;
  };
}
