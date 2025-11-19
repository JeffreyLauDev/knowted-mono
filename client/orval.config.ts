import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: 'http://localhost:3000/api-json',
    output: {
      mode: 'split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      prettier: true,
      override: {
        mutator: {
          path: 'src/api/mutator/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
}); 