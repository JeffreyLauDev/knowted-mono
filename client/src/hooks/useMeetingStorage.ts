import { useAuth } from '@/context/AuthContext';
import {
    deleteMeetingRecording,
    getMeetingRecordingUrl,
    StorageFile,
    uploadMeetingRecording,
} from '@/integrations/supabase/storage';
import { toast } from '@/lib/toast';
import { useState } from 'react';

export const useMeetingStorage = (meetingId: string) => {
    const { organization } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const uploadRecording = async (file: File): Promise<StorageFile | null> => {
        if (!organization) {
            toast.error('No organization selected');
            return null;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Create a FileReader to track upload progress
            const reader = new FileReader();
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    setUploadProgress(progress);
                }
            };

            const result = await uploadMeetingRecording(file, meetingId, organization.id);
            toast.success('Recording uploaded successfully');
            return result;
        } catch (error) {
            console.error('Error uploading recording:', error);
            toast.error('Failed to upload recording');
            return null;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const getRecordingUrl = async (): Promise<string | null> => {
        if (!organization) {
            toast.error('No organization selected');
            return null;
        }

        try {
            return await getMeetingRecordingUrl(meetingId, organization.id);
        } catch (error) {
            console.error('Error getting recording URL:', error);
            toast.error('Failed to get recording URL');
            return null;
        }
    };

    const deleteRecording = async (): Promise<boolean> => {
        if (!organization) {
            toast.error('No organization selected');
            return false;
        }

        try {
            await deleteMeetingRecording(meetingId, organization.id);
            toast.success('Recording deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting recording:', error);
            toast.error('Failed to delete recording');
            return false;
        }
    };

    return {
        isUploading,
        uploadProgress,
        uploadRecording,
        getRecordingUrl,
        deleteRecording,
    };
}; 