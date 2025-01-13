export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  console.log("value", value);
  const parts = value.split(`; ${name}=`);
  console.log("parts.length", parts);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}
