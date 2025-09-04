import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Square } from 'lucide-react';
import toast from 'react-hot-toast';

const VoiceRecorder = ({ isRecording, onRecordingChange, onVoiceInput }) => {
  const [isSupported, setIsSupported] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  React.useEffect(() => {
    // Check if browser supports media recording
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsSupported(true);
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        onVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      onRecordingChange(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      onRecordingChange(false);
      toast.success('Recording stopped');
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isSupported) {
    return (
      <button
        disabled
        className="p-3 text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
        title="Voice recording not supported"
      >
        <MicOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleToggleRecording}
      className={`p-3 rounded-lg transition-colors ${
        isRecording
          ? 'bg-red-500 text-white recording-pulse'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      }`}
      title={isRecording ? 'Stop Recording' : 'Start Recording'}
    >
      {isRecording ? (
        <Square className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </motion.button>
  );
};

export default VoiceRecorder; 