import { vi } from 'vitest';

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
} as any;

// Mock MediaRecorder
global.MediaRecorder = class {
  static isTypeSupported = vi.fn().mockReturnValue(true);
  constructor() {}
  start = vi.fn();
  stop = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  ondataavailable = null;
  onerror = null;
  onstop = null;
  state = 'inactive';
} as any;

// Mock navigator.mediaDevices
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getDisplayMedia: vi.fn(),
    getUserMedia: vi.fn(),
  },
  userAgent: 'test-user-agent',
} as any;

// Mock screen
global.screen = {
  width: 1920,
  height: 1080,
  availWidth: 1920,
  availHeight: 1040,
} as any;

// Mock WebSocket
global.WebSocket = class {
  constructor() {}
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  readyState = 1; // OPEN
  onopen = null;
  onclose = null;
  onmessage = null;
  onerror = null;
  static OPEN = 1;
  static CLOSED = 3;
} as any;

// Mock performance
global.performance = {
  now: vi.fn(() => Date.now()),
} as any;