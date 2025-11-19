import { apiClient } from '@/integrations/api/client';
import { AxiosRequestConfig } from 'axios';

export const customInstance = <T = any>(config: AxiosRequestConfig) => {
  return apiClient.request<T>(config).then(response => {
    return response.data !== undefined ? response.data : response;
  });
};