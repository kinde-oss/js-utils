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
