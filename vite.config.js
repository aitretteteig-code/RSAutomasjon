import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dashboardRunnerPlugin } from './scripts/dashboard-runner-plugin.mjs';

export default defineConfig({
  plugins: [react(), dashboardRunnerPlugin(process.cwd())],
  server: {
    fs: {
      strict: false,
    },
  },
});
