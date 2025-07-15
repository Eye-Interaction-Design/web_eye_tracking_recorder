# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

**Use Bun instead of Node.js/npm/yarn/pnpm for all operations:**
- `bun install` for dependency management
- `bun run <script>` for running package.json scripts
- `bun test` for running tests
- `bun build` for building
- `bun --hot ./src/index.ts` for development

## Build and Test Commands

**Primary commands:**
- `bun run build` - Build main library (ESM format to dist/)
- `bun run build:react` - Build React integration package
- `bun run build:all` - Build both main and React packages
- `bun run test` - Run tests with Vitest and happy-dom
- `bun run lint` - Lint code with Biome
- `bun run format` - Format code with Biome

**Development commands:**
- `bun run dev` - Hot reload development server
- `bun run build:examples` - Build and copy to examples directory

## Code Architecture

This is a browser-based eye tracking and screen recording library with the following core architecture:

### Main Entry Points
- `src/index.ts` - Main library exports (simplified API)
- `src/experiment-recorder.ts` - Higher-level experiment API with eye tracking integration

### Core Recording System (`src/recorder/`)
- **`core.ts`** - Core recording functions (initialize, createSession, startRecording, etc.)
- **`state.ts`** - Redux-like state management for recording state
- **`storage.ts`** - IndexedDB persistence layer for sessions and data
- **`types.ts`** - TypeScript type definitions
- **`export.ts`** - Data export utilities (CSV, JSON, ZIP downloads)
- **`browser-info.ts`** - Browser window and screen coordinate utilities
- **`ssr-guard.ts`** - Server-side rendering compatibility utilities

### Services (`src/services/`)
- **`database.ts`** - Database initialization and management
- **`eye-tracking.ts`** - Eye tracking integration (external server communication)
- **`screen-recording.ts`** - Screen recording via MediaRecorder API
- **`synchronization.ts`** - Timestamp synchronization between systems

### Key Features
- **Dual API Design**: Simple recording API (`src/index.ts`) and advanced experiment API (`src/experiment-recorder.ts`)
- **Browser Recording**: Uses MediaRecorder API with getDisplayMedia for screen capture
- **Eye Tracking Integration**: Optional external eye tracking server communication
- **IndexedDB Storage**: Client-side data persistence with automatic cleanup
- **Multiple Export Formats**: JSON metadata, CSV time-series data, ZIP archives
- **SSR Compatibility**: Safe to use in Next.js/Nuxt.js with browser detection

### Data Flow
1. Initialize storage and recording systems
2. Create session with participant/experiment metadata
3. Start recording (screen capture + optional eye tracking)
4. Collect gaze data points and user events
5. Stop recording and export data (JSON/CSV/ZIP)

### Testing
- Uses Vitest with happy-dom for browser simulation
- Tests located in `test/` directory
- Setup file: `test/setup.ts`

### Examples
- `examples/react/` - React integration example
- `examples/vanilla-js/` - Vanilla JavaScript example
- `examples/shared/` - Shared demo logic

## Development Guidelines

**Format Support:**
- Video: WebM (VP8/VP9), MP4 (H.264) with fallback detection
- Export: JSON, CSV, ZIP with multiple download options
- Browser compatibility: Chrome (full), Firefox/Edge (manual tab selection), Safari (limited)

**Architecture Patterns:**
- Pure functions in core.ts for testability
- Redux-like state management with dispatch/subscribe
- Coordinate system conversion between screen/window/content coordinates
- Automatic browser environment detection with SSR guards