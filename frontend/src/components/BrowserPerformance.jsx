import { useEffect } from "react";
import {
    addResourceHint,
    getApiOrigin,
    prewarmBackend,
    runWhenIdle,
} from "../utils/browserPerformance";

export default function BrowserPerformance() {
    useEffect(() => {
        const apiOrigin = getApiOrigin();

        if (apiOrigin) {
            addResourceHint("dns-prefetch", apiOrigin);
            addResourceHint("preconnect", apiOrigin, { crossOrigin: "anonymous" });
        }

        addResourceHint("dns-prefetch", "https://accounts.google.com");
        addResourceHint("preconnect", "https://accounts.google.com");

        let cancelPrewarm = () => {};
        const cancelIdle = runWhenIdle(() => {
            cancelPrewarm = prewarmBackend();
        });

        return () => {
            cancelIdle();
            cancelPrewarm();
        };
    }, []);

    return null;
}
