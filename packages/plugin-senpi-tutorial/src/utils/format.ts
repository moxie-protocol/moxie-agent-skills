import fetch from "node-fetch";

export const formatVideoLinks = async (videoLinks: string[]) => {
    const validVideoLink = await getFirstValidYoutubeId(videoLinks);
    return `<iframe src="${validVideoLink}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
};

export const extractYoutubeVideoId = (videoLink: string) =>
    videoLink.split("/")[4];

export const isValidYoutubeId = async (youtubeID: string) => {
    try {
        const url = `https://img.youtube.com/vi/${youtubeID}/0.jpg`;
        const response = await fetch(url, { method: "HEAD" });

        if (response.ok) {
            console.log("Valid Youtube ID");
            return true;
        } else {
            console.log("Invalid Youtube ID");
            return false;
        }
    } catch (error) {
        console.error("Error checking YouTube ID:", error);
        return false;
    }
};

export const getFirstValidYoutubeId = async (videoLinks: string[]) => {
    for (const videoLink of videoLinks) {
        const youtubeID = extractYoutubeVideoId(videoLink);
        const isValid = await isValidYoutubeId(youtubeID);
        if (isValid) return videoLink;
    }
};
