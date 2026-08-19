export const getRoomId = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  try {
    const url = new URL(trimmedValue);
    const match = url.pathname.match(/^\/room\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : trimmedValue;
  } catch {
    return trimmedValue;
  }
};
