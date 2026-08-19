const normalizeUrl = (value: string) => value.replace(/\/$/, "");

const fallbackApiUrl = "http://localhost:5000";

export const API_URL = normalizeUrl(process.env.NEXT_PUBLIC_API_URL || fallbackApiUrl);

export const SOCKET_URL = normalizeUrl(process.env.NEXT_PUBLIC_SOCKET_URL || API_URL);

export const TURN_URL = process.env.NEXT_PUBLIC_TURN_URL;
export const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME;
export const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
