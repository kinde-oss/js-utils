/**
 * Splits a string into an array of substrings, each with a maximum specified length.
 *
 * This function uses a regular expression to split the input string into chunks,
 * where each chunk has a maximum length specified by the `length` parameter.
 * If the length is less than or equal to 0, an empty array is returned.
 *
 * @param str - The string to be split into chunks
 * @param length - The maximum length of each chunk. Must be greater than 0
 * @returns An array of strings, where each string has a maximum length of `length`
 *
 * @example
 * ```typescript
 * splitString("Hello World", 3)
 * // Returns: ["Hel", "lo ", "Wor", "ld"]
 *
 * splitString("JavaScript", 5)
 * // Returns: ["JavaS", "cript"]
 *
 * splitString("Test", 0)
 * // Returns: []
 * ```
 */
export function splitString(str: string, length: number): string[] {
  if (length <= 0) {
    return [];
  }
  return str.match(new RegExp(`.{1,${length}}`, "g")) || [];
}
