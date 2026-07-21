const HEALTH_PING_KEY = "cvision:lastBackendHealthPing";
const HEALTH_PING_INTERVAL_MS = 4 * 60 * 1000;

export function getApiOrigin() {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiBaseUrl) return null;

    try {
        return new URL(apiBaseUrl).origin;
    } catch {
        return null;
    }
}

export function getBackendHealthUrl() {
    const origin = getApiOrigin();
    return origin ? `${origin}/healthz/` : null;
}

export function addResourceHint(rel, href, options = {}) {
    if (typeof document === "undefined" || !href) return;

    const selector = `link[rel="${rel}"][href="${href}"]`;
    if (document.head.querySelector(selector)) return;

    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;

    if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin;
    }

    document.head.appendChild(link);
}

export function runWhenIdle(callback, timeout = 1500) {
    if (typeof window === "undefined") return () => {};

    if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(callback, { timeout });
        return () => window.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(callback, 250);
    return () => window.clearTimeout(id);
}

export function shouldSkipBackgroundNetworkWork() {
    if (typeof navigator === "undefined") return false;
    return Boolean(navigator.connection?.saveData);
}

export function prewarmBackend() {
    const healthUrl = getBackendHealthUrl();
    if (!healthUrl || typeof fetch !== "function" || shouldSkipBackgroundNetworkWork()) {
        return () => {};
    }

    try {
        const lastPing = Number(sessionStorage.getItem(HEALTH_PING_KEY) || 0);
        if (Date.now() - lastPing < HEALTH_PING_INTERVAL_MS) {
            return () => {};
        }
    } catch {
        // Storage can be blocked in private or strict browser modes.
    }

    const controller = "AbortController" in window ? new AbortController() : null;
    const timeoutId = window.setTimeout(() => controller?.abort(), 8000);

    fetch(healthUrl, {
        method: "GET",
        cache: "no-store",
        keepalive: true,
        signal: controller?.signal,
    })
        .then(() => {
            try {
                sessionStorage.setItem(HEALTH_PING_KEY, String(Date.now()));
            } catch {
                // Ignore storage quota and permission issues.
            }
        })
        .catch(() => {
            // This is best-effort only; user-facing requests still handle errors.
        })
        .finally(() => window.clearTimeout(timeoutId));

    return () => {
        window.clearTimeout(timeoutId);
        controller?.abort();
    };
}
