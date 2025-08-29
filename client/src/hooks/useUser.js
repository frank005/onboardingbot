import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const createNewUser = useCallback(() => {
    const newUser = {
      id: `user_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'active',
      onboardingCompleted: false,
      profile: {},
      detectedInfo: {},
      conversationData: {}
    };
    setUser(newUser);
    localStorage.setItem('conversational-ai-user', JSON.stringify(newUser));
  }, []);

  useEffect(() => {
    // Load user from localStorage or create new user
    const savedUser = localStorage.getItem('conversational-ai-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        createNewUser();
      }
    } else {
      createNewUser();
    }
  }, [createNewUser]);

  const updateUser = useCallback(async (updates) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setUser(updatedUser);
    localStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));

    // Update user on server
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.warn('Failed to update user on server:', data.error);
      }
    } catch (error) {
      console.error('Error updating user on server:', error);
    }
  }, [user]);

  const updateProfile = useCallback(async (profileData) => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setUser(data.data);
      localStorage.setItem('conversational-ai-user', JSON.stringify(data.data));
      toast.success('Profile updated successfully');
      
      return data.data;
    } catch (error) {
      console.error('Error updating profile:', error);
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
    localStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));

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
    localStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));

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
    localStorage.setItem('conversational-ai-user', JSON.stringify(updatedUser));

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
    localStorage.removeItem('conversational-ai-user');
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