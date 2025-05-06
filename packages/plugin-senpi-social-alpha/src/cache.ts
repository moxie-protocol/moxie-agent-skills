export const FIVE_MINS = 60 * 5 * 1000; // 5 minutes in milliseconds
export const ONE_DAY = 60 * 60 * 24 * 1000; // 1 day in milliseconds
export const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
export const getTopCreatorsCacheKey = (senpiId: string) => {
    return `top_creators_${senpiId}`;
};

export const getTweetsCacheKey = (senpiId: string) => {
    return `tweets_${senpiId}`;
};

export const getCurrentSenpiUserContextCacheKey = (roomId: string) => {
    return `big_fan_senpi_user_context_${roomId}`;
};

export const getFarcasterCastsCacheKey = (fid: string) => {
    return `farcaster_casts_${fid}`;
};
