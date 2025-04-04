import mongoose from 'mongoose';
// Assuming constants are in the config/constants directory
import { STATUS_META, STATUS_ENUMS } from '../../constants/status.constants.js';

export function statusTrackableFlexPlugin(schema, options = {}) {
  const {
    embedded = true,
    field = 'statusInfo', // Renamed field to avoid conflict with common 'status' fields
    statusModel = 'Status', // Referenced model name if embedded = false
    allowedTypes = null, // Optional: Filter STATUS_ENUMS based on a type from STATUS_META
    userField = 'updatedBy',
    trackHistory = true,
    historyField = 'statusHistory' // Explicit history field name
  } = options;

  const applicableStatuses = allowedTypes
    ? STATUS_ENUMS.filter(key => STATUS_META[key]?.type === allowedTypes || (Array.isArray(allowedTypes) && allowedTypes.includes(STATUS_META[key]?.type)))
    : STATUS_ENUMS;

  if (applicableStatuses.length === 0) {
      console.warn(`[statusTrackableFlex] No applicable statuses found for allowedTypes: ${allowedTypes}. Plugin might not function as expected.`);
  }

  const HistorySchemaDefinition = {
    changedAt: { type: Date, default: Date.now },
    reason: String,
    [userField]: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  };

  if (embedded) {
    // === Embedded Mode ===
    HistorySchemaDefinition.value = { type: String, enum: applicableStatuses, required: true };
    const EmbeddedHistorySchema = new mongoose.Schema(HistorySchemaDefinition, { _id: false });

    schema.add({
      [field]: {
        current: { // Changed from just field to field.current for clarity
           type: String,
           enum: applicableStatuses,
           default: applicableStatuses[0] // Default to the first applicable status
        },
        meta: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }, // Optional meta storage
        lastChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        lastChangedAt: Date
      }
    });

    if (trackHistory) {
      schema.add({
        [historyField]: [EmbeddedHistorySchema]
      });
    }
    
    // Initialize default status object upon document creation
    schema.pre('save', function(next) {
      if (this.isNew && !this[field]) {
        this[field] = { current: applicableStatuses[0] }; // Apply default
      }
      next();
    });

    schema.methods.setStatus = function (newStatus, updatedBy = null, reason = null) {
      if (!this[field]) this[field] = { current: applicableStatuses[0] }; // Initialize if missing
      const currentStatus = this[field].current;
      
      if (!applicableStatuses.includes(newStatus)) {
        throw new Error(`[StatusPlugin] Invalid status: "${newStatus}". Allowed: ${applicableStatuses.join(', ')}`);
      }
      
      if (newStatus === currentStatus) return this; // No change

      const currentMeta = STATUS_META[currentStatus];
      const allowedTransitions = currentMeta?.transitionsTo || [];

      // Check if transition is allowed
      if (currentMeta && !currentMeta.isFinal && allowedTransitions.length > 0 && !allowedTransitions.includes(newStatus)) {
        throw new Error(`[StatusPlugin] Transition from "${currentStatus}" to "${newStatus}" is not allowed.`);
      }
      // Prevent transition from a final state
      if (currentMeta?.isFinal) {
           throw new Error(`[StatusPlugin] Cannot transition from final status "${currentStatus}".`);
      }

      this[field].current = newStatus;
      this[field].lastChangedAt = new Date();
      if (updatedBy) {
          this[field].lastChangedBy = updatedBy._id || updatedBy;
      }

      if (trackHistory) {
        this[historyField] = this[historyField] || [];
        this[historyField].push({
          value: newStatus,
          changedAt: this[field].lastChangedAt,
          [userField]: updatedBy ? (updatedBy._id || updatedBy) : undefined,
          reason
        });
      }
      
      this.markModified(field);
      if (trackHistory) this.markModified(historyField);
      return this;
    };

    schema.methods.getCurrentStatus = function () {
        return this[field]?.current;
    };
    
    schema.methods.getStatusMeta = function () {
      const current = this.getCurrentStatus();
      return STATUS_META[current] || {};
    };

    schema.statics.getAllStatusMeta = function () {
      // Return only meta for applicable statuses
      return applicableStatuses.reduce((acc, key) => {
          if(STATUS_META[key]) acc[key] = STATUS_META[key];
          return acc;
      }, {});
    };

  } else {
    // === Referenced Mode ===
    // Assumes a Status model exists with fields like: key, label, transitionsTo, isFinal, etc.
    HistorySchemaDefinition.ref = { type: mongoose.Schema.Types.ObjectId, ref: statusModel, required: true };
    const ReferencedHistorySchema = new mongoose.Schema(HistorySchemaDefinition, { _id: false });
    
    schema.add({
      [field]: { type: mongoose.Schema.Types.ObjectId, ref: statusModel }
    });

    if (trackHistory) {
      schema.add({
        [historyField]: [ReferencedHistorySchema]
      });
    }

    schema.methods.setStatusByRef = async function (statusDocOrId, updatedBy = null, reason = null) {
      if (!statusDocOrId) {
        throw new Error('[StatusPlugin] setStatusByRef requires a status document or ID.');
      }

      const StatusModel = mongoose.model(statusModel);
      let statusDoc;
      let newStatusId;

      if (typeof statusDocOrId === 'string' || statusDocOrId instanceof mongoose.Types.ObjectId) {
        newStatusId = statusDocOrId.toString();
        statusDoc = await StatusModel.findById(newStatusId).lean(); // Use lean for performance
        if (!statusDoc) throw new Error(`[StatusPlugin] Status document not found for ID: ${newStatusId}`);
      } else if (statusDocOrId._id) {
        statusDoc = statusDocOrId; // Assume it's a document
        newStatusId = statusDoc._id.toString();
      } else {
          throw new Error('[StatusPlugin] Invalid argument for setStatusByRef. Expecting document or ID.');
      }

      const currentStatusId = this[field]?.toString();
      if (currentStatusId === newStatusId) return this; // No change

      // Fetch current status doc if needed for transition validation
      let currentStatusDoc = null;
      if (currentStatusId) {
          currentStatusDoc = await StatusModel.findById(currentStatusId).lean();
      }

      const allowedTransitions = currentStatusDoc?.transitionsTo || []; // Assuming transitionsTo stores IDs or keys
      const newStatusKey = statusDoc.key || statusDoc.label; // Assuming status doc has a key/label
      
      // Check transitions
      if (currentStatusDoc && !currentStatusDoc.isFinal && allowedTransitions.length > 0 && !allowedTransitions.includes(newStatusId) && !allowedTransitions.includes(newStatusKey)) {
        throw new Error(`[StatusPlugin] Transition from status ID "${currentStatusId}" to "${newStatusId}" (${newStatusKey}) is not allowed.`);
      }
      if (currentStatusDoc?.isFinal) {
           throw new Error(`[StatusPlugin] Cannot transition from final status ID "${currentStatusId}".`);
      }

      this[field] = statusDoc._id;

      if (trackHistory) {
        this[historyField] = this[historyField] || [];
        this[historyField].push({
          ref: statusDoc._id,
          changedAt: new Date(),
          [userField]: updatedBy ? (updatedBy._id || updatedBy) : undefined,
          reason
        });
        this.markModified(historyField);
      }
      this.markModified(field);
      return this;
    };

    schema.methods.getStatusMeta = async function () {
        if (!this.populated(field)) {
           await this.populate(field);
        }
        return this[field]; // Return the populated status document
    };
    
     schema.methods.getCurrentStatus = async function () {
        // Returns the key/label of the referenced status
        const meta = await this.getStatusMeta();
        return meta?.key || meta?.label || meta?._id.toString(); 
    };
  }

  // Shared methods
  schema.methods.isStatus = async function (statusKeyOrId) {
    if (embedded) {
      return this[field]?.current === statusKeyOrId;
    } else {
      // Compare ObjectId strings or potentially a key/label if the referenced doc has one
      const currentStatusId = this[field]?.toString();
      if (currentStatusId === statusKeyOrId?.toString()) return true;
      
      // If comparing by key/label, need to populate
      const statusDoc = await this.getStatusMeta(); 
      return statusDoc?.key === statusKeyOrId || statusDoc?.label === statusKeyOrId;
    }
  };

  schema.methods.getStatusHistory = function () {
    return this[historyField] || [];
  };
} 