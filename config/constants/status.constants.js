const STATUS_META = {
  draft: {
    label: 'Draft',
    type: 'content',
    color: '#ccc',
    icon: '📝',
    transitionsTo: ['review'],
  },
  review: {
    label: 'In Review',
    type: 'content',
    color: '#ffa500',
    icon: '🔍',
    transitionsTo: ['published', 'archived'],
  },
  published: {
    label: 'Published',
    type: 'content',
    color: '#4caf50',
    icon: '✅',
    transitionsTo: ['archived'],
  },
  archived: {
    label: 'Archived',
    type: 'content',
    color: '#607d8b',
    icon: '🗃️',
    isFinal: true,
  },
};

const STATUS_ENUMS = Object.keys(STATUS_META);

// Using ES Module export syntax
export { STATUS_META, STATUS_ENUMS };
