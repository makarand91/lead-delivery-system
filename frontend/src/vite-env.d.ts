/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_USER_POOL_ID: string
  readonly VITE_USER_POOL_CLIENT_ID: string
  readonly VITE_AWS_REGION: string
  // Note: VITE_IDENTITY_POOL_ID is not needed - frontend doesn't access AWS directly
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
