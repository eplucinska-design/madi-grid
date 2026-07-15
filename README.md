# MADI GRID

Aktualny prototyp systemu MADI GRID do zarzadzania zleceniami, produkcja, plikami, klientami, wycenami, RCP, powiadomieniami i dashboardem.

## Technologia

- Next.js 16
- React 19
- TypeScript
- Zustand
- Tailwind CSS
- Radix UI / shadcn-style components

## Uruchomienie lokalne

Wymagane: Node.js 20+ oraz pnpm.

```bash
pnpm install
pnpm dev
```

Adres lokalny:

```text
http://127.0.0.1:3000
```

## Build produkcyjny

```bash
pnpm build
pnpm start
```

## Co wrzucic na GitHub

Do repozytorium powinny trafic pliki z tej paczki, szczegolnie:

- `app/`
- `components/`
- `hooks/`
- `lib/`
- `public/`
- `styles/`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `next.config.mjs`
- `postcss.config.mjs`
- `tsconfig.json`
- `components.json`
- `.gitignore`
- `README.md`

Nie wrzucac:

- `node_modules/`
- `.next/`
- logow `*.log`
- `tsconfig.tsbuildinfo`

## Uwagi

Aplikacja ma lokalne endpointy Node.js, m.in. do pracy z plikami lokalnymi i uruchamiania aplikacji desktopowych:

- `/api/local-files/create-folder`
- `/api/local-files/upload`
- `/api/launch-app`

Na hostingu statycznym typu GitHub Pages te endpointy nie beda dzialac. Do pelnego uruchomienia potrzebny jest serwer Next.js, np. VPS, lokalny komputer, Docker, Vercel albo inny hosting obslugujacy Node.js.
