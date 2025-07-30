/**
 * Recursively converts object keys from snake_case to camelCase.
 *
 * This function traverses an object (including nested objects and arrays) and converts
 * all property names from snake_case format to camelCase format. The function handles
 * nested objects, arrays, and primitive values appropriately.
 *
 * @template T - The expected return type (defaults to unknown)
 * @param obj - The object whose keys should be converted from snake_case to camelCase
 * @returns A new object with all keys converted to camelCase format
 *
 * @example
 * ```typescript
 * const input = {
 *   user_name: "John",
 *   user_details: {
 *     first_name: "John",
 *     last_name: "Doe",
 *     contact_info: {
 *       email_address: "john@example.com",
 *       phone_number: "123-456-7890"
 *     }
 *   },
 *   active_status: true
 * };
 *
 * const result = snakeToCamelCase(input);
 * // Returns:
 * // {
 * //   userName: "John",
 * //   userDetails: {
 * //     firstName: "John",
 * //     lastName: "Doe",
 * //     contactInfo: {
 * //       emailAddress: "john@example.com",
 * //       phoneNumber: "123-456-7890"
 * //     }
 * //   },
 * //   activeStatus: true
 * // }
 *
 * // With arrays
 * const arrayInput = {
 *   user_list: [
 *     { first_name: "John", last_name: "Doe" },
 *     { first_name: "Jane", last_name: "Smith" }
 *   ]
 * };
 *
 * const arrayResult = snakeToCamelCase(arrayInput);
 * // Returns:
 * // {
 * //   userList: [
 * //     { firstName: "John", lastName: "Doe" },
 * //     { firstName: "Jane", lastName: "Smith" }
 * //   ]
 * // }
 * ```
 */
export const snakeToCamelCase = <T = unknown>(obj: object): T => {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamelCase(item)) as T;
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      snakeToCamelCase(value),
    ]),
  ) as T;
};
