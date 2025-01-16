export function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + "=")) {
      const cookieValue = cookie.substring(name.length + 1);
      const parts = cookieValue.split(";");
      let hasExpiration = false;
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j].trim();
        if (part.startsWith("expires=")) {
          hasExpiration = true;
          const expirationDate = new Date(part.substring(8));
          if (expirationDate > new Date()) {
            return cookieValue || null; // Cookie is valid
          } else {
            return null; // Cookie is expired
          }
        }
      }
      if (!hasExpiration) {
        return cookieValue || null; // Cookie has no expiration, so it's valid
      }
    }
  }
  return null; // Cookie not found
}
