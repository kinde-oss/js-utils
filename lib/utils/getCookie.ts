export function getCookie(name: string): string | null {
  const cookies = document.cookie.split('; ');
  console.log(cookies);
  const cookieMatch = cookies.find(c => c.startsWith(`${name}=`));
  
  if (!cookieMatch) return null;
  
  try {
    console.log('cookieMatch:', cookieMatch); 
    const value = cookieMatch.split('=')[1];
    return value ? decodeURIComponent(value) : null;
  } catch (e) {
    console.error(`Error parsing cookie ${name}:`, e);
    return null;
  }
}
