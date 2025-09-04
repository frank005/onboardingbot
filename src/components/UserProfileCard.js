import React from 'react';
import { motion } from 'framer-motion';
import { X, User, Calendar, Heart, Brain, MapPin, Clock, CheckCircle } from 'lucide-react';

const UserProfileCard = ({ user, conversation, onClose, onUserUpdate }) => {
  // Helper function to get profile data with field normalization
  const getProfileValue = (fieldName) => {
    const profileData = user?.profile || {};
    
    // Handle field name variations
    if (fieldName === 'experienceLevel') {
      return profileData.experience || profileData.experienceLevel || 'Not provided';
    }
    
    return profileData[fieldName] || 'Not provided';
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString();
  };

  const getProfileCompleteness = () => {
    const fields = ['name', 'birthday', 'bio', 'interests', 'experience'];
    const profileData = user?.profile || {};
    const completed = fields.filter(field => profileData[field] && profileData[field] !== 'Not provided').length;
    return Math.round((completed / fields.length) * 100);
  };

  const getDetectedInfoCount = () => {
    const profileData = user?.profile || {};
    const filledFields = Object.values(profileData).filter(value => value && value !== 'Not provided').length;
    return filledFields;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="h-full bg-white shadow-lg overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Overview */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {user?.profile?.name || 'Guest User'}
              </h3>
              <p className="text-sm text-gray-500">
                {user?.onboardingCompleted ? 'Onboarding Complete' : 'Onboarding Pending'}
              </p>
            </div>
          </div>

          {/* Profile Completeness */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Profile Completeness</span>
              <span>{getProfileCompleteness()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProfileCompleteness()}%` }}
              />
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">
                {conversation?.messages?.length || 0}
              </p>
              <p className="text-gray-500">Messages</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {getDetectedInfoCount()}
              </p>
              <p className="text-gray-500">Detected Info</p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
          

          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Name:</span>
              <span className="text-sm font-medium">
                {getProfileValue('name')}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Birthday:</span>
              <span className="text-sm font-medium">
                {getProfileValue('birthday')}
              </span>
            </div>
            
            <div className="flex items-start space-x-3">
              <Heart className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-600">Bio:</span>
              <span className="text-sm font-medium flex-1">
                {getProfileValue('bio')}
              </span>
            </div>
            
            <div className="flex items-start space-x-3">
              <Brain className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-600">Interests:</span>
              <span className="text-sm font-medium flex-1">
                {getProfileValue('interests')}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Experience Level:</span>
              <span className="text-sm font-medium">
                {getProfileValue('experience')}
              </span>
            </div>
          </div>
        </div>

        {/* Detected Information */}
        {getDetectedInfoCount() > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Information</h3>
            <div className="space-y-3">
              {user?.detectedInfo?.gender && (
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Gender:</span>
                  <span className="text-sm font-medium capitalize">
                    {user.detectedInfo.gender}
                  </span>
                </div>
              )}
              
              {user?.detectedInfo?.interests && (
                <div className="flex items-start space-x-3">
                  <Heart className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-sm text-gray-600">Detected Interests:</span>
                  <span className="text-sm font-medium flex-1">
                    {user.detectedInfo.interests}
                  </span>
                </div>
              )}
              
              {user?.detectedInfo?.experienceLevel && (
                <div className="flex items-center space-x-3">
                  <Brain className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Experience Level:</span>
                  <span className="text-sm font-medium capitalize">
                    {user.detectedInfo.experience}
                  </span>
                </div>
              )}
              
              {user?.detectedInfo?.upcomingEvents && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-sm text-gray-600">Upcoming Events:</span>
                  <span className="text-sm font-medium flex-1">
                    {user.detectedInfo.upcomingEvents}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation Progress */}
        {conversation && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Current Topic:</span>
                <span className="text-sm font-medium capitalize">
                  {conversation.currentTopic?.replace('_', ' ') || 'Not started'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Completed Topics:</span>
                <span className="text-sm font-medium">
                  {conversation.completedTopics?.length || 0} / 3
                </span>
              </div>
              
              {conversation.completedTopics?.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-2">Completed:</p>
                  <div className="space-y-1">
                    {conversation.completedTopics.map(topic => (
                      <div key={topic} className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-700 capitalize">
                          {topic.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Metadata */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Metadata</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-xs">{user?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{formatDate(user?.createdAt)}</span>
            </div>
            {user?.updatedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span>{formatDate(user.updatedAt)}</span>
              </div>
            )}
            {user?.onboardingCompletedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Onboarding Completed:</span>
                <span>{formatDate(user.onboardingCompletedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserProfileCard; 