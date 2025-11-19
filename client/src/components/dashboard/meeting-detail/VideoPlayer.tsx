import { useVideoStreaming, type VideoStreamingOptions } from '@/hooks/useVideoStreaming';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  meetingId: string;
  organizationId: string;
  initialOptions?: VideoStreamingOptions;
  shareToken?: string;
}

export interface VideoPlayerRef {
  seekTo: (timeInSeconds: number) => void;
  seekToTimestamp: (timestamp: string) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  meetingId,
  organizationId,
  initialOptions = { format: 'progressive', quality: '720p' },
  shareToken
}, ref) => {
  const playerRef = useRef<ReactPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    type: string;
    lastUrl: string;
    nativeEvent: unknown;
    timestamp: string;
  } | null>(null);

  const { streamUrl, isLoading: isStreamLoading, error: streamError, changeFormat, changeQuality } = useVideoStreaming(
    meetingId,
    organizationId,
    initialOptions,
    shareToken
  );

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    seekTo: (timeInSeconds: number) => {
      console.log('🎬 Seeking to:', timeInSeconds, 'seconds');
      console.log('🎬 Player ready state:', isReady);
      
      try {
        // Find the video element in the DOM
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          videoElement.currentTime = timeInSeconds;
          console.log('🎬 SeekTo called successfully via DOM video element');
        } else {
          console.error('🎬 Could not find video element in DOM');
        }
      } catch (error) {
        console.error('🎬 Error calling seekTo:', error);
      }
    },
    seekToTimestamp: (timestamp: string) => {
      // Parse timestamp in format "MM:SS" to seconds
      const [minutes, seconds] = timestamp.split(':').map(Number);
      const timeInSeconds = minutes * 60 + seconds;
      console.log('🎬 Seeking to timestamp:', timestamp, '=', timeInSeconds, 'seconds');
      console.log('🎬 Player ready state:', isReady);
      
      try {
        // Find the video element in the DOM
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          videoElement.currentTime = timeInSeconds;
          console.log('🎬 SeekTo called successfully via DOM video element');
        } else {
          console.error('🎬 Could not find video element in DOM');
        }
      } catch (error) {
        console.error('🎬 Error calling seekTo:', error);
      }
    }
  }), [isReady]);

  if (isStreamLoading || isLoading) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Loading video...</p>
        </div>
      </div>
    );
  }

  if (streamError || error) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg font-medium mb-3">Error loading video</p>
          <p className="text-gray-300 text-sm mb-4">{streamError || error}</p>
          {errorDetails && (
            <div className="text-gray-400 text-xs mb-4 text-left max-w-md mx-auto">
              <p><strong>Error Type:</strong> {errorDetails.type}</p>
              <p><strong>Stream URL:</strong> {errorDetails.lastUrl}</p>
              <p><strong>Format:</strong> {initialOptions.format}</p>
              <p><strong>Quality:</strong> {initialOptions.quality}</p>
              {errorDetails.nativeEvent && (
                <p><strong>Native Event:</strong> {JSON.stringify(errorDetails.nativeEvent)}</p>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setError(null);
                setErrorDetails(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!streamUrl) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 text-lg font-medium">No video stream available</p>
          <p className="text-gray-400 text-sm mt-2">Check if the meeting has a recorded video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
      {/* React Player with Enhanced Features */}
      <ReactPlayer
        ref={playerRef}
        src={streamUrl}
        playing={isPlaying}
        muted={isMuted}
        playbackRate={playbackSpeed}
        volume={volume}
        width="100%"
        height="100%"
        controls={true}
        pip={true}
        playsInline={true}
        loop={false}
        onReady={() => {
          setIsLoading(false);
          // Add a small delay to ensure the video element is fully accessible
          setTimeout(() => {
            setIsReady(true);
            console.warn('🎬 VideoPlayer is now ready');
          }, 100);
        }}
        onError={(error) => {
          const errorInfo = {
            type: error.type,
            lastUrl: streamUrl,
            nativeEvent: error.nativeEvent,
            timestamp: new Date().toISOString()
          };
          setErrorDetails(errorInfo);
          setError('Video playback error - check console for details');
        }}
        onStart={() => {
          setIsLoading(false);
        }}
        onPlay={() => {
          setIsPlaying(true);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onEnterPictureInPicture={() => {
          // PIP mode entered
        }}
        onLeavePictureInPicture={() => {
          // PIP mode left
        }}
        onRateChange={() => {
          // Playback rate changed
        }}
      />

      {/* Enhanced Controls */}
      <div className="p-4 bg-black/80">
        <div className="flex items-center gap-4 text-white flex-wrap">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            {isPlaying ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Play
              </>
            )}
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 flex items-center gap-2"
          >
            {isMuted ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
                Unmute
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                Mute
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="px-2 py-1 bg-gray-700 rounded text-white"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
            </svg>
            <select
              value={initialOptions.format}
              onChange={(e) => changeFormat(e.target.value as 'hls' | 'dash' | 'progressive')}
              className="px-2 py-1 bg-gray-700 rounded text-white"
            >
              <option value="progressive">Progressive</option>
              <option value="hls">HLS</option>
              <option value="dash">DASH</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
            </svg>
            <select
              value={initialOptions.quality}
              onChange={(e) => changeQuality(e.target.value as '1080p' | '720p' | '480p' | '360p')}
              className="px-2 py-1 bg-gray-700 rounded text-white"
            >
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});
