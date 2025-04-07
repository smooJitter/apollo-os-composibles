// Example tests for the milestone module
import mongoose from 'mongoose';
import { Milestone } from '../schemas.js';
import { 
  createMilestone, 
  updateMilestoneStatus,
  addSubMilestone, 
  toggleSubMilestoneCompletion,
  updateMilestoneProgress
} from '../actions/index.js';

// Mock dependencies
jest.mock('../schemas.js');

// Mock context
const mockContext = {
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })
  },
  events: {
    emit: jest.fn()
  }
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Milestone Actions', () => {
  describe('createMilestone', () => {
    it('should create a milestone with required fields', async () => {
      // Setup
      const mockMilestone = {
        _id: 'milestone-id',
        save: jest.fn().mockResolvedValue(true)
      };
      Milestone.mockImplementation(() => mockMilestone);
      
      // Execute
      const params = {
        userId: 'user-id',
        title: 'Test Milestone',
        description: 'Test description'
      };
      
      const result = await createMilestone(mockContext, params);
      
      // Assert
      expect(Milestone).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-id',
        title: 'Test Milestone',
        description: 'Test description',
        status: 'planned'
      }));
      expect(mockMilestone.save).toHaveBeenCalled();
      expect(result).toBe(mockMilestone);
    });
    
    it('should throw error if required fields are missing', async () => {
      // Execute & Assert
      await expect(createMilestone(mockContext, { title: 'Test' }))
        .rejects.toThrow('userId is required');
        
      await expect(createMilestone(mockContext, { userId: 'user-id' }))
        .rejects.toThrow('title is required');
    });
  });
  
  describe('updateMilestoneStatus', () => {
    it('should update milestone status when valid transition', async () => {
      // Setup
      const mockMilestone = {
        _id: 'milestone-id',
        userId: 'user-id',
        status: 'planned',
        canTransitionTo: jest.fn().mockReturnValue(true),
        setStatus: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };
      
      Milestone.findOne = jest.fn().mockResolvedValue(mockMilestone);
      
      // Execute
      const params = {
        milestoneId: 'milestone-id',
        userId: 'user-id',
        status: 'in_progress'
      };
      
      const result = await updateMilestoneStatus(mockContext, params);
      
      // Assert
      expect(Milestone.findOne).toHaveBeenCalledWith({
        _id: 'milestone-id',
        userId: 'user-id'
      });
      expect(mockMilestone.canTransitionTo).toHaveBeenCalledWith('in_progress');
      expect(mockMilestone.setStatus).toHaveBeenCalled();
      expect(mockMilestone.save).toHaveBeenCalled();
      expect(result).toBe(mockMilestone);
    });
    
    it('should throw error when transition is not allowed', async () => {
      // Setup
      const mockMilestone = {
        _id: 'milestone-id',
        userId: 'user-id',
        status: 'abandoned',
        canTransitionTo: jest.fn().mockReturnValue(false)
      };
      
      Milestone.findOne = jest.fn().mockResolvedValue(mockMilestone);
      
      // Execute & Assert
      const params = {
        milestoneId: 'milestone-id',
        userId: 'user-id',
        status: 'in_progress'
      };
      
      await expect(updateMilestoneStatus(mockContext, params))
        .rejects.toThrow('Cannot transition from abandoned to in_progress');
    });
  });
  
  describe('addSubMilestone', () => {
    it('should add a sub-milestone to a milestone', async () => {
      // Setup
      const mockMilestone = {
        _id: 'milestone-id',
        userId: 'user-id',
        subMilestones: [],
        save: jest.fn().mockResolvedValue(true)
      };
      
      Milestone.findOne = jest.fn().mockResolvedValue(mockMilestone);
      
      // Execute
      const params = {
        milestoneId: 'milestone-id',
        userId: 'user-id',
        title: 'Sub-milestone',
        description: 'Sub-milestone description'
      };
      
      const result = await addSubMilestone(mockContext, params);
      
      // Assert
      expect(Milestone.findOne).toHaveBeenCalledWith({
        _id: 'milestone-id',
        userId: 'user-id'
      });
      
      expect(mockMilestone.subMilestones.length).toBe(1);
      expect(mockMilestone.subMilestones[0]).toEqual(expect.objectContaining({
        title: 'Sub-milestone',
        description: 'Sub-milestone description',
        completed: false,
        order: 0
      }));
      
      expect(mockMilestone.save).toHaveBeenCalled();
      expect(result).toBe(mockMilestone);
    });
  });
  
  describe('toggleSubMilestoneCompletion', () => {
    it('should toggle a sub-milestone completion status', async () => {
      // Setup
      const subMilestoneId = new mongoose.Types.ObjectId();
      const mockMilestone = {
        _id: 'milestone-id',
        userId: 'user-id',
        status: 'in_progress',
        subMilestones: [
          {
            _id: subMilestoneId,
            title: 'Sub-milestone',
            completed: false
          }
        ],
        setStatus: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };
      
      Milestone.findOne = jest.fn().mockResolvedValue(mockMilestone);
      
      // Execute
      const params = {
        milestoneId: 'milestone-id',
        userId: 'user-id',
        subMilestoneId: subMilestoneId.toString()
      };
      
      const result = await toggleSubMilestoneCompletion(mockContext, params);
      
      // Assert
      expect(Milestone.findOne).toHaveBeenCalledWith({
        _id: 'milestone-id',
        userId: 'user-id'
      });
      
      expect(mockMilestone.subMilestones[0].completed).toBe(true);
      expect(mockMilestone.subMilestones[0].completedDate).toBeDefined();
      expect(mockMilestone.progressPercentage).toBe(100);
      expect(mockMilestone.save).toHaveBeenCalled();
      expect(result).toBe(mockMilestone);
    });
  });
  
  describe('updateMilestoneProgress', () => {
    it('should update progress percentage for a regular milestone', async () => {
      // Setup
      const mockMilestone = {
        _id: 'milestone-id',
        userId: 'user-id',
        milestoneType: 'achievement',
        progressPercentage: 50,
        status: 'in_progress',
        setStatus: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };
      
      Milestone.findOne = jest.fn().mockResolvedValue(mockMilestone);
      
      // Execute
      const params = {
        milestoneId: 'milestone-id',
        userId: 'user-id',
        progressPercentage: 75
      };
      
      const result = await updateMilestoneProgress(mockContext, params);
      
      // Assert
      expect(Milestone.findOne).toHaveBeenCalledWith({
        _id: 'milestone-id',
        userId: 'user-id'
      });
      
      expect(mockMilestone.progressPercentage).toBe(75);
      expect(mockMilestone.setStatus).not.toHaveBeenCalled(); // Not called because < 90%
      expect(mockMilestone.save).toHaveBeenCalled();
      expect(result).toBe(mockMilestone);
    });
    
    it('should update current value for a threshold milestone', async () => {
      // Setup
      const mockMilestone = {
        _id: 'milestone-id',
        userId: 'user-id',
        milestoneType: 'threshold',
        thresholdValue: 100,
        currentValue: 50,
        progressPercentage: 50,
        status: 'in_progress',
        setStatus: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };
      
      Milestone.findOne = jest.fn().mockResolvedValue(mockMilestone);
      
      // Execute
      const params = {
        milestoneId: 'milestone-id',
        userId: 'user-id',
        currentValue: 95
      };
      
      const result = await updateMilestoneProgress(mockContext, params);
      
      // Assert
      expect(Milestone.findOne).toHaveBeenCalledWith({
        _id: 'milestone-id',
        userId: 'user-id'
      });
      
      expect(mockMilestone.currentValue).toBe(95);
      expect(mockMilestone.progressPercentage).toBe(95);
      expect(mockMilestone.setStatus).toHaveBeenCalledWith('nearly_complete', 'Progress at or above 90%');
      expect(mockMilestone.save).toHaveBeenCalled();
      expect(result).toBe(mockMilestone);
    });
  });
}); 