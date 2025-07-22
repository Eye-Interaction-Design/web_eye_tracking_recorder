# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

**Use Bun instead of Node.js/npm/yarn/pnpm for all operations:**
- `bun install` for dependency management
- `bun run <script>` for running package.json scripts
- `bun test` for running tests
- `bun build` for building
- `bun --hot ./experiment.ts` for development

## Monorepo Structure

This is a **monorepo** with workspace configuration:
- **`packages/eye-analysis/`** - Core library (main package)
- **`packages/react/`** - React integration package
- **`examples/client/`** - React demo application 
- **`examples/websocket-server-python/`** - Python FastAPI server for Tobii Pro integration

## Build and Test Commands

**Monorepo-level commands (run from root):**
- `bun run build` - Build both core and React packages
- `bun run test` - Run tests for both packages
- `bun run lint` - Lint all packages with Biome
- `bun run format` - Format code across all packages

**Package-level commands:**
- `bun run build:core` - Build only the core library
- `bun run build:react` - Build only React package
- `bun run test:core` - Test only core library
- `bun run test:react` - Test only React package
- `bun run dev` - Hot reload development server for core library

**Individual package development:**
- `cd packages/eye-analysis && bun run build` - Build core library (ESM to dist/)
- `cd packages/eye-analysis && bun test` - Run tests with Vitest and happy-dom
- `cd packages/react && bun run build` - Build React package

## Code Architecture

This is a browser-based eye tracking and screen recording library with the following architecture:

### Core Library (`packages/eye-analysis/`)

**Main Entry Points:**
- **`experiment.ts`** - Higher-level experiment API with tracking integration (main export)
- **`interaction.ts`** - User interaction tracking system
- **`tracking/index.ts`** - Eye tracking system with multiple adaptors

**Core Recording System (`recorder/`):**
- **`core.ts`** - Pure functions for recording (initialize, createSession, startRecording, etc.)
- **`state.ts`** - Redux-like state management with dispatch/subscribe pattern
- **`storage.ts`** - IndexedDB persistence layer for sessions and video chunks
- **`export.ts`** - Data export utilities (CSV, JSON, ZIP downloads)
- **`types.ts`** - Comprehensive TypeScript type definitions
- **`browser-info.ts`** - Browser window and screen coordinate utilities
- **`ssr-guard.ts`** - Server-side rendering compatibility utilities

**Eye Tracking System (`tracking/`):**
- **`index.ts`** - Main tracking coordinator with adaptor management
- **`adaptors/`** - Multiple tracking implementations:
  - `websocket-adaptor.ts` - Real eye tracker via WebSocket
  - `mouse-adaptor.ts` - Mouse simulation for development/testing
  - `custom-adaptor.ts` - Custom tracking implementation interface

**Services (`services/`):**
- **`database.ts`** - IndexedDB initialization and management
- **`screen-recording.ts`** - MediaRecorder API integration
- **`synchronization.ts`** - Timestamp synchronization between systems

### React Package (`packages/react/`)
- React hooks and components for easy integration
- Uses workspace reference to core library for type safety

### Examples
- **`examples/client/`** - Comprehensive React demo with Vite
- **`examples/websocket-server-python/`** - Python FastAPI server for Tobii Pro SDK integration

## Key Architecture Patterns

**Dual API Design:**
- **Experiment API** (`experiment.ts`): High-level API with automatic tracking integration
- **Core API** (`recorder/core.ts`): Low-level recording functions for custom implementations

**State Management:**
- Redux-like pattern with pure functions and immutable state
- Global state subscription system for UI updates
- Separate state slices for recording, sessions, and tracking

**Modular Eye Tracking:**
- Adaptor pattern for different tracking systems (WebSocket, mouse simulation, custom)
- Hot-swappable tracking implementations
- Coordinate transformation system between screen/window/content spaces

**Browser Compatibility:**
- SSR guards for Next.js/Nuxt.js compatibility
- MediaRecorder API with WebM/MP4 format fallbacks
- Chrome (full support), Firefox/Edge (manual tab selection), Safari (limited)

**Data Flow:**
1. Initialize storage and recording systems
2. Connect optional eye tracking adaptors
3. Create session with participant/experiment metadata  
4. Start recording (screen capture + optional eye tracking)
5. Real-time gaze data collection with coordinate transformation
6. Stop recording and export (JSON metadata + CSV time-series + video)

## Testing Strategy

- **Vitest** with Happy-DOM for browser environment simulation
- **Separate test suites** for core library and React package
- **CI/CD pipeline** with comprehensive testing, security auditing, and build verification
- **Pre-commit hooks** with Husky and lint-staged for code quality

## Technology Stack

**Build Tools:**
- **Bun** - Primary runtime and package manager (enforced via Cursor rules)
- **TypeScript** - Full type safety with strict configuration
- **Biome** - Fast linting and formatting (replaces ESLint/Prettier)
- **Vitest** - Testing framework with browser simulation

**Core Dependencies:**
- **fflate** - Compression for ZIP exports
- **IndexedDB** - Client-side data persistence
- **MediaRecorder API** - Screen recording with chunked storage
- **WebSocket** - Real-time eye tracking communication

**Development Quality:**
- **Husky + lint-staged** - Pre-commit quality gates
- **GitHub Actions** - 4-job CI pipeline (test, lint, build, security)
- **Bundle size monitoring** - Automatic size tracking