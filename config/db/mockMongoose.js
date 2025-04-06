import EventEmitter from 'events';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a robust mock MongoDB service for development and testing
 * This provides a more complete in-memory implementation of mongoose
 * than the simple version in mongoose.js
 */
export function createMockMongoose(ctx) {
  const { logger } = ctx;
  logger.info('[MockMongoose] Initializing mock database service');

  // In-memory data store for collections
  const collections = {
    User: [] // Initialize the Users collection by default
  };
  
  // Create a mock connection that emits events like a real mongoose connection
  const mockConnection = new EventEmitter();
  mockConnection.db = { collection: (name) => ({ collectionName: name }) };
  mockConnection.models = {};
  
  // Mock mongoose instance
  const mockMongoose = {
    // Store schemas and models for reference
    schemas: {},
    models: {},
    connection: mockConnection,
    
    // Create a Schema constructor
    Schema: function(definition, options = {}) {
      this.definition = definition;
      this.options = options;
      this.methods = {};
      this.statics = {};
      this.virtuals = {};
      this.hooks = {
        pre: {},
        post: {}
      };
      
      // Add plugin support
      this.plugin = function(pluginFunc, options = {}) {
        pluginFunc(this, options);
        return this;
      };
      
      // Add pre hook support
      this.pre = function(hookName, callback) {
        if (!this.hooks.pre[hookName]) this.hooks.pre[hookName] = [];
        this.hooks.pre[hookName].push(callback);
        return this;
      };
      
      // Add post hook support
      this.post = function(hookName, callback) {
        if (!this.hooks.post[hookName]) this.hooks.post[hookName] = [];
        this.hooks.post[hookName].push(callback);
        return this;
      };
      
      // Add method support
      this.methods = {};
      
      // Add static method support
      this.statics = {};
      
      return this;
    },
    
    // Create a Model constructor
    model: function(modelName, schema) {
      logger.debug(`[MockMongoose] Registering model: ${modelName}`);
      
      // If the model already exists, return it
      if (mockMongoose.models[modelName]) {
        return mockMongoose.models[modelName];
      }
      
      // Initialize collection if it doesn't exist
      if (!collections[modelName]) {
        collections[modelName] = [];
      }
      
      // Store schema reference
      mockMongoose.schemas[modelName] = schema;
      
      // Create mock Document constructor
      function MockDocument(data = {}) {
        // Handle _id
        this._id = data._id || uuidv4();
        
        // Copy data to document
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            this[key] = data[key];
          }
        }
        
        // Include timestamps if they're enabled in schema options
        if (schema.options && schema.options.timestamps) {
          const now = new Date();
          this.createdAt = data.createdAt || now;
          this.updatedAt = now;
        }
        
        // Add _doc property to mirror mongoose behavior
        this._doc = { ...this };
        
        // Add methods
        for (const methodName in schema.methods) {
          this[methodName] = schema.methods[methodName].bind(this);
        }
        
        // Add isModified method
        this.isModified = function(path) {
          return true; // Simplified for mock
        };
        
        // Add save method with hook support
        this.save = async function() {
          // Run pre save hooks
          if (schema.hooks && schema.hooks.pre.save) {
            for (const hook of schema.hooks.pre.save) {
              await new Promise(resolve => hook.call(this, resolve));
            }
          }
          
          // Save to collection
          const existingIndex = collections[modelName].findIndex(doc => doc._id.toString() === this._id.toString());
          if (existingIndex >= 0) {
            collections[modelName][existingIndex] = this;
          } else {
            collections[modelName].push(this);
          }
          
          // Run post save hooks
          if (schema.hooks && schema.hooks.post.save) {
            for (const hook of schema.hooks.post.save) {
              hook.call(this);
            }
          }
          
          return this;
        };
        
        // Add comparePassword method for any model
        this.comparePassword = async function(candidatePassword) {
          return await bcrypt.compare(candidatePassword, this.password);
        };
      }
      
      // Define static methods on the model
      MockDocument.modelName = modelName;
      MockDocument.schema = schema;
      
      // findById: Get a document by ID
      MockDocument.findById = async function(id) {
        const result = collections[modelName].find(doc => doc._id.toString() === id.toString());
        if (!result) return null;
        return new MockDocument(result);
      };
      
      // findOne: Get a document by filter
      MockDocument.findOne = async function(filter = {}) {
        logger.debug(`[MockMongoose] findOne on ${modelName} called with filter: ${JSON.stringify(filter)}`);
        
        // First check if the collection exists
        if (!collections[modelName]) {
          logger.debug(`[MockMongoose] Collection ${modelName} doesn't exist yet`);
          return null;
        }
        
        // Log what's in the collection
        logger.debug(`[MockMongoose] ${modelName} collection has ${collections[modelName].length} items`);
        
        let result = null;
        
        // If filtering by email, do a case-insensitive search
        if (filter.email) {
          const targetEmail = filter.email.toLowerCase();
          result = collections[modelName].find(doc => 
            doc.email && doc.email.toLowerCase() === targetEmail);
        } 
        // Otherwise apply all filters
        else {
          result = collections[modelName].find(doc => {
            for (const key in filter) {
              if (doc[key] !== filter[key]) return false;
            }
            return true;
          });
        }
        
        logger.debug(`[MockMongoose] findOne result for ${modelName}: ${result ? 'found' : 'not found'}`);
        
        if (!result) return null;
        return new MockDocument(result);
      };
      
      // find: Get documents by filter
      MockDocument.find = async function(filter = {}) {
        let results = collections[modelName];
        
        // Apply filters if provided
        if (Object.keys(filter).length > 0) {
          results = results.filter(doc => {
            for (const key in filter) {
              if (doc[key] !== filter[key]) return false;
            }
            return true;
          });
        }
        
        // Convert to MockDocuments
        return results.map(doc => new MockDocument(doc));
      };
      
      // create: Create a new document
      MockDocument.create = async function(data) {
        const doc = new MockDocument(data);
        await doc.save();
        return doc;
      };
      
      // Add query builder methods for chainability
      MockDocument.limit = function(n) {
        this._limit = n;
        return this;
      };
      
      MockDocument.skip = function(n) {
        this._skip = n;
        return this;
      };
      
      MockDocument.sort = function(criteria) {
        this._sort = criteria;
        return this;
      };
      
      MockDocument.select = function(fields) {
        this._select = fields;
        return this;
      };
      
      MockDocument.populate = function(fields) {
        this._populate = fields;
        return this;
      };
      
      // Add static methods from schema
      for (const staticName in schema.statics) {
        MockDocument[staticName] = schema.statics[staticName];
      }
      
      // Register the model
      mockMongoose.models[modelName] = MockDocument;
      mockConnection.models[modelName] = MockDocument;
      
      // If there are any pending "on.modelRegistered" hooks for this model, run them
      if (mockMongoose.on && mockMongoose.on.modelRegistered && mockMongoose.on.modelRegistered[modelName]) {
        mockMongoose.on.modelRegistered[modelName]();
      }
      
      return MockDocument;
    },
    
    // Helper to connect (mock doesn't actually connect)
    connect: async function() {
      logger.info('[MockMongoose] Mock database connection established');
      mockConnection.emit('connected');
      return mockConnection;
    },
    
    // Helper to reference primitive types
    Schema: {
      Types: {
        ObjectId: String,
        Mixed: Object,
        String: String,
        Number: Number,
        Date: Date,
        Buffer: Buffer,
        Boolean: Boolean,
        Map: Map,
        Array
      }
    }
  };
  
  // Add seed data for User model (to support login testing)
  if (mockMongoose.models.User) {
    const passwordHash = bcrypt.hashSync('password123', 10);
    const userData = {
      _id: 'seed-user-id-123',
      name: 'Test User',
      email: 'test@example.com',
      password: passwordHash,
      role: 'user',
      active: true
    };
    
    collections.User = [userData];
    logger.info('[MockMongoose] Seeded test user: test@example.com');
  } else {
    // If User model doesn't exist yet, set up a loader for when it's registered
    mockMongoose.on = mockMongoose.on || {};
    mockMongoose.on.modelRegistered = mockMongoose.on.modelRegistered || {};
    mockMongoose.on.modelRegistered.User = function() {
      const passwordHash = bcrypt.hashSync('password123', 10);
      const userData = {
        _id: 'seed-user-id-123',
        name: 'Test User',
        email: 'test@example.com',
        password: passwordHash,
        role: 'user',
        active: true
      };
      
      collections.User = [userData];
      logger.info('[MockMongoose] Seeded test user: test@example.com');
    };
  }
  
  return mockMongoose;
} 