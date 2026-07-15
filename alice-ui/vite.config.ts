import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

type ApiRequest = IncomingMessage & { body?: unknown }
type ApiHandler = (req: ApiRequest, res: ServerResponse) => Promise<void>

function readJsonBody(req: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch (error) { reject(error) }
    })
    req.on('error', reject)
  })
}

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
          : null
        if (!modulePath) return next()

        try {
          const req = request as ApiRequest
          if (pathname !== '/api/transcribe') req.body = await readJsonBody(request)
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
