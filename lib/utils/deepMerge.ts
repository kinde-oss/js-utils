import { BaseAccountResponse } from "../types";

export const deepMerge = <T extends BaseAccountResponse>(
  obj1: T["data"],
  obj2: T["data"],
) => {
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    return Array.from(new Set([...obj1, ...obj2]));
  } else if (
    obj1 &&
    typeof obj1 === "object" &&
    obj2 &&
    typeof obj2 === "object"
  ) {
    const merged = { ...obj1 };
    for (const key of Object.keys(obj2)) {
      if (key in merged) {
        //@ts-expect-error // TypeScript doesn't know merged[key] is an object
        merged[key] = deepMerge(merged[key], obj2[key]);
      } else {
        //@ts-expect-error // TypeScript doesn't know merged[key] is an object
        merged[key] = obj2[key];
      }
    }
    return merged;
  }
  return obj2;
};
