import React from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, Heart, Brain, Settings } from 'lucide-react';

const UserProfile = ({ user, onUserUpdate }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.profile?.name || 'Guest User'}
          </h1>
          <p className="text-gray-600">
            {user?.onboardingCompleted ? 'Onboarding Complete' : 'Onboarding Pending'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">
                  {user?.profile?.name || 'Not provided'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Birthday:</span>
                <span className="font-medium">
                  {user?.profile?.birthday || 'Not provided'}
                </span>
              </div>
              
              <div className="flex items-start space-x-3">
                <Heart className="w-5 h-5 text-gray-400 mt-0.5" />
                <span className="text-gray-600">Bio:</span>
                <span className="font-medium flex-1">
                  {user?.profile?.bio || 'Not provided'}
                </span>
              </div>
              
              <div className="flex items-start space-x-3">
                <Brain className="w-5 h-5 text-gray-400 mt-0.5" />
                <span className="text-gray-600">Interests:</span>
                <span className="font-medium flex-1">
                  {user?.profile?.interests || 'Not provided'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Detected Information</h2>
            <div className="space-y-3">
              {user?.detectedInfo?.gender && (
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium capitalize">
                    {user.detectedInfo.gender}
                  </span>
                </div>
              )}
              
              {user?.detectedInfo?.interests && (
                <div className="flex items-start space-x-3">
                  <Heart className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-600">Detected Interests:</span>
                  <span className="font-medium flex-1">
                    {user.detectedInfo.interests}
                  </span>
                </div>
              )}
              
              {user?.detectedInfo?.experienceLevel && (
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Experience Level:</span>
                  <span className="font-medium capitalize">
                    {user.detectedInfo.experienceLevel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <div className="flex items-center justify-center space-x-4">
            <button className="btn-secondary">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfile; 