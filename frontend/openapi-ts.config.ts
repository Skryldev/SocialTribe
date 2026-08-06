export default {
  input: './src/api-contract/bundled.yaml',
  output: 'src/generated/api',
  plugins: [
    '@hey-api/typescript',
    {
      name: '@hey-api/sdk',
      client: '@hey-api/client-axios',
    },
    {
      name: '@tanstack/react-query',
    },
  ],
};