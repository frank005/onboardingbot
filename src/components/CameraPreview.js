import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';

const CameraPreview = ({ 
  isEnabled, 
  onImageCapture, 
  onCameraError,
  position = { x: 20, y: 20 },
  onPositionChange 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // Get available camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };

    getDevices();
  }, []);

  // Start camera stream
  const startCamera = async () => {
    if (!isEnabled || !selectedDevice) return;

    try {
      const constraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Start periodic image capture
      startImageCapture();

    } catch (error) {
      console.error('Error starting camera:', error);
      onCameraError?.(error);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
    }

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  };

  // Start periodic image capture
  const startImageCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    captureIntervalRef.current = setInterval(() => {
      captureImage();
    }, 5000); // Capture every 5 seconds
  };

  // Capture image from video stream
  const captureImage = () => {
    if (!videoRef.current || !isActive) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onImageCapture?.(reader.result);
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  // Handle device change
  const handleDeviceChange = async (deviceId) => {
    setSelectedDevice(deviceId);
    
    if (isActive) {
      stopCamera();
      await startCamera();
    }
  };

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Handle drag move
  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      setCurrentPosition({ x: newX, y: newY });
      onPositionChange?.({ x: newX, y: newY });
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Toggle camera
  const toggleCamera = () => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Effect to start/stop camera based on enabled state
  useEffect(() => {
    if (isEnabled && selectedDevice) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isEnabled, selectedDevice]);

  // Effect to handle position changes
  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  if (!isEnabled) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-gray-900 rounded-lg shadow-lg border border-gray-700 cursor-move"
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        width: 240,
        height: 180
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-gray-300" />
          <span className="text-xs text-gray-300">Camera Preview</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Device selector */}
          {devices.length > 1 && (
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="text-xs bg-gray-700 text-gray-300 rounded px-1 py-0.5"
            >
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          )}
          
          {/* Toggle button */}
          <button
            onClick={toggleCamera}
            className="p-1 rounded hover:bg-gray-600 transition-colors"
          >
            {isActive ? (
              <CameraOff className="w-3 h-3 text-red-400" />
            ) : (
              <Camera className="w-3 h-3 text-green-400" />
            )}
          </button>
        </div>
      </div>

      {/* Video preview */}
      <div className="relative w-full h-32 bg-black rounded-b-lg overflow-hidden">
        {isActive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CameraOff className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Camera off</p>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        {isActive && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraPreview;
