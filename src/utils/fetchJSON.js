/**
 * Shared fetch helper for JSON API calls.
 * Throws an Error with the server's error message on non-OK responses.
 */
const fetchJSON = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export default fetchJSON;
