// config/shared-mongoose/index.js
import { timestampsPlugin } from './plugins/timestamps.js';
import { taggablePlugin } from './plugins/taggable.js';
import { taggableFlexPlugin } from './plugins/taggable-flex.js';
import { taggableFlexWeightedPlugin } from './plugins/taggableFlexWeighted.js';
import { statusTrackableWithMetaPlugin } from './plugins/statusTrackableWithMeta.js';
import { timetrackablePlugin } from './plugins/timetrackable.js';
import { scoreablePlugin } from './plugins/scoreable.js';
import { scoreableFlexPlugin } from './plugins/scoreable-flex.js';
import { flaggablePlugin } from './plugins/flaggable.js';
import { engageablePlugin } from './plugins/engageable.js';
import { statusTrackableFlexPlugin } from './plugins/status-trackable-flex.js';

export const plugins = {
  timestamps: timestampsPlugin,
  taggable: taggablePlugin,
  taggableFlex: taggableFlexPlugin,
  taggableFlexWeighted: taggableFlexWeightedPlugin,
  statusTrackableWithMeta: statusTrackableWithMetaPlugin,
  timetrackable: timetrackablePlugin,
  scoreable: scoreablePlugin,
  scoreableFlex: scoreableFlexPlugin,
  flaggable: flaggablePlugin,
  engageable: engageablePlugin,
  statusTrackableFlex: statusTrackableFlexPlugin,
  // Add other shared plugins here
};

export const schemas = {};

// You can also export shared base schemas or configurations
// export const baseSchemaConfig = { ... };
