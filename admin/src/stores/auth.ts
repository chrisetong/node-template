import { defineStore } from "pinia";
import {
  api,
  clearAuthStorage,
  getAccessToken,
  getAuthStorage,
  setAccessToken,
} from "../api";

export type UserRole = {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
  isSuper: boolean;
};

export type CurrentUser = {
  id: number;
  username: string;
  enabled: boolean;
  department: { id: number; code: string; name: string } | null;
  roles: UserRole[];
  createdAt: string;
};

export type MenuNode = {
  id: number;
  name: string;
  path: string;
  component: string;
  icon: string;
  sort: number;
  children: MenuNode[];
};

type AuthMeResponse = {
  user: CurrentUser;
  menuTree: MenuNode[];
  permissions: string[];
};

const CURRENT_USER_KEY = "currentUser";
const MENU_TREE_KEY = "menuTree";
const PERMISSIONS_KEY = "permissions";

function readJson<T>(key: string): T | null {
  const raw = getAuthStorage().getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: getAccessToken(),
    currentUser: readJson<CurrentUser>(CURRENT_USER_KEY),
    menuTree: readJson<MenuNode[]>(MENU_TREE_KEY) ?? [],
    permissions: readJson<string[]>(PERMISSIONS_KEY) ?? [],
  }),
  actions: {
    setToken(token: string | null, remember = false) {
      this.accessToken = token;
      setAccessToken(token, remember);
    },
    setCurrentUser(user: CurrentUser | null) {
      this.currentUser = user;
      const storage = getAuthStorage();
      if (user) storage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      else storage.removeItem(CURRENT_USER_KEY);
    },
    setMenuTree(tree: MenuNode[]) {
      this.menuTree = tree;
      getAuthStorage().setItem(MENU_TREE_KEY, JSON.stringify(tree));
    },
    setPermissions(permissions: string[]) {
      this.permissions = permissions;
      getAuthStorage().setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
    },
    async fetchMe() {
      const { data } = await api.get<AuthMeResponse>("/auth/me");
      this.setCurrentUser(data.user);
      this.setMenuTree(data.menuTree ?? []);
      this.setPermissions(data.permissions ?? []);
      return data;
    },
    logout() {
      this.accessToken = null;
      this.currentUser = null;
      this.menuTree = [];
      this.permissions = [];
      clearAuthStorage();
    },
    async signOut() {
      try {
        await api.post("/auth/logout");
      } catch {
        /* clear locally regardless */
      } finally {
        this.logout();
      }
    },
  },
});
