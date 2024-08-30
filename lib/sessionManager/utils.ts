export function splitString(str: string, length: number): string[] {
  if (length <= 0) {
    return [];
  }
  const result = [];
  for (let i = 0; i < str.length; i += length) {
    result.push(str.slice(i, i + length));
  }
  return result;
}
