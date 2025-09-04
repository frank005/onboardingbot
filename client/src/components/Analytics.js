import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, MessageCircle, TrendingUp, Clock } from 'lucide-react';

const Analytics = ({ conversation, user }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Conversation and user analytics</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {conversation?.messages?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Total Messages</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {conversation?.completedTopics?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Completed Topics</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((conversation?.completedTopics?.length || 0) / 3 * 100)}%
                </p>
                <p className="text-sm text-gray-600">Completion Rate</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {user?.conversationData?.conversationLength || 0}
                </p>
                <p className="text-sm text-gray-600">Conversation Length</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Progress */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation Progress</h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Platform Overview</span>
              <span className={conversation?.completedTopics?.includes('platform_overview') ? 'text-green-600' : 'text-gray-400'}>
                {conversation?.completedTopics?.includes('platform_overview') ? '✓' : '○'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Profile Setup</span>
              <span className={conversation?.completedTopics?.includes('onboarding_form') ? 'text-green-600' : 'text-gray-400'}>
                {conversation?.completedTopics?.includes('onboarding_form') ? '✓' : '○'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Additional Questions</span>
              <span className={conversation?.completedTopics?.includes('additional_conversation') ? 'text-green-600' : 'text-gray-400'}>
                {conversation?.completedTopics?.includes('additional_conversation') ? '✓' : '○'}
              </span>
            </div>
          </div>
        </div>

        {/* User Data */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Data</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{user?.profile?.name || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Birthday:</span>
                <span className="font-medium">{user?.profile?.birthday || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bio:</span>
                <span className="font-medium">{user?.profile?.bio || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interests:</span>
                <span className="font-medium">{user?.profile?.interests || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Experience:</span>
                <span className="font-medium">{user?.profile?.experience || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detected Information</h2>
            <div className="space-y-3">
              {user?.detectedInfo?.gender && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium capitalize">{user.detectedInfo.gender}</span>
                </div>
              )}
              {user?.detectedInfo?.interests && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Detected Interests:</span>
                  <span className="font-medium">{user.detectedInfo.interests}</span>
                </div>
              )}
              {user?.detectedInfo?.experienceLevel && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Experience Level:</span>
                  <span className="font-medium capitalize">{user.detectedInfo.experienceLevel}</span>
                </div>
              )}
              {user?.detectedInfo?.upcomingEvents && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Upcoming Events:</span>
                  <span className="font-medium">{user.detectedInfo.upcomingEvents}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Placeholder for Charts */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Charts</h2>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Charts and advanced analytics coming soon...</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics; 