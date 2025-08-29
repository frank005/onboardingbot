import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const ConversationProgress = ({ completedTopics, currentTopic }) => {
  const topics = [
    { id: 'platform_overview', label: 'Platform Overview', description: 'Learn about features' },
    { id: 'onboarding_form', label: 'Profile Setup', description: 'Complete your profile' },
    { id: 'additional_conversation', label: 'Additional Questions', description: 'Get personalized help' }
  ];

  const getTopicStatus = (topicId) => {
    if (completedTopics?.includes(topicId)) {
      return 'completed';
    } else if (currentTopic === topicId) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'current':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'current':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Onboarding Progress</h3>
      <div className="space-y-2">
        {topics.map((topic, index) => {
          const status = getTopicStatus(topic.id);
          const isLast = index === topics.length - 1;

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor(status)}`}
            >
              <div className="flex-shrink-0">
                {getStatusIcon(status)}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  status === 'completed' ? 'text-green-700' :
                  status === 'current' ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {topic.label}
                </p>
                <p className="text-xs text-gray-500">
                  {topic.description}
                </p>
              </div>

              {!isLast && (
                <div className={`w-px h-8 ${
                  status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                }`} />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round((completedTopics?.length || 0) / topics.length * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedTopics?.length || 0) / topics.length * 100}%` }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

export default ConversationProgress; 