import { StorageKeys } from "../../../sessionManager";
import { BaseAccountResponse } from "../../../types";
import { deepMerge } from "../../deepMerge";
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

export const callAccountApiPaginated = async <T extends BaseAccountResponse>({
  url,
}: {
  url: AccountApiRoute;
}): Promise<T["data"]> => {
  let items: T["data"] = [];
  let returnValue = await callAccountApi<T>(url);
  items = returnValue.data;
  if (returnValue.metadata?.has_more) {
    let nextPageStartingAfter = returnValue.metadata.next_page_starting_after;
    while (returnValue.metadata.has_more) {
      returnValue = await callAccountApi<T>(
        `${url}?starting_after=${nextPageStartingAfter}`,
      );
      items = deepMerge(items, returnValue.data);
      nextPageStartingAfter = returnValue.metadata.next_page_starting_after;
    }
  }
  return items;
};
