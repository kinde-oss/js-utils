import { getClaim } from "./getClaim";

/**
 *
 * @param keyName key to get from the token
 * @returns { Promise<string | number | string[] | null> }
 */
export const getFlag = async <T = string | boolean | number>(
  name: string,
): Promise<T | null> => {
  const flags = (
    await getClaim<
      { feature_flags: string },
      Record<string, { t: "b" | "i" | "s"; v: T }>
    >("feature_flags")
  )?.value;

  if (name && flags) {
    const value = flags[name];
    return value?.v || null;
  }
  return null;
};
