import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Import the immersion module components
import { Immersion } from '../schemas.js';
import { initActions } from '../actions/index.js';
import { IMMERSION_EVENTS } from '../hooks/index.js';
import { IMMERSION_TYPES, AI_MODULES } from '../constants.js';

// Mock MongoDB connection
let mongoServer;
let mockEventBus;
let immersionActions;
let mockUserId;
let mockContext;

beforeAll(async () => {
  // Start an in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  // Create event bus mock
  mockEventBus = {
    emit: jest.fn(),
    on: jest.fn()
  };
  
  // Create logger mock
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })
  };
  
  // Create mock context
  mockContext = {
    eventBus: mockEventBus,
    logger: mockLogger,
    services: {
      ai: {
        generateContent: jest.fn().mockResolvedValue({
          content: "This is AI generated content for testing",
          structuredContent: { sections: ["intro", "body", "conclusion"] },
          recommendedDuration: 15,
          media: []
        })
      }
    }
  };
  
  // Initialize actions with mock context
  immersionActions = initActions(mockContext);
  
  // Create a mock user ID
  mockUserId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  // Disconnect and stop MongoDB server
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

describe('Immersion Module Tests', () => {
  describe('Schema Tests', () => {
    test('should create a valid immersion document', async () => {
      const immersionData = {
        userId: mockUserId,
        title: 'Test Immersion',
        description: 'Test description',
        type: IMMERSION_TYPES.VISUALIZATION,
        content: 'This is a test immersion content for visualization.',
        aiModuleUsed: AI_MODULES.TEXT_GENERATION,
        targetAudience: ['BEGINNERS'],
        metadata: {
          color: '#123456',
          icon: 'meditation',
          recommendedDuration: 10,
          lifeAreas: ['HEALTH', 'PERSONAL_GROWTH']
        }
      };
      
      const immersion = new Immersion(immersionData);
      await immersion.save();
      
      // Check if id was generated
      expect(immersion._id).toBeDefined();
      
      // Check if timestamps were created
      expect(immersion.createdAt).toBeDefined();
      expect(immersion.updatedAt).toBeDefined();
      
      // Check data values
      expect(immersion.title).toBe(immersionData.title);
      expect(immersion.type).toBe(immersionData.type);
      expect(immersion.content).toBe(immersionData.content);
      expect(immersion.metadata.recommendedDuration).toBe(immersionData.metadata.recommendedDuration);
      
      // Check initialization of engagement metrics
      expect(immersion.engagementMetrics).toBeDefined();
      expect(immersion.engagementMetrics.completionRate).toBe(0);
    });
  });
  
  describe('Actions Tests', () => {
    test('should create a new immersion', async () => {
      const immersionData = {
        title: 'Test Immersion',
        description: 'Test description',
        type: IMMERSION_TYPES.VISUALIZATION,
        content: 'This is a test immersion content.',
        targetAudience: ['BEGINNERS'],
        metadata: {
          color: '#123456',
          recommendedDuration: 10
        }
      };
      
      const result = await immersionActions.createImmersion(immersionData, mockUserId);
      
      // Check return value
      expect(result).toBeDefined();
      expect(result.title).toBe(immersionData.title);
      expect(result.userId).toEqual(mockUserId);
      
      // Check event emitted
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        IMMERSION_EVENTS.CREATED,
        expect.objectContaining({
          immersion: expect.objectContaining({
            _id: expect.anything(),
            title: immersionData.title
          }),
          userId: mockUserId
        })
      );
    });
    
    test('should generate an immersion using AI', async () => {
      const generationParams = {
        title: 'AI Generated Immersion',
        type: IMMERSION_TYPES.MEDITATION,
        prompt: 'Create a calming meditation for stress relief',
        aiModule: AI_MODULES.TEXT_GENERATION
      };
      
      const result = await immersionActions.generateImmersion(generationParams, mockUserId);
      
      // Check AI service called
      expect(mockContext.services.ai.generateContent).toHaveBeenCalledWith({
        prompt: generationParams.prompt,
        type: generationParams.type,
        module: generationParams.aiModule
      });
      
      // Check return value
      expect(result).toBeDefined();
      expect(result.title).toBe(generationParams.title);
      expect(result.isGeneratedByAI).toBe(true);
      expect(result.aiModuleUsed).toBe(generationParams.aiModule);
      expect(result.aiPromptUsed).toBe(generationParams.prompt);
      
      // Check event emitted
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        IMMERSION_EVENTS.CREATED,
        expect.objectContaining({
          immersion: expect.objectContaining({
            title: generationParams.title,
            isGeneratedByAI: true
          }),
          userId: mockUserId
        })
      );
    });
    
    test('should start an immersion session', async () => {
      // First create an immersion
      const immersion = await immersionActions.createImmersion({
        title: 'Test Session Immersion',
        type: IMMERSION_TYPES.EXERCISE,
        content: 'Test content'
      }, mockUserId);
      
      // Clear mock to isolate events from this test
      mockEventBus.emit.mockClear();
      
      // Start the session
      const session = await immersionActions.startImmersionSession(immersion._id, mockUserId);
      
      // Check return values
      expect(session).toBeDefined();
      expect(session.success).toBe(true);
      expect(session.startTime).toBeDefined();
      
      // Check event emitted
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        IMMERSION_EVENTS.STARTED,
        expect.objectContaining({
          immersionId: immersion._id,
          userId: mockUserId,
          startTime: expect.any(Date)
        })
      );
      
      // Verify DB updates
      const updatedImmersion = await Immersion.findById(immersion._id);
      expect(updatedImmersion.userProgress).toBeDefined();
      expect(updatedImmersion.userProgress.length).toBe(1);
      expect(updatedImmersion.userProgress[0].userId.toString()).toBe(mockUserId.toString());
      expect(updatedImmersion.userProgress[0].startedAt).toBeDefined();
      expect(updatedImmersion.userProgress[0].isCompleted).toBe(false);
    });
    
    test('should complete an immersion session', async () => {
      // First create an immersion and start it
      const immersion = await immersionActions.createImmersion({
        title: 'Test Complete Immersion',
        type: IMMERSION_TYPES.JOURNEY,
        content: 'Test content'
      }, mockUserId);
      
      await immersionActions.startImmersionSession(immersion._id, mockUserId);
      
      // Clear mock to isolate events from this test
      mockEventBus.emit.mockClear();
      
      // Complete the session with feedback
      const completion = await immersionActions.completeImmersionSession(
        immersion._id, 
        mockUserId,
        {
          rating: 4.5,
          feedback: "Great immersion experience",
          effectiveness: 5
        }
      );
      
      // Check return values
      expect(completion).toBeDefined();
      expect(completion.success).toBe(true);
      expect(completion.completionTime).toBeDefined();
      
      // Check event emitted
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        IMMERSION_EVENTS.COMPLETED,
        expect.objectContaining({
          immersionId: immersion._id,
          userId: mockUserId,
          rating: 4.5
        })
      );
      
      // Verify DB updates
      const updatedImmersion = await Immersion.findById(immersion._id);
      const userProgress = updatedImmersion.userProgress[0];
      
      expect(userProgress.isCompleted).toBe(true);
      expect(userProgress.completedAt).toBeDefined();
      expect(userProgress.rating).toBe(4.5);
      expect(userProgress.feedback).toBe("Great immersion experience");
      expect(userProgress.effectiveness).toBe(5);
    });
    
    test('should recommend immersions for a user', async () => {
      // Create multiple immersions
      await Promise.all([
        immersionActions.createImmersion({
          title: 'Meditation Immersion',
          type: IMMERSION_TYPES.MEDITATION,
          content: 'Meditation content',
          metadata: {
            isPublic: true,
            lifeAreas: ['HEALTH', 'SPIRITUALITY']
          },
          engagementMetrics: {
            userRatings: [5, 4, 5], 
            completionRate: 0.9
          }
        }, mockUserId),
        
        immersionActions.createImmersion({
          title: 'Visualization Immersion',
          type: IMMERSION_TYPES.VISUALIZATION,
          content: 'Visualization content',
          metadata: {
            isPublic: true,
            lifeAreas: ['PERSONAL_GROWTH']
          },
          engagementMetrics: {
            userRatings: [4, 3.5], 
            completionRate: 0.7
          }
        }, mockUserId),
        
        immersionActions.createImmersion({
          title: 'Exercise Immersion',
          type: IMMERSION_TYPES.EXERCISE,
          content: 'Exercise content',
          metadata: {
            isPublic: true,
            lifeAreas: ['HEALTH']
          },
          engagementMetrics: {
            userRatings: [3, 4, 3.5], 
            completionRate: 0.8
          }
        }, mockUserId)
      ]);
      
      // Get recommendations
      const recommendations = await immersionActions.getRecommendedImmersions(
        mockUserId,
        {
          limit: 2,
          lifeAreas: ['HEALTH']
        }
      );
      
      // Check return values
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(2);
      
      // Check that returned immersions match criteria
      for (const immersion of recommendations) {
        expect(immersion.metadata.lifeAreas).toEqual(
          expect.arrayContaining(['HEALTH'])
        );
      }
    });
  });
}); 