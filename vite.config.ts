import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function getGitCommitSha() {
  const envSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.COMMIT_SHA

  if (envSha) return envSha

  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'local'
  }
}

function getEnvironmentLabel(mode: string) {
  if (process.env.VERCEL_ENV === 'production') return 'PROD'
  if (process.env.VERCEL_ENV === 'preview') return 'STAGING'
  if (mode === 'production') return 'BUILD'
  return 'LOCAL'
}

export default defineConfig(({ mode }) => {
  const commitSha = getGitCommitSha()
  const buildInfo = {
    envLabel: getEnvironmentLabel(mode),
    commitSha,
    shortSha: commitSha.slice(0, 7),
    builtAt: new Date().toISOString(),
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || '',
  }

  return {
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico'],
        manifest: {
          name: 'Xledger',
          short_name: 'Xledger',
          description: 'SystÃ¨me de suivi financier',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
