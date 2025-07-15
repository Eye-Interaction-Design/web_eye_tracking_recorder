import { vi } from "vitest";

// Mock IndexedDB with proper implementation
global.indexedDB = {
	open: vi.fn().mockImplementation((name, version) => ({
		onsuccess: null,
		onerror: null,
		onupgradeneeded: null,
		result: {
			createObjectStore: vi.fn(),
			transaction: vi.fn().mockReturnValue({
				objectStore: vi.fn().mockReturnValue({
					add: vi
						.fn()
						.mockImplementation(() => ({ onsuccess: null, onerror: null })),
					put: vi
						.fn()
						.mockImplementation(() => ({ onsuccess: null, onerror: null })),
					get: vi.fn().mockImplementation(() => ({
						onsuccess: null,
						onerror: null,
						result: null,
					})),
					getAll: vi.fn().mockImplementation(() => ({
						onsuccess: null,
						onerror: null,
						result: [],
					})),
					index: vi.fn().mockReturnValue({
						getAll: vi.fn().mockImplementation(() => ({
							onsuccess: null,
							onerror: null,
							result: [],
						})),
					}),
					createIndex: vi.fn(),
				}),
				oncomplete: null,
				onerror: null,
			}),
			close: vi.fn(),
			version: version || 1,
			name: name,
			objectStoreNames: {
				contains: vi.fn().mockReturnValue(true),
			},
		},
	})),
	deleteDatabase: vi.fn().mockImplementation(() => ({
		onsuccess: null,
		onerror: null,
	})),
} as unknown as IDBFactory;

// Mock MediaRecorder
global.MediaRecorder = class {
	static isTypeSupported = vi.fn().mockReturnValue(true);
	start = vi.fn();
	stop = vi.fn();
	pause = vi.fn();
	resume = vi.fn();
	ondataavailable = null;
	onerror = null;
	onstop = null;
	state = "inactive" as "inactive" | "recording" | "paused";
} as unknown as typeof MediaRecorder;

// Mock navigator.mediaDevices
global.navigator = {
	...global.navigator,
	mediaDevices: {
		getDisplayMedia: vi.fn(),
		getUserMedia: vi.fn(),
	},
	userAgent: "test-user-agent",
} as unknown as Navigator;

// Mock screen
global.screen = {
	width: 1920,
	height: 1080,
	availWidth: 1920,
	availHeight: 1040,
} as unknown as Screen;

// Mock WebSocket
global.WebSocket = class {
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
} as unknown as typeof WebSocket;

// Mock performance
global.performance = {
	now: vi.fn(() => Date.now()),
} as unknown as Performance;
