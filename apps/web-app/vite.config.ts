import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleChatRequest } from '@project-zero/ai-gateway';
import path from 'path';

function aiGatewayDevPlugin(): Plugin {
  return {
    name: 'project-zero-ai-gateway-middleware',
    config(_config, { mode }) {
      // Explicitly load root environment variables into process.env on Vite server startup
      const rootDir = path.resolve(__dirname, '../..');
      const env = loadEnv(mode, rootDir, '');
      if (env.NVIDIA_API_KEY && !process.env.NVIDIA_API_KEY) {
        process.env.NVIDIA_API_KEY = env.NVIDIA_API_KEY;
      }
    },
    configureServer(server) {
      server.middlewares.use('/api/ai/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { message: 'Method Not Allowed', type: 'validation_error' } }));
          return;
        }

        let bodyRaw = '';
        req.on('data', (chunk) => {
          bodyRaw += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = bodyRaw ? JSON.parse(bodyRaw) : {};
            const result = await handleChatRequest(parsed);
            res.statusCode = result.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result.body));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: { message: 'Invalid JSON request payload', type: 'validation_error' } }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react(), aiGatewayDevPlugin()],
  server: {
    port: 3000,
    open: false,
  },
});
