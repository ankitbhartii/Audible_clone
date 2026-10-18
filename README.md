# Audible Web Clone 🎧

A full-stack, production-grade clone of Amazon's Audible Web Application built with React, TypeScript, Tailwind CSS, Vite, and Node.js.

![Audible Web Clone](https://m.media-amazon.com/images/I/51POf8gOyLL._SL500_.jpg)

## Features

- **Live Audible ASL Catalog Search**: Access over 10,000+ real audiobooks dynamically connected to Audible's live ASL Catalog API (`api.audible.com`).
- **High-Resolution Official Artwork**: 100% verified, distinct official Amazon Audible cover artwork (`m.media-amazon.com`) with zero duplicates and automated image fallback chains.
- **Distinct Official Audio Narration Streams**: Over 1,278+ official narrator voice streams (`samples.audible.com`) with 1-to-1 matching across every book (no duplicated narrations).
- **Persistent Whispersync**: Whispersync progress tracking, bookmarks, and user library persistence in browser `localStorage` with quota-safe adapters.
- **Audio Stream Relay & Proxy**: Built-in HTTP proxy (`server/streamProxy.mjs`) supporting HTTP Range requests (`Accept-Ranges: bytes`), instant scrub-seeking, and automatic direct-stream failover.
- **BYO Audiobook Importer**: In-browser audiobook importer allowing playback of custom audio files with metadata parsing.
- **Full Cloud Audio Player & Modal**: Sleek floating bottom player, full-screen playback modal, variable speed control (0.5x to 3.0x), chapter navigation, and sleep timer.

## Project Structure

```text
audible-clone/
├── src/
│   ├── api/             # Audible API client, data models & catalog data
│   │   ├── audibleService.ts  # Service layer & Whispersync state
│   │   ├── mockData.ts        # 520 curated books with distinct artwork & audio
│   │   └── types.ts           # TypeScript interfaces & API contracts
│   ├── components/      # UI components (Navbar, Player, Shelves, Modals)
│   ├── context/         # React Context (PlayerContext & Audio Engine)
│   ├── App.tsx          # Main application layout & live search
│   └── main.tsx         # React root entrypoint
├── server/
│   └── streamProxy.mjs  # Local audio proxy & ASL search/audio resolver
├── public/              # Static assets & master audio files
├── api-specs/           # OpenAPI specs & data schema definitions
└── reverse-engineering/ # Documented Audible Web API endpoints & schemas
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Local Audio Relay Proxy

In one terminal, start the proxy relay server (runs on port 3001):

```bash
node server/streamProxy.mjs
```

### 3. Start the Web Application

In another terminal, start the Vite development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port indicated by Vite) to explore the catalog, search 10,000+ audiobooks, and start listening!

### Production Build

```bash
npm run build
npm run preview
```

## License

Apache-2.0
