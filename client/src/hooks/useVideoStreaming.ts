import { useMeetingsControllerGetMeetingStreamingUrl, usePublicMeetingsControllerGetSharedMeetingStreamingUrl } from '@/api/generated/knowtedAPI';
import { useEffect, useState } from 'react';

export interface VideoStreamingOptions {
  format: 'hls' | 'dash' | 'progressive';
  quality: '1080p' | '720p' | '480p' | '360p';
}

export interface VideoStreamingResult {
  streamUrl: string | null;
  isLoading: boolean;
  error: string | null;
  changeFormat: (format: VideoStreamingOptions['format']) => void;
  changeQuality: (quality: VideoStreamingOptions['quality']) => void;
}

export const useVideoStreaming = (
  meetingId: string,
  organizationId: string,
  options: VideoStreamingOptions = { format: 'progressive', quality: '720p' },
  shareToken?: string
): VideoStreamingResult => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  console.warn('🔍 useVideoStreaming Hook Debug:', {
    meetingId,
    organizationId,
    options,
    shareToken,
    streamUrl,
    error
  });

  // Determine if we're in shared mode
  const isSharedMode = !!shareToken;

  // Use the authenticated API endpoint for regular meetings
  const {
    data: authenticatedData,
    isLoading: isAuthenticatedLoading,
    error: authenticatedError
  } = useMeetingsControllerGetMeetingStreamingUrl(
    meetingId,
    {
      organization_id: organizationId,
      format: options.format,
      quality: options.quality
    },
    {
      query: {
        enabled: !isSharedMode && !!meetingId && !!organizationId
      }
    }
  );

  // Use the public API endpoint for shared meetings
  const {
    data: publicData,
    isLoading: isPublicLoading,
    error: publicError
  } = usePublicMeetingsControllerGetSharedMeetingStreamingUrl(
    meetingId,
    {
      share_token: shareToken || '',
      format: options.format,
      quality: options.quality
    },
    {
      query: {
        enabled: isSharedMode && !!meetingId && !!shareToken
      }
    }
  );

  // Use the appropriate data based on mode
  const data = isSharedMode ? publicData : authenticatedData;
  const isQueryLoading = isSharedMode ? isPublicLoading : isAuthenticatedLoading;
  const queryError = isSharedMode ? publicError : authenticatedError;

  console.warn('🔍 useVideoStreaming API Response:', {
    data,
    isQueryLoading,
    queryError,
    hasData: !!data,
    dataType: typeof data,
    dataKeys: data ? Object.keys(data) : null
  });

  useEffect(() => {
    console.warn('🔄 useEffect triggered:', { meetingId, organizationId, options, shareToken, isSharedMode });
    if (isSharedMode) {
      if (meetingId && shareToken) {
        console.warn('✅ Valid shared mode params, public query should auto-run');
      } else {
        console.warn('❌ Missing required shared mode params:', { meetingId, shareToken });
      }
    } else {
      if (meetingId && organizationId) {
        console.warn('✅ Valid authenticated mode params, query should auto-run');
      } else {
        console.warn('❌ Missing required authenticated mode params:', { meetingId, organizationId });
      }
    }
  }, [meetingId, organizationId, shareToken, options, isSharedMode]);

  useEffect(() => {
    console.warn('🔍 Data effect triggered:', { data, hasData: !!data });

    // Handle both direct response and AxiosResponse cases
    const responseData = data && 'data' in data ? data.data : data;

    if (responseData && typeof responseData === 'object' && 'streamUrl' in responseData) {
      console.warn('✅ Stream URL received:', responseData.streamUrl);
      setStreamUrl(responseData.streamUrl as string);
    } else if (responseData) {
      console.warn('⚠️  Data received but no streamUrl:', {
        responseData,
        dataKeys: Object.keys(responseData),
        hasStreamUrl: 'streamUrl' in responseData
      });
    } else {
      console.warn('❌ No data received yet');
    }
  }, [data]);

  useEffect(() => {
    if (queryError) {
      console.error('❌ Query error:', queryError);
      setError('Failed to get streaming URL');
    }
  }, [queryError]);

  const changeFormat = (format: VideoStreamingOptions['format']): void => {
    console.warn('🔄 Changing format to:', format);
    // The hook will automatically refetch with new params
  };

  const changeQuality = (quality: VideoStreamingOptions['quality']): void => {
    console.warn('🔄 Changing quality to:', quality);
    // The hook will automatically refetch with new params
  };

  return {
    streamUrl,
    isLoading: isQueryLoading,
    error,
    changeFormat,
    changeQuality
  };
};
