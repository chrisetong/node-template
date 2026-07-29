<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ChevronDown, ChevronsRight, LogOut, Menu, Moon,
  PanelLeftClose, Sun, UserRound, X,
} from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
import { Dialog } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { getAppliedTheme, toggleTheme } from "../lib/theme";
import Breadcrumbs from "../components/common/Breadcrumbs.vue";
import { resolveAppIcon } from "../lib/app-icons";
import { useSystemSettingStore } from "../stores/system-setting";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const systemSetting = useSystemSettingStore();
const isDark = ref(getAppliedTheme() === "dark");
const collapsed = ref(false);
const mobileOpen = ref(false);
const isMobile = ref(false);
const logoutDialogOpen = ref(false);
const expandedGroups = ref(new Set<string | number>());
const menuTree = computed(() => auth.menuTree ?? []);
const pageTitle = computed(() =>
  typeof route.meta?.title === "string" ? route.meta.title : "工作台",
);
const roleLabel = computed(
  () => auth.currentUser?.roles.map((role) => role.name).join("、") || "成员",
);

function updateViewport() {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) mobileOpen.value = false;
  if (window.innerWidth >= 768 && window.innerWidth < 1180) collapsed.value = true;
}
function toggleGroup(id: string | number) {
  const next = new Set(expandedGroups.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expandedGroups.value = next;
}
function isGroupExpanded(id: string | number) { return expandedGroups.value.has(id); }
function isActivePath(path: string) {
  return route.path === path || (path !== "/" && route.path.startsWith(`${path}/`));
}
function resolveIcon(name: string) {
  return resolveAppIcon(name);
}
function expandActiveGroup() {
  for (const item of menuTree.value) {
    if (item.children?.some((child) => isActivePath(child.path))) {
      expandedGroups.value.add(item.id);
    }
  }
}
function navigateDone() { if (isMobile.value) mobileOpen.value = false; }
function onToggleTheme() { isDark.value = toggleTheme() === "dark"; }
async function confirmLogout() {
  await auth.signOut();
  logoutDialogOpen.value = false;
  await router.replace({ name: "login" });
}

watch(() => route.path, () => { expandActiveGroup(); navigateDone(); }, { immediate: true });
onMounted(() => { updateViewport(); window.addEventListener("resize", updateViewport); });
onBeforeUnmount(() => window.removeEventListener("resize", updateViewport));
</script>

<template>
  <div class="layout-shell" :class="{ 'is-collapsed': collapsed }">
    <div v-if="mobileOpen" class="sidebar-mask" @click="mobileOpen = false" />
    <aside class="app-sidebar" :class="{ 'is-open': mobileOpen }">
      <div v-if="systemSetting.hasSidebarBrand" class="brand-row">
        <RouterLink to="/" class="brand-lockup" aria-label="后台首页">
          <img
            v-if="systemSetting.loginLogoUrl"
            class="brand-logo"
            :src="systemSetting.loginLogoUrl"
            alt=""
          />
          <span
            v-if="systemSetting.displaySiteName"
            v-show="!collapsed || isMobile"
            class="brand-copy"
          >
            <strong>{{ systemSetting.displaySiteName }}</strong>
          </span>
        </RouterLink>
        <button v-if="isMobile" class="icon-button" aria-label="关闭导航" @click="mobileOpen = false">
          <X class="h-5 w-5" />
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="主导航">
        <template v-for="item in menuTree" :key="item.id">
          <div v-if="item.children?.length">
            <button
              class="nav-item"
              :class="{ active: item.children.some((child) => isActivePath(child.path)) }"
              :title="collapsed && !isMobile ? item.name : undefined"
              @click="toggleGroup(item.id)"
            >
              <component :is="resolveIcon(item.icon)" class="h-[18px] w-[18px]" />
              <span v-show="!collapsed || isMobile">{{ item.name }}</span>
              <ChevronDown
                v-show="!collapsed || isMobile"
                class="ml-auto h-4 w-4 transition-transform"
                :class="{ '-rotate-90': !isGroupExpanded(item.id) }"
              />
            </button>
            <div v-show="(!collapsed || isMobile) && isGroupExpanded(item.id)" class="subnav">
              <RouterLink
                v-for="child in item.children"
                :key="child.id"
                :to="child.path"
                class="nav-item sub"
                :class="{ active: isActivePath(child.path) }"
              >
                <span class="sub-dot" />{{ child.name }}
              </RouterLink>
            </div>
          </div>
          <RouterLink
            v-else
            :to="item.path"
            class="nav-item"
            :class="{ active: isActivePath(item.path) }"
            :title="collapsed && !isMobile ? item.name : undefined"
          >
            <component :is="resolveIcon(item.icon)" class="h-[18px] w-[18px]" />
            <span v-show="!collapsed || isMobile">{{ item.name }}</span>
          </RouterLink>
        </template>
      </nav>

      <div class="sidebar-footer">
        <button class="account-compact" @click="router.push('/profile')">
          <span class="avatar">{{ auth.currentUser?.username?.slice(0, 1).toUpperCase() || "" }}</span>
          <span v-show="!collapsed || isMobile" class="min-w-0 text-left">
            <strong>{{ auth.currentUser?.username ?? "用户" }}</strong>
            <small>{{ roleLabel }}</small>
          </span>
        </button>
      </div>
    </aside>

    <section class="layout-main">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="icon-button"
            :aria-label="isMobile ? '打开导航' : collapsed ? '展开导航' : '收起导航'"
            @click="isMobile ? (mobileOpen = true) : (collapsed = !collapsed)"
          >
            <Menu v-if="isMobile" class="h-5 w-5" />
            <PanelLeftClose v-else-if="!collapsed" class="h-5 w-5" />
            <ChevronsRight v-else class="h-5 w-5" />
          </button>
          <div class="page-context">
            <Breadcrumbs />
            <strong>{{ pageTitle }}</strong>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="icon-button" :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'" @click="onToggleTheme">
            <Sun v-if="isDark" class="h-5 w-5" /><Moon v-else class="h-5 w-5" />
          </button>
          <el-dropdown trigger="click">
            <button class="user-menu">
              <span class="avatar small">{{ auth.currentUser?.username?.slice(0, 1).toUpperCase() || "" }}</span>
              <span class="user-menu-copy"><strong>{{ auth.currentUser?.username ?? "用户" }}</strong><small>{{ roleLabel }}</small></span>
              <ChevronDown class="h-4 w-4" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')"><UserRound class="mr-2 h-4 w-4" />个人设置</el-dropdown-item>
                <el-dropdown-item divided @click="logoutDialogOpen = true"><LogOut class="mr-2 h-4 w-4" />退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content-area"><RouterView /></main>
    </section>
  </div>

  <Dialog v-model:open="logoutDialogOpen" size="sm" title="退出登录" description="确认要结束本次登录吗？">
    <p class="text-sm text-neutral-600 dark:text-neutral-400">退出后，下次使用时需要重新验证身份。</p>
    <template #footer="{ close }">
      <Button variant="secondary" @click="close">取消</Button>
      <Button variant="destructive" @click="confirmLogout">确认退出</Button>
    </template>
  </Dialog>
</template>

<style scoped>
.layout-shell{min-height:100%;background:var(--surface-soft)}
.app-sidebar{position:fixed;inset:0 auto 0 0;z-index:40;display:flex;width:var(--sidebar-width);flex-direction:column;background:var(--surface);border-right:1px solid var(--border);transition:width .2s ease,transform .25s ease}
.brand-row{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid var(--border)}
.brand-lockup{display:flex;min-width:0;align-items:center;gap:11px;color:var(--text);text-decoration:none}
.brand-logo{width:36px;height:36px;flex:0 0 auto;object-fit:contain}.brand-copy{display:grid;min-width:0}.brand-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17px;letter-spacing:.04em}
.sidebar-nav{flex:1;overflow-y:auto;padding:14px 12px}.nav-item{display:flex;width:100%;min-height:42px;align-items:center;gap:11px;margin:2px 0;padding:0 12px;border-radius:9px;color:var(--text-secondary);font-size:14px;font-weight:500;transition:.15s}
.nav-item:hover{background:var(--surface-soft);color:var(--text)}.nav-item.active{background:var(--brand-50);color:var(--brand-700);font-weight:600}.dark .nav-item.active{background:rgba(47,116,220,.16);color:#91baff}
.subnav{padding-left:17px}.nav-item.sub{padding-left:22px}.sub-dot{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.5}
.sidebar-footer{padding:12px;border-top:1px solid var(--border)}.account-compact{display:flex;width:100%;align-items:center;gap:10px;padding:8px;border-radius:10px}.account-compact:hover{background:var(--surface-soft)}
.avatar{display:grid;width:38px;height:38px;flex:0 0 auto;place-items:center;border-radius:11px;background:var(--brand-100);color:var(--brand-700);font-size:14px;font-weight:700}.dark .avatar{background:rgba(47,116,220,.18);color:#9cc0ff}.avatar.small{width:34px;height:34px;border-radius:9px}
.account-compact strong,.account-compact small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-compact strong{color:var(--text);font-size:13px}.account-compact small{margin-top:2px;color:var(--text-muted);font-size:11px}
.layout-main{min-height:100vh;margin-left:var(--sidebar-width);transition:margin .2s ease}.topbar{position:sticky;top:0;z-index:30;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:color-mix(in srgb,var(--surface) 92%,transparent);border-bottom:1px solid var(--border);backdrop-filter:blur(14px)}
.topbar-left,.topbar-actions,.user-menu{display:flex;align-items:center}.topbar-left{gap:12px}.topbar-actions{gap:5px}.page-context{display:grid;gap:3px}.page-context strong{font-size:15px;color:var(--text)}
.user-menu{gap:9px;padding:5px 7px;border-radius:10px;color:var(--text-secondary)}.user-menu:hover{background:var(--surface-soft)}.user-menu-copy{display:grid;min-width:92px;text-align:left}.user-menu-copy strong{color:var(--text);font-size:13px}.user-menu-copy small{margin-top:1px;color:var(--text-muted);font-size:10px}
.content-area{min-width:0;padding:26px 28px 40px}.sidebar-mask{position:fixed;inset:0;z-index:35;background:rgba(10,16,25,.52);backdrop-filter:blur(2px)}
.is-collapsed .app-sidebar{width:72px}.is-collapsed .layout-main{margin-left:72px}.is-collapsed .brand-row{padding:0 18px}.is-collapsed .sidebar-nav{padding-inline:10px}.is-collapsed .nav-item{justify-content:center;padding:0}
@media(max-width:767px){.app-sidebar{width:min(82vw,280px);transform:translateX(-102%);box-shadow:18px 0 50px rgba(0,0,0,.16)}.app-sidebar.is-open{transform:none}.layout-main,.is-collapsed .layout-main{margin-left:0}.topbar{height:64px;padding:0 14px}.content-area{padding:20px 16px 32px}.page-context nav,.user-menu-copy,.user-menu>svg{display:none}.page-context strong{font-size:14px}}
</style>
