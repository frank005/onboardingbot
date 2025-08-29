const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await userService.createUser(userId);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      error: 'Failed to create user',
      message: error.message 
    });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await userService.getUser(userId);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ 
      error: 'Failed to get user',
      message: error.message 
    });
  }
});

// Update user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const user = await userService.updateUser(userId, updates);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      error: 'Failed to update user',
      message: error.message 
    });
  }
});

// Update user profile
router.put('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    const user = await userService.updateProfile(userId, profileData);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      error: 'Failed to update user profile',
      message: error.message 
    });
  }
});

// Update detected information
router.put('/:userId/detected-info', async (req, res) => {
  try {
    const { userId } = req.params;
    const detectedInfo = req.body;
    
    const user = await userService.updateDetectedInfo(userId, detectedInfo);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error updating detected info:', error);
    res.status(500).json({ 
      error: 'Failed to update detected info',
      message: error.message 
    });
  }
});

// Complete onboarding
router.post('/:userId/complete-onboarding', async (req, res) => {
  try {
    const { userId } = req.params;
    const onboardingData = req.body;
    
    const user = await userService.completeOnboarding(userId, onboardingData);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ 
      error: 'Failed to complete onboarding',
      message: error.message 
    });
  }
});

// Reset user
router.post('/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await userService.resetUser(userId);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error resetting user:', error);
    res.status(500).json({ 
      error: 'Failed to reset user',
      message: error.message 
    });
  }
});

// Get user analytics
router.get('/:userId/analytics', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const analytics = await userService.getUserAnalytics(userId);
    
    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get user analytics',
      message: error.message 
    });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const { onboardingCompleted, search } = req.query;
    
    let users;
    
    if (search) {
      users = await userService.searchUsers(search);
    } else if (onboardingCompleted !== undefined) {
      const completed = onboardingCompleted === 'true';
      users = await userService.getUsersByOnboardingStatus(completed);
    } else {
      users = await userService.getAllUsers();
    }
    
    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ 
      error: 'Failed to get users',
      message: error.message 
    });
  }
});

// Get user statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await userService.getUserStatistics();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get user statistics',
      message: error.message 
    });
  }
});

// Delete user
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await userService.deleteUser(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      error: 'Failed to delete user',
      message: error.message 
    });
  }
});

// Export user data
router.get('/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userData = await userService.exportUserData(userId);
    
    res.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ 
      error: 'Failed to export user data',
      message: error.message 
    });
  }
});

// Import user data
router.post('/import', async (req, res) => {
  try {
    const userData = req.body;
    
    const user = await userService.importUserData(userData);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error importing user data:', error);
    res.status(500).json({ 
      error: 'Failed to import user data',
      message: error.message 
    });
  }
});

// Get users by onboarding status
router.get('/by-status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const completed = status === 'completed';
    
    const users = await userService.getUsersByOnboardingStatus(completed);
    
    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error getting users by status:', error);
    res.status(500).json({ 
      error: 'Failed to get users by status',
      message: error.message 
    });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    const users = await userService.searchUsers(query);
    
    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      error: 'Failed to search users',
      message: error.message 
    });
  }
});

module.exports = router; 