import { statusTrackableWithMetaPlugin } from '../../../config/shared-mongoose/plugins/statusTrackableWithMeta.js';
import { STATUS_ENUMS, MILESTONE_STATUS_META } from '../constants.js';

/**
 * Adapter for the statusTrackableWithMeta plugin that uses milestone-specific status values
 * @param {Schema} schema - Mongoose schema to apply the plugin to
 * @param {Object} options - Plugin options
 */
export function milestoneStatusPlugin(schema, options = {}) {
  // Create a modified version of the plugin with our custom constants
  const modifiedOptions = {
    ...options,
    // Override the constants that statusTrackableWithMeta will use internally
    _statusEnums: STATUS_ENUMS,
    _statusMeta: MILESTONE_STATUS_META
  };
  
  // Apply the plugin with modified options
  schema.plugin(statusTrackableWithMetaPlugin, modifiedOptions);
  
  // Add extra milestone-specific status methods
  schema.methods.isActive = function() {
    return ['in_progress', 'at_risk', 'nearly_complete'].includes(this.status);
  };
  
  schema.methods.isCompleted = function() {
    return this.status === 'achieved';
  };
  
  schema.methods.isBlocked = function() {
    return this.status === 'blocked';
  };
  
  schema.methods.getStatusColor = function() {
    return MILESTONE_STATUS_META[this.status]?.color || '#999999';
  };
  
  schema.methods.getStatusLabel = function() {
    return MILESTONE_STATUS_META[this.status]?.label || 'Unknown';
  };
  
  schema.methods.canTransitionTo = function(targetStatus) {
    const currentStatus = this.status;
    const allowed = MILESTONE_STATUS_META[currentStatus]?.transitionsTo || [];
    return allowed.includes(targetStatus);
  };
  
  // Add static methods for all status values
  STATUS_ENUMS.forEach(status => {
    const methodName = `find${status.charAt(0).toUpperCase() + status.slice(1)}`;
    schema.statics[methodName] = function(conditions = {}) {
      return this.find({ ...conditions, status });
    };
  });
  
  return schema;
} 