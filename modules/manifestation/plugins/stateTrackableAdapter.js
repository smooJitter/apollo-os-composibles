import { statusTrackableWithMetaPlugin } from '../../../config/shared-mongoose/plugins/statusTrackableWithMeta.js';
import { STATE_ENUMS, MANIFESTATION_STATE_META } from '../constants.js';

/**
 * Adapter for the statusTrackableWithMeta plugin that uses manifestation-specific states
 * @param {Schema} schema - Mongoose schema to apply the plugin to
 * @param {Object} options - Plugin options
 */
export function manifestationStatePlugin(schema, options = {}) {
  // Create a modified version of the plugin with manifestation-specific constants
  const modifiedOptions = {
    ...options,
    // Rename field from 'status' to 'state'
    field: 'state',
    // Override the constants that statusTrackableWithMeta will use internally
    _statusEnums: STATE_ENUMS,
    _statusMeta: MANIFESTATION_STATE_META,
    // Override history field name if not explicitly provided
    historyField: options.historyField || 'stateHistory'
  };
  
  // Apply the plugin with modified options
  schema.plugin(statusTrackableWithMetaPlugin, modifiedOptions);
  
  // Add extra manifestation-specific state methods
  schema.methods.isActive = function() {
    return ['intention_set', 'in_progress', 'manifesting'].includes(this.state);
  };
  
  schema.methods.isManifested = function() {
    return ['manifested', 'evolving'].includes(this.state);
  };
  
  schema.methods.isReleased = function() {
    return this.state === 'released';
  };
  
  schema.methods.getStateColor = function() {
    return MANIFESTATION_STATE_META[this.state]?.color || '#9e9e9e';
  };
  
  schema.methods.getStateLabel = function() {
    return MANIFESTATION_STATE_META[this.state]?.label || 'Unknown';
  };
  
  schema.methods.canTransitionTo = function(targetState) {
    const currentState = this.state;
    const allowed = MANIFESTATION_STATE_META[currentState]?.transitionsTo || [];
    return allowed.includes(targetState);
  };
  
  schema.methods.setState = async function(newState, note = '') {
    // Use the setStatus method provided by the statusTrackableWithMeta plugin
    if (this.setStatus) {
      return this.setStatus(newState, note);
    }
    // Fallback if plugin method not available
    this.state = newState;
  };
  
  // Add static methods for all state values
  STATE_ENUMS.forEach(state => {
    const stateName = state.charAt(0).toUpperCase() + state.slice(1);
    const methodName = `find${stateName}`;
    schema.statics[methodName] = function(conditions = {}) {
      return this.find({ ...conditions, state });
    };
  });
  
  return schema;
} 