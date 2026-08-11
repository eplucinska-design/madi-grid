import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const outDir = join(root, 'out')
const distDir = join(root, 'dist')
const serverDir = join(distDir, 'server')
const hostingFile = join(root, '.openai', 'hosting.json')

const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

await rm(outDir, { recursive: true, force: true })
await rm(distDir, { recursive: true, force: true })

run('npm', ['run', 'build'], { SITES_STATIC_EXPORT: '1' })

if (!existsSync(outDir)) {
  console.error('Missing Next static export directory: out')
  process.exit(2)
}

await mkdir(serverDir, { recursive: true })
await cp(outDir, distDir, { recursive: true })
await mkdir(join(distDir, '.openai'), { recursive: true })
await cp(hostingFile, join(distDir, '.openai', 'hosting.json'))

await writeFile(
  join(serverDir, 'index.js'),
  `const staticHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

function withHeaders(response) {
  const headers = new Headers(response.headers);
  Object.entries(staticHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function fromAssets(request, env, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname ?? url.pathname;
  return env.ASSETS.fetch(new Request(url, request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/launch-app")) {
      return Response.json({
        ok: false,
        hosted: true,
        message: "Integracje z aplikacjami lokalnymi dzialaja tylko w wersji uruchomionej na komputerze.",
      });
    }

    if (url.pathname.startsWith("/api/local-files")) {
      return Response.json({
        ok: false,
        hosted: true,
        message: "Operacje na plikach lokalnych sa niedostepne w wersji webowej.",
      });
    }

    const asset = await fromAssets(request, env);
    if (asset.status !== 404) return withHeaders(asset);

    const extensionLike = /\\.[a-zA-Z0-9]+$/.test(url.pathname);
    if (!extensionLike) {
      const fallback = await fromAssets(request, env, "/index.html");
      return withHeaders(fallback);
    }

    return withHeaders(asset);
  },
};
`,
)
