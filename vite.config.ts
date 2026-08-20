import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const deploymentTarget = mode === 'cowork' ? 'cowork' : 'internet'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@deployment-entry': deploymentTarget === 'cowork'
          ? '/src/platform/cowork-entry.ts'
          : '/src/platform/internet-entry.ts',
      },
    },
    define: {
      __DEPLOYMENT_TARGET__: JSON.stringify(deploymentTarget),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'tests/e2e/**', 'server/**'],
    },
  }
})
