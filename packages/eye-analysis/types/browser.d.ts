/**
 * Extended browser API type definitions for Eye Analysis library
 * This file provides proper TypeScript definitions for browser APIs
 * to eliminate the need for "as any" type assertions
 */

declare global {
	interface Window {
		/**
		 * Window Management API - getScreenDetails method
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/getScreenDetails
		 */
		getScreenDetails?: () => Promise<{
			screens: ScreenDetailed[];
			currentScreen: ScreenDetailed;
		}>;
	}

	interface ScreenDetailed extends Screen {
		/**
		 * Extended Screen properties from Window Management API
		 */
		availLeft: number;
		availTop: number;
		left: number;
		top: number;
		isPrimary: boolean;
		isInternal: boolean;
		devicePixelRatio: number;
		label: string;
	}
}

export {};
