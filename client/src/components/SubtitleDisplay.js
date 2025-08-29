import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SubtitleDisplay = ({ isVisible, transcription, agentUserId, userTranscription }) => {
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [currentUserSubtitle, setCurrentUserSubtitle] = useState('');

  useEffect(() => {
    if (transcription) {
      // Handle different types of transcription
      if (transcription.type === 'agent') {
        // Agent transcription (TTS response)
        setCurrentSubtitle(transcription.text);
        
        // Add to subtitle history
        setSubtitles(prev => [...prev, {
          id: Date.now(),
          text: transcription.text,
          type: 'agent',
          timestamp: new Date().toISOString(),
          status: transcription.status || 'final'
        }]);
      } else if (transcription.type === 'user') {
        // User transcription (speech-to-text)
        setSubtitles(prev => [...prev, {
          id: Date.now(),
          text: transcription.text,
          type: 'user',
          timestamp: new Date().toISOString(),
          status: transcription.status || 'final'
        }]);
      }
    }
  }, [transcription]);

  useEffect(() => {
    if (userTranscription) {
      // Handle user speech-to-text
      setCurrentUserSubtitle(userTranscription.text);
      
      if (userTranscription.status === 'final') {
        setSubtitles(prev => [...prev, {
          id: Date.now(),
          text: userTranscription.text,
          type: 'user',
          timestamp: new Date().toISOString(),
          status: 'final'
        }]);
        setCurrentUserSubtitle(''); // Clear current user subtitle after adding to history
      }
    }
  }, [userTranscription]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-2xl"
      >
        {/* Current subtitles */}
        {(currentSubtitle || currentUserSubtitle) && (
          <div className="text-center mb-2 space-y-2">
            {currentSubtitle && (
              <div>
                <span className="text-sm text-gray-300">Agent speaking:</span>
                <div className="text-lg font-medium mt-1 text-blue-300">
                  {currentSubtitle}
                </div>
              </div>
            )}
            {currentUserSubtitle && (
              <div>
                <span className="text-sm text-gray-300">You speaking:</span>
                <div className="text-lg font-medium mt-1 text-green-300">
                  {currentUserSubtitle}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subtitle history */}
        <div className="max-h-32 overflow-y-auto">
          <AnimatePresence>
            {subtitles.slice(-3).map((subtitle) => (
              <motion.div
                key={subtitle.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`text-sm mb-1 ${
                  subtitle.type === 'agent' ? 'text-blue-300' : 'text-green-300'
                }`}
              >
                <span className="font-medium">
                  {subtitle.type === 'agent' ? 'Agent' : 'You'}:
                </span>{' '}
                {subtitle.text}
                {subtitle.status === 'interim' && (
                  <span className="text-gray-400 ml-2">(typing...)</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center mt-2">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-xs text-gray-300">Live transcription active</span>
        </div>
      </motion.div>
    </div>
  );
};

export default SubtitleDisplay; 