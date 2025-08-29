import React from 'react';

const MessageBubble = ({ message, isUser }) => {
  // Get the speaker name for display
  const speaker = message.speaker || (isUser ? 'User' : 'Assistant');
  
  // Get the timestamp
  const timestamp = message.timestamp || new Date().toLocaleTimeString();
  
  // Check if this is a temporary message
  const isTemp = message.isTemp || timestamp === '(live)';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : isTemp
              ? 'bg-yellow-100 text-gray-800 border-2 border-yellow-300'
              : 'bg-gray-200 text-gray-800'
        }`}
      >
        <div className="text-sm font-medium mb-1">
          {speaker} {isTemp && <span className="text-yellow-600">(live)</span>}
        </div>
        <div className="text-sm">
          {message.content}
        </div>
        <div className={`text-xs mt-1 ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {timestamp}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble; 