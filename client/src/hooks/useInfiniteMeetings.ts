import { getMeetingsControllerFindAllQueryKey, meetingsControllerFindAll } from '@/api/generated/knowtedAPI';
import type { MeetingsControllerFindAllParams, PaginatedMeetingsResponseDto } from '@/api/generated/models';
import { useInfiniteQuery } from '@tanstack/react-query';

interface UseInfiniteMeetingsParams {
  organization_id: string;
  meeting_type_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
}

export const useInfiniteMeetings = (params: UseInfiniteMeetingsParams) => {
  const { limit = 20, ...otherParams } = params;

  return useInfiniteQuery({
    queryKey: [...getMeetingsControllerFindAllQueryKey(), 'infinite', otherParams],
    queryFn: async ({ pageParam = 0 }) => {
      const queryParams: MeetingsControllerFindAllParams = {
        ...otherParams,
        page: pageParam,
        limit
      };

      const response = await meetingsControllerFindAll(queryParams);

      // If the response is a direct array, we need to convert it to paginated format
      if (Array.isArray(response)) {

        const paginatedResponse: PaginatedMeetingsResponseDto = {
          data: response,
          total: response.length,
          page: pageParam,
          limit: limit,
          totalPages: Math.ceil(response.length / limit),
          hasNextPage: response.length === limit, // If we got exactly 'limit' items, assume there might be more
          hasPreviousPage: pageParam > 0
        };
        return paginatedResponse;
      }

      return response as PaginatedMeetingsResponseDto;
    },
    getNextPageParam: (lastPage) => {

      // Return the next page number if there are more pages, otherwise undefined
      if (lastPage?.hasNextPage && typeof lastPage.page === 'number') {
        return lastPage.page + 1;
      }

      return undefined;
    },
    initialPageParam: 0,
    enabled: !!params.organization_id
  });
};

// Helper function to flatten all pages into a single array of meetings
export const flattenInfiniteMeetings = (data: any) => {
  if (!data?.pages) {return [];}

  return data.pages.reduce((acc: any[], page: any) => {
    // Handle different response formats
    let pageData: any[] = [];

    if (Array.isArray(page)) {
      // Direct array response
      pageData = page;
    } else if (page?.data && Array.isArray(page.data)) {
      // Paginated response with data property
      pageData = page.data;
    } else if (page?.meetings && Array.isArray(page.meetings)) {
      // Alternative response format
      pageData = page.meetings;
    } else {
      // Try to find any array property
      for (const [key, value] of Object.entries(page || {})) {
        if (Array.isArray(value)) {
          pageData = value;
          break;
        }
      }
    }

    return [...acc, ...pageData];
  }, []);
};
