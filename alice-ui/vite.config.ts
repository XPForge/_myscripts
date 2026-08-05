import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

type ApiRequest = IncomingMessage & { body?: unknown }
type ApiHandler = (req: ApiRequest, res: ServerResponse) => Promise<void>

function localApiPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  Object.entries(env).forEach(([key, value]) => { process.env[key] = value })
  const apiModuleVersion = Date.now()

  return {
    name: 'lighthouse-local-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname
        const modulePath = pathname === '/api/chat' ? './api/chat.js'
          : pathname === '/api/transcribe' ? './api/transcribe.js'
          : pathname === '/api/tts' ? './api/tts.js'
          : pathname === '/api/oz-capture' ? './api/oz-capture.js'
          : pathname === '/api/profile-author' ? './api/profile-author.js'
          : pathname === '/api/profile-delivery' ? './api/profile-delivery.js'
          : pathname === '/api/submit-feedback' ? './api/submit-feedback.js'
          : pathname === '/api/discovery-workspace' ? './api/discovery-workspace.js'
          : pathname === '/api/auth-credentials' ? './api/auth-credentials.js'
          : pathname === '/api/auth-session' ? './api/auth-session.js'
          : pathname === '/api/admin-stats' ? './api/admin-stats.js'
          : pathname === '/api/founder-intel' ? './api/founder-intel.js'
          : null
        if (!modulePath) return next()

        try {
          // All handlers read the raw request stream themselves (bodyParser
          // is disabled on Vercel), so nothing here should pre-consume it.
          const req = request as ApiRequest
          const moduleUrl = pathToFileURL(resolve(process.cwd(), modulePath)).href
          const module = await import(`${moduleUrl}?dev=${apiModuleVersion}`) as { default: ApiHandler }
          await module.default(req, response)
        } catch {
          if (!response.headersSent) {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'Invalid API request' }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), localApiPlugin(mode)],
}))
