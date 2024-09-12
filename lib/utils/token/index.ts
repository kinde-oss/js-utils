import { SessionManager } from "../../sessionManager"; // Replace 'path/to/SessionManager' with the actual path to the SessionManager module

const storage = {
  value: null as SessionManager | null,
};

export const setActiveStorage = (store: SessionManager) => {
  storage.value = store;
  console.log("store", store);
};

export const getActiveStorage = () => {
  return storage.value;
};
