import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { setupApiInterceptors } from "./api";
import { initTheme } from "./lib/theme";
import { useAuthStore } from "./stores/auth";
import { useSystemSettingStore } from "./stores/system-setting";

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(ElementPlus, { locale: zhCn });
  app.use(router);

  app.directive("permission", {
    mounted(el, binding) {
      const auth = useAuthStore();
      const required = Array.isArray(binding.value)
        ? binding.value
        : [binding.value];
      const allowed = required.some(
        (permission) =>
          typeof permission === "string" &&
          auth.permissions.includes(permission),
      );
      if (!allowed) el.remove();
    },
    updated(el, binding) {
      const auth = useAuthStore();
      const required = Array.isArray(binding.value)
        ? binding.value
        : [binding.value];
      const allowed = required.some(
        (permission) =>
          typeof permission === "string" &&
          auth.permissions.includes(permission),
      );
      if (!allowed) el.remove();
    },
  });

  setupApiInterceptors(router);
  initTheme();
  const settings = useSystemSettingStore(pinia);
  try {
    await settings.loadPublic();
  } catch {
    settings.applyFavicon();
  }
  app.mount("#app");
}

void bootstrap();
