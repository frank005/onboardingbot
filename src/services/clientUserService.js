/**
 * Client-side user service - replaces server API calls
 * All user data is now stored in localStorage for deployment compatibility
 */

class ClientUserService {
  constructor() {
    this.storageKey = 'onboardingBotUsers';
    this.currentUserKey = 'onboardingBotCurrentUser';
  }

  // Generate a unique user ID
  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all users from localStorage
  getUsers() {
    try {
      const users = localStorage.getItem(this.storageKey);
      return users ? JSON.parse(users) : {};
    } catch (error) {
      console.warn('Failed to load users from localStorage:', error);
      return {};
    }
  }

  // Save users to localStorage
  saveUsers(users) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(users));
    } catch (error) {
      console.warn('Failed to save users to localStorage:', error);
    }
  }

  // Create or get current user
  async getCurrentUser() {
    try {
      const currentUserId = localStorage.getItem(this.currentUserKey);
      if (currentUserId) {
        const users = this.getUsers();
        return users[currentUserId] || null;
      }
      return null;
    } catch (error) {
      console.warn('Failed to get current user:', error);
      return null;
    }
  }

  // Create a new user
  async createUser(userData = {}) {
    try {
      // Use provided ID if it exists, otherwise generate new one
      const userId = userData.id || this.generateUserId();
      const user = {
        id: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {},
        conversationData: [],
        detectedInfo: [],
        onboardingComplete: false,
        ...userData
      };

      const users = this.getUsers();
      users[userId] = user;
      this.saveUsers(users);

      // Set as current user
      localStorage.setItem(this.currentUserKey, userId);

      return user;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, profileUpdates) {
    try {
      const users = this.getUsers();
      if (!users[userId]) {
        throw new Error('User not found');
      }

      users[userId].profile = {
        ...users[userId].profile,
        ...profileUpdates
      };
      users[userId].updatedAt = new Date().toISOString();

      this.saveUsers(users);
      return users[userId];
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const users = this.getUsers();
      const user = users[userId];
      return user ? user.profile : null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  // Add detected information
  async addDetectedInfo(userId, detectedInfo) {
    try {
      const users = this.getUsers();
      if (!users[userId]) {
        throw new Error('User not found');
      }

      if (!users[userId].detectedInfo) {
        users[userId].detectedInfo = [];
      }

      // Add timestamp to detected info
      const infoWithTimestamp = {
        ...detectedInfo,
        detectedAt: new Date().toISOString()
      };

      users[userId].detectedInfo.push(infoWithTimestamp);
      users[userId].updatedAt = new Date().toISOString();

      // Update profile with detected info
      if (detectedInfo.name) {
        users[userId].profile.name = detectedInfo.name;
      }
      if (detectedInfo.birthday) {
        users[userId].profile.birthday = detectedInfo.birthday;
      }
      if (detectedInfo.interests) {
        users[userId].profile.interests = detectedInfo.interests;
      }
      if (detectedInfo.bio) {
        users[userId].profile.bio = detectedInfo.bio;
      }
      if (detectedInfo.experienceLevel) {
        users[userId].profile.experienceLevel = detectedInfo.experienceLevel;
      }
      if (detectedInfo.location) {
        users[userId].profile.location = detectedInfo.location;
      }
      if (detectedInfo.phone) {
        users[userId].profile.phone = detectedInfo.phone;
      }
      if (detectedInfo.email) {
        users[userId].profile.email = detectedInfo.email;
      }
      if (detectedInfo.website) {
        users[userId].profile.website = detectedInfo.website;
      }
      if (detectedInfo.socialHandles) {
        users[userId].profile.socialHandles = detectedInfo.socialHandles;
      }

      this.saveUsers(users);
      return users[userId];
    } catch (error) {
      console.error('Failed to add detected info:', error);
      throw error;
    }
  }

  // Get detected information
  async getDetectedInfo(userId) {
    try {
      const users = this.getUsers();
      const user = users[userId];
      return user ? user.detectedInfo : [];
    } catch (error) {
      console.error('Failed to get detected info:', error);
      return [];
    }
  }

  // Add conversation data
  async addConversationData(userId, conversationData) {
    try {
      const users = this.getUsers();
      if (!users[userId]) {
        throw new Error('User not found');
      }

      if (!users[userId].conversationData) {
        users[userId].conversationData = [];
      }

      // Add timestamp to conversation data
      const dataWithTimestamp = {
        ...conversationData,
        addedAt: new Date().toISOString()
      };

      users[userId].conversationData.push(dataWithTimestamp);
      users[userId].updatedAt = new Date().toISOString();

      this.saveUsers(users);
      return users[userId];
    } catch (error) {
      console.error('Failed to add conversation data:', error);
      throw error;
    }
  }

  // Get conversation data
  async getConversationData(userId) {
    try {
      const users = this.getUsers();
      const user = users[userId];
      return user ? user.conversationData : [];
    } catch (error) {
      console.error('Failed to get conversation data:', error);
      return [];
    }
  }

  // Mark onboarding as complete
  async markOnboardingComplete(userId) {
    try {
      const users = this.getUsers();
      if (!users[userId]) {
        throw new Error('User not found');
      }

      users[userId].onboardingComplete = true;
      users[userId].updatedAt = new Date().toISOString();

      this.saveUsers(users);
      return users[userId];
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
      throw error;
    }
  }

  // Check if onboarding is complete
  async isOnboardingComplete(userId) {
    try {
      const users = this.getUsers();
      const user = users[userId];
      return user ? user.onboardingComplete : false;
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const users = this.getUsers();
      return users[userId] || null;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const users = this.getUsers();
      if (users[userId]) {
        delete users[userId];
        this.saveUsers(users);

        // If this was the current user, clear current user
        const currentUserId = localStorage.getItem(this.currentUserKey);
        if (currentUserId === userId) {
          localStorage.removeItem(this.currentUserKey);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  // Clear all data (for testing/reset)
  async clearAllData() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.currentUserKey);
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  // Export user data
  async exportUserData(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        ...user,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  // Import user data
  async importUserData(userData) {
    try {
      const { id, ...userDataWithoutId } = userData;
      const userId = id || this.generateUserId();
      
      const user = {
        id: userId,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...userDataWithoutId
      };

      const users = this.getUsers();
      users[userId] = user;
      this.saveUsers(users);

      return user;
    } catch (error) {
      console.error('Failed to import user data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new ClientUserService();
