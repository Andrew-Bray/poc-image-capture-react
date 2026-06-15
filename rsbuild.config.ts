import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  server: {
    port: 11000,
    host: true,
  },
  html: {
    title: 'Image Capture & Zoom PoC - React',
  },
});
