/// <reference types="vite/client" />

import { QueryClient } from '@tanstack/react-query';

declare global {
  var testQueryClient: QueryClient;
}
