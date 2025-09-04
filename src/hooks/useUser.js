import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import clientUserService from '../services/clientUserService';

export const useUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const createNewUser = useCallback(async () => {
    const newUser = {
      id: `user_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active',
      onboardingCompleted: false,
      profile: {
        name: 'Guest User',
        birthday: 'Not provided',
        bio: 'Not provided',
        interests: 'Not provided',
        experience: 'Not provided',
        location: 'Not provided',
        phone: 'Not provided',
        email: 'Not provided',
        website: 'Not provided',
        socialHandles: []
      },
      detectedInfo: {},
      conversationData: {}
    };
    
    // Create user in both sessionStorage and clientUserService
    setUser(newUser);
    sessionStorage.setItem('conversational-ai-user', JSON.stringify(newUser));
    
    try {
      await clientUserService.createUser(newUser);
      console.log('✅ User created in clientUserService:', newUser.id);
    } catch (error) {
      console.error('❌ Failed to create user in clientUserService:', error);
    }
  }, []);

  useEffect(() => {
    // Load user from sessionStorage or create new user
    const loadOrCreateUser = async () => {
      const savedUser = sessionStorage.getItem('conversational-ai-user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Ensure user exists in clientUserService
          try {
            await clientUserService.updateUserProfile(parsedUser.id, parsedUser.profile || {});
            console.log('✅ User synced with clientUserService:', parsedUser.id);
          } catch (error) {
            console.warn('⚠️ User not found in clientUserService, creating...');
            await createNewUser();
          }
        } catch (error) {
          console.error('Error parsing saved user:', error);
          await createNewUser();
        }
      } else {
        await createNewUser();
      }
    };
    
    loadOrCreateUser();
  }, [createNewUser]);

  const updateUser = useCallback(async (updates) => {
    // Use functional update to get the current user state
    setUser(currentUser => {
      if (!currentUser) return currentUser;

      console.log('🔄 updateUser called with:', updates);
      console.log('🔄 Current user:', currentUser);

      // Ensure profile object exists
      const currentProfile = currentUser.profile || {};
      
      // Handle both direct profile updates and nested profile updates
      let profileUpdates = updates;
      if (updates.profile) {
        // If updates.profile exists, merge it with current profile
        profileUpdates = { ...currentProfile, ...updates.profile };
        console.log('🔄 Merging nested profile updates:', { currentProfile, updates: updates.profile, result: profileUpdates });
      } else {
        // Otherwise, treat updates as direct profile updates
        profileUpdates = { ...currentProfile, ...updates };
        console.log('🔄 Merging direct profile updates:', { currentProfile, updates, result: profileUpdates });
      }
      
      console.log('🔄 Current profile:', currentProfile);
      console.log('🔄 Updates:', updates);
      console.log('🔄 Profile updates:', profileUpdates);
      
      const updatedUser = {
        ...currentUser,
        profile: profileUpdates,
        updatedAt: new Date().toISOString()
      };

      // Update sessionStorage
      sessionStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));
      
      return updatedUser;
    });

    // Update user using client-side service (need to get current user for ID)
    const currentUser = user;
    if (currentUser?.id) {
      try {
        // First, try to get the user to see if they exist
        const existingUser = await clientUserService.getUserById(currentUser.id);
        if (!existingUser) {
          // User doesn't exist, create them first
          console.log('🔄 User not found in clientUserService, creating first:', currentUser.id);
          await clientUserService.createUser(currentUser);
          console.log('✅ User created in clientUserService:', currentUser.id);
        }
        
        // Now update the profile - pass profileUpdates directly, not wrapped in profile object
        await clientUserService.updateUserProfile(currentUser.id, updates);
        console.log('✅ User profile updated in clientUserService:', currentUser.id);
      } catch (error) {
        console.error('❌ Error updating user profile:', error);
        // If update still fails, try to recreate
        try {
          await clientUserService.createUser(currentUser);
          console.log('✅ User recreated in clientUserService:', currentUser.id);
        } catch (createError) {
          console.error('❌ Failed to recreate user:', createError);
        }
      }
    }
  }, [user]);

  const updateProfile = useCallback(async (profileData) => {
    if (!user) return;

    console.log('🔄 updateProfile called with:', profileData);
    console.log('🔄 Current user:', user);

    setLoading(true);
    try {
      // Ensure profile object exists
      const currentProfile = user.profile || {};
      const updatedProfile = { ...currentProfile, ...profileData };
      
      console.log('🔄 Current profile:', currentProfile);
      console.log('🔄 Profile data:', profileData);
      console.log('🔄 Updated profile:', updatedProfile);
      
      // Ensure user exists in clientUserService before updating
      try {
        const existingUser = await clientUserService.getUserById(user.id);
        if (!existingUser) {
          // User doesn't exist, create them first
          console.log('🔄 User not found in clientUserService, creating first:', user.id);
          await clientUserService.createUser(user);
          console.log('✅ User created in clientUserService:', user.id);
        }
      } catch (createError) {
        console.error('❌ Failed to create user:', createError);
      }
      
      // Update profile using client-side service
      const updatedUser = await clientUserService.updateUserProfile(user.id, updatedProfile);
      
      // Update local state
      const newUser = { ...user, profile: updatedProfile };
      setUser(newUser);
      sessionStorage.setItem('conversational-ai-user', JSON.stringify(newUser));
      toast.success('Profile updated successfully');
      
      return updatedUser;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateDetectedInfo = useCallback(async (detectedInfo) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      detectedInfo: {
        ...user.detectedInfo,
        ...detectedInfo
      },
      updatedAt: new Date().toISOString()
    };

    setUser(updatedUser);
    sessionStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));

    // Update detected info on server
    try {
      const response = await fetch(`/api/users/${user.id}/detected-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detectedInfo),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.warn('Failed to update detected info on server:', data.error);
      }
    } catch (error) {
      console.error('Error updating detected info on server:', error);
    }
  }, [user]);

  const updateConversationData = useCallback(async (conversationData) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      conversationData: {
        ...user.conversationData,
        ...conversationData
      },
      updatedAt: new Date().toISOString()
    };

    setUser(updatedUser);
    sessionStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));

    // Update conversation data on server
    try {
      const response = await fetch(`/api/users/${user.id}/conversation-data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversationData),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.warn('Failed to update conversation data on server:', data.error);
      }
    } catch (error) {
      console.error('Error updating conversation data on server:', error);
    }
  }, [user]);

  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;

    const updatedUser = {
      ...user,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    };

    setUser(updatedUser);
    sessionStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));

    // Update onboarding status on server
    try {
      const response = await fetch(`/api/users/${user.id}/onboarding-complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onboardingCompleted: true }),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.warn('Failed to update onboarding status on server:', data.error);
      }
    } catch (error) {
      console.error('Error updating onboarding status on server:', error);
    }
  }, [user]);

  const resetUser = useCallback(() => {
    sessionStorage.removeItem('conversational-ai-user');
    createNewUser();
  }, [createNewUser]);

  const getUserProfile = useCallback(() => {
    return user?.profile || {};
  }, [user]);

  const getDetectedInfo = useCallback(() => {
    return user?.detectedInfo || {};
  }, [user]);

  const getConversationData = useCallback(() => {
    return user?.conversationData || {};
  }, [user]);

  const isOnboardingComplete = useCallback(() => {
    return user?.onboardingCompleted || false;
  }, [user]);

  return {
    user,
    loading,
    updateUser,
    updateProfile,
    updateDetectedInfo,
    updateConversationData,
    markOnboardingComplete,
    resetUser,
    getUserProfile,
    getDetectedInfo,
    getConversationData,
    isOnboardingComplete
  };
}; 