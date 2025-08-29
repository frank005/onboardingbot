const { v4: uuidv4 } = require('uuid');

class UserService {
  constructor() {
    // In-memory storage for demo purposes
    // In production, this would be a database
    this.users = new Map();
    this.userProfiles = new Map();
    this.onboardingData = new Map();
  }

  // Create a new user
  async createUser(userId = null) {
    const id = userId || uuidv4();
    const user = {
      id,
      createdAt: new Date().toISOString(),
      status: 'active',
      onboardingCompleted: false,
      profile: {},
      detectedInfo: {},
      conversationData: {}
    };

    this.users.set(id, user);
    return user;
  }

  // Get user by ID
  async getUser(userId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Update user data
  async updateUser(userId, updates) {
    const user = await this.getUser(userId);
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Update user profile
  async updateProfile(userId, profileData) {
    const user = await this.getUser(userId);
    
    const updatedProfile = {
      ...user.profile,
      ...profileData,
      updatedAt: new Date().toISOString()
    };

    const updatedUser = {
      ...user,
      profile: updatedProfile,
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Update user profile
  async updateUserProfile(userId, profileData) {
    const user = await this.getUser(userId);
    
    const updatedProfile = {
      ...user.profile,
      ...profileData,
      updatedAt: new Date().toISOString()
    };

    const updatedUser = {
      ...user,
      profile: updatedProfile,
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    console.log(`✅ Updated profile for user ${userId}:`, profileData);
    return updatedUser;
  }

  // Update detected information
  async updateDetectedInfo(userId, detectedInfo) {
    const user = await this.getUser(userId);
    
    const updatedDetectedInfo = {
      ...user.detectedInfo,
      ...detectedInfo,
      updatedAt: new Date().toISOString()
    };

    const updatedUser = {
      ...user,
      detectedInfo: updatedDetectedInfo,
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    console.log(`✅ Updated detected info for user ${userId}:`, detectedInfo);
    return updatedUser;
  }

  // Complete onboarding
  async completeOnboarding(userId, onboardingData) {
    const user = await this.getUser(userId);
    
    const updatedUser = {
      ...user,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
      profile: {
        ...user.profile,
        ...onboardingData.formData
      },
      detectedInfo: {
        ...user.detectedInfo,
        ...onboardingData.detectedInfo
      },
      conversationData: {
        ...user.conversationData,
        completedTopics: onboardingData.completedTopics,
        conversationLength: onboardingData.conversationLength
      },
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Reset user data
  async resetUser(userId) {
    const user = await this.getUser(userId);
    
    const resetUser = {
      ...user,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      profile: {},
      detectedInfo: {},
      conversationData: {},
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, resetUser);
    return resetUser;
  }

  // Get user analytics
  async getUserAnalytics(userId) {
    const user = await this.getUser(userId);
    
    return {
      userId: user.id,
      onboardingCompleted: user.onboardingCompleted,
      onboardingDuration: user.onboardingCompletedAt ? 
        (new Date(user.onboardingCompletedAt) - new Date(user.createdAt)) / 1000 : null,
      profileCompleteness: this.calculateProfileCompleteness(user.profile),
      detectedInfoCount: Object.keys(user.detectedInfo || {}).length,
      conversationLength: user.conversationData?.conversationLength || 0,
      completedTopics: user.conversationData?.completedTopics || []
    };
  }

  // Calculate profile completeness percentage
  calculateProfileCompleteness(profile) {
    const requiredFields = ['name', 'birthday'];
    const optionalFields = ['bio', 'interests', 'experience_level'];
    const allFields = [...requiredFields, ...optionalFields];
    
    const completedFields = allFields.filter(field => 
      profile[field] && profile[field].toString().trim() !== ''
    );
    
    return (completedFields.length / allFields.length) * 100;
  }

  // Get all users
  async getAllUsers() {
    return Array.from(this.users.values());
  }

  // Get users by onboarding status
  async getUsersByOnboardingStatus(completed = null) {
    const users = await this.getAllUsers();
    
    if (completed === null) {
      return users;
    }
    
    return users.filter(user => user.onboardingCompleted === completed);
  }

  // Get user statistics
  async getUserStatistics() {
    const users = await this.getAllUsers();
    
    const stats = {
      totalUsers: users.length,
      completedOnboarding: users.filter(u => u.onboardingCompleted).length,
      pendingOnboarding: users.filter(u => !u.onboardingCompleted).length,
      averageProfileCompleteness: 0,
      topDetectedInterests: {},
      averageConversationLength: 0
    };

    if (users.length > 0) {
      // Calculate average profile completeness
      const totalCompleteness = users.reduce((sum, user) => 
        sum + this.calculateProfileCompleteness(user.profile), 0
      );
      stats.averageProfileCompleteness = totalCompleteness / users.length;

      // Calculate average conversation length
      const totalConversationLength = users.reduce((sum, user) => 
        sum + (user.conversationData?.conversationLength || 0), 0
      );
      stats.averageConversationLength = totalConversationLength / users.length;

      // Find top detected interests
      const interestCounts = {};
      users.forEach(user => {
        if (user.detectedInfo?.interests) {
          const interests = user.detectedInfo.interests.split(',').map(i => i.trim());
          interests.forEach(interest => {
            interestCounts[interest] = (interestCounts[interest] || 0) + 1;
          });
        }
      });
      
      stats.topDetectedInterests = Object.entries(interestCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
    }

    return stats;
  }

  // Search users
  async searchUsers(query) {
    const users = await this.getAllUsers();
    
    return users.filter(user => {
      const searchText = JSON.stringify(user).toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }

  // Delete user
  async deleteUser(userId) {
    const user = await this.getUser(userId);
    this.users.delete(userId);
    return { success: true, deletedUser: user };
  }

  // Export user data
  async exportUserData(userId) {
    const user = await this.getUser(userId);
    
    return {
      userId: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt,
      profile: user.profile,
      detectedInfo: user.detectedInfo,
      conversationData: user.conversationData,
      analytics: await this.getUserAnalytics(userId)
    };
  }

  // Import user data
  async importUserData(userData) {
    const user = {
      id: userData.userId,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      status: 'active',
      onboardingCompleted: userData.onboardingCompleted,
      onboardingCompletedAt: userData.onboardingCompletedAt,
      profile: userData.profile || {},
      detectedInfo: userData.detectedInfo || {},
      conversationData: userData.conversationData || {}
    };

    this.users.set(user.id, user);
    return user;
  }
}

module.exports = new UserService(); 