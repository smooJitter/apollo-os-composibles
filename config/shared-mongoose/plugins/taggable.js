// plugins/taggableTyped.js
function taggableTypedPlugin(schema, options = {}) {
    const tagField = options.field || 'tags';
  
    schema.add({
      [tagField]: [{
        name: { type: String, required: true },
        type: { type: String, default: 'custom' }
      }]
    });
  
    schema.methods.addTag = function (name, type = 'custom') {
      const exists = this[tagField].some(
        tag => tag.name.toLowerCase() === name.toLowerCase() && tag.type === type
      );
      if (!exists) {
        this[tagField].push({ name: name.toLowerCase(), type });
      }
      return this;
    };
  
    schema.methods.findTagsByType = function (type) {
      return this[tagField].filter(tag => tag.type === type);
    };
  }
  



  // models/Tag.js
const tagSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, lowercase: true },
    type: { 
      type: String, 
      enum: ['topic', 'status', 'label', 'category', 'color', 'sentiment', 'custom'], 
      default: 'custom' 
    },
    description: String,
    synonyms: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    global: { type: Boolean, default: true }
  }, { timestamps: true });
  
  module.exports = mongoose.model('Tag', tagSchema);
  





  // plugin/lastModified.js
function lastModifiedPlugin(schema, options) {
    schema.add({ updatedAt: Date });
  
    schema.pre('save', function (next) {
      this.updatedAt = new Date();
      next();
    });
  }
  
  module.exports = lastModifiedPlugin;
  