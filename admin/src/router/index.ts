import { createRouter, createWebHistory } from "vue-router";
import { getAccessToken } from "../api";
import { useAuthStore } from "../stores/auth";
import { toast } from "../components/ui/toast";

const viewModules = import.meta.glob("../views/**/*.vue");
const addedMenuIds = new Set<number>();
let didRefreshMe = false;

function normalizeChildPath(path: string) {
  if (path === "/") return "";
  return path.startsWith("/") ? path.slice(1) : path;
}

function resolveView(component: string) {
  const key = `../views/${component}.vue`;
  const loader = viewModules[key];
  return typeof loader === "function" ? loader : null;
}

function ensureDynamicRoutes(
  menuTree: {
    id: number;
    name: string;
    path: string;
    component: string;
    icon: string;
    sort: number;
    children: any[];
  }[],
) {
  const stack = [...menuTree];
  while (stack.length) {
    const node = stack.shift()!;
    if (Array.isArray(node.children) && node.children.length) {
      stack.unshift(...node.children);
    }

    if (!node.component) continue;
    if (node.path === "/") continue;
    if (addedMenuIds.has(node.id)) continue;

    const view = resolveView(node.component);
    if (!view) continue;

    router.addRoute("layout", {
      path: normalizeChildPath(node.path),
      name: `menu-${node.id}`,
      component: view as any,
      meta: { title: node.name, requiresAuth: true },
    });

    addedMenuIds.add(node.id);
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "layout",
      component: () => import("../layouts/DefaultLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "home",
          component: () => import("../views/Home.vue"),
          meta: { title: "概览", requiresAuth: true },
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/auth/Login.vue"),
    },
    {
      path: "/403",
      name: "forbidden",
      component: () => import("../views/Forbidden.vue"),
    },
  ],
});

router.beforeEach(async (to) => {
  if (to.name === "login") return true;

  const token = getAccessToken();
  if (!token) return { name: "login" };

  const authStore = useAuthStore();
  if (!didRefreshMe) {
    try {
      await authStore.fetchMe();
      didRefreshMe = true;
    } catch {
      authStore.logout();
      return { name: "login" };
    }
  } else if (!authStore.currentUser) {
    try {
      await authStore.fetchMe();
    } catch {
      authStore.logout();
      return { name: "login" };
    }
  }

  ensureDynamicRoutes(authStore.menuTree);

  if (to.matched.length === 0) {
    return { path: to.fullPath, replace: true };
  }

  if (to.name === "forbidden") return true;

  if (to.name === "home") return true;

  const permissionForRoute = `route:${to.path}`;
  const allowed = authStore.permissions.includes(permissionForRoute);
  if (!allowed) {
    toast({
      title: "无权限访问",
      description: "你没有访问该页面的权限",
      variant: "destructive",
    });
    return { name: "forbidden" };
  }

  return true;
});

export default router;
