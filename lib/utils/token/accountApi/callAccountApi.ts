import { StorageKeys } from "../../../sessionManager";
import { getActiveStorage, getClaim } from "../index";

export type AccountApiRoute = `account_api/${string}`;

export async function callAccountApi<T>(route: AccountApiRoute): Promise<T> {
  const storage = getActiveStorage();
  if (!storage) {
    throw new Error("No active storage found.");
  }

  const token = await storage.getSessionItem(StorageKeys.accessToken);
  if (!token) {
    throw new Error("Authentication token not found.");
  }

  const domain = await getClaim("iss");
  if (!domain?.value) {
    throw new Error("Domain (iss claim) not found.");
  }

  let response;
  try {
    response = await fetch(`${domain.value}/${route}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    throw new Error(`Failed to fetch from ${domain.value}/${route}: ${error}`);
  }

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data: T = await response.json();
  return data;
}
