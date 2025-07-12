// SSR (Server-Side Rendering) environment detection and safe guards

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = (): boolean => {
	return typeof window !== "undefined" && 
		   typeof document !== "undefined" && 
		   typeof navigator !== "undefined";
};

/**
 * Check if we're running in a Node.js environment
 */
export const isNode = (): boolean => {
	return typeof process !== "undefined" && 
		   process.versions && 
		   !!process.versions.node;
};

/**
 * Check if SSR environment (Next.js, Nuxt.js, etc.)
 */
export const isSSR = (): boolean => {
	return !isBrowser() && isNode();
};

/**
 * Throw an error if not in browser environment
 */
export const requireBrowser = (functionName: string): void => {
	if (!isBrowser()) {
		throw new Error(
			`${functionName} is only available in browser environments. ` +
			`This function cannot be used during server-side rendering (SSR). ` +
			`Please ensure this code runs only on the client side.`
		);
	}
};

/**
 * Safe wrapper for browser-only code
 */
export const safeExecute = <T>(
	fn: () => T, 
	fallback?: T,
	errorMessage?: string
): T | undefined => {
	if (!isBrowser()) {
		if (errorMessage) {
			console.warn(errorMessage);
		}
		return fallback;
	}
	
	try {
		return fn();
	} catch (error) {
		console.error('Error in browser execution:', error);
		return fallback;
	}
};

/**
 * Create a safe API wrapper that works in SSR
 */
export const createSSRSafeAPI = <T extends Record<string, any>>(
	browserAPI: T,
	fallbackAPI?: Partial<T>
): T => {
	if (isBrowser()) {
		return browserAPI;
	}
	
	// Return no-op functions for SSR
	const ssrSafeAPI = {} as T;
	
	for (const key in browserAPI) {
		const original = browserAPI[key];
		
		if (typeof original === 'function') {
			ssrSafeAPI[key] = ((...args: any[]) => {
				console.warn(
					`Function ${key} called in SSR environment. ` +
					`This function is browser-only and will not execute.`
				);
				
				// Return fallback if provided
				if (fallbackAPI && key in fallbackAPI) {
					const fallbackFn = fallbackAPI[key];
					if (typeof fallbackFn === 'function') {
						return fallbackFn(...args);
					}
					return fallbackFn;
				}
				
				// Return appropriate default based on function name
				if (key.startsWith('get')) {
					return null;
				}
				if (key.startsWith('is')) {
					return false;
				}
				return Promise.resolve();
			}) as any;
		} else {
			ssrSafeAPI[key] = (fallbackAPI?.[key] ?? null) as any;
		}
	}
	
	return ssrSafeAPI;
};

/**
 * Environment info for debugging
 */
export const getEnvironmentInfo = () => {
	return {
		isBrowser: isBrowser(),
		isNode: isNode(),
		isSSR: isSSR(),
		userAgent: isBrowser() ? navigator.userAgent : 'N/A',
		nodeVersion: isNode() ? process.version : 'N/A'
	};
};