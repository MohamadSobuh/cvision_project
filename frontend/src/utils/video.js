export const getVideoEmbedUrl = (url) => {
    const rawUrl = (url || "").trim();

    if (!rawUrl) return "";

    try {
        const parsedUrl = new URL(rawUrl);
        const host = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

        if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
            if (pathParts[0] === "embed") return rawUrl;

            const videoId = parsedUrl.searchParams.get("v") || (
                ["shorts", "live"].includes(pathParts[0]) ? pathParts[1] : ""
            );

            return videoId ? `https://www.youtube.com/embed/${videoId}` : rawUrl;
        }

        if (host === "youtu.be") {
            const videoId = pathParts[0];
            return videoId ? `https://www.youtube.com/embed/${videoId}` : rawUrl;
        }
    } catch {
        return rawUrl;
    }

    return rawUrl;
};
