<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowRight,
  LockKeyhole,
  RefreshCw,
  UserRound,
} from "lucide-vue-next";
import { api } from "../../api";
import { useAuthStore } from "../../stores/auth";
import { isDemoMode } from "../../demo/mode";
import { useSystemSettingStore } from "../../stores/system-setting";

type LoginResponse = { accessToken: string };
type LoginRequest = {
  username: string;
  password: string;
  captchaCode: string;
  captchaKey: string;
};

const router = useRouter();
const auth = useAuthStore();
const systemSetting = useSystemSettingStore();
const username = ref("");
const password = ref("");
const rememberMe = ref(false);
const captchaKey = ref("");
const captchaCode = ref("");
const captchaSvg = ref("");
const captchaLoading = ref(false);
const loading = ref(false);
const errorMessage = ref("");
const REMEMBER_ENABLED_KEY = "rememberLoginEnabled";
const REMEMBER_USERNAME_KEY = "rememberLoginUsername";
const canSubmit = computed(
  () =>
    username.value.trim() &&
    password.value &&
    captchaKey.value &&
    captchaCode.value.trim(),
);
const sceneStyle = computed(() =>
  systemSetting.loginBackgroundUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(8,24,55,.8), rgba(8,24,55,.48)), url('${systemSetting.loginBackgroundUrl}')`,
      }
    : undefined,
);

function hydrateRemembered() {
  rememberMe.value = localStorage.getItem(REMEMBER_ENABLED_KEY) === "1";
  if (rememberMe.value) {
    username.value = localStorage.getItem(REMEMBER_USERNAME_KEY) ?? "";
  }
}

function persistRemembered() {
  if (!rememberMe.value) {
    localStorage.removeItem(REMEMBER_ENABLED_KEY);
    localStorage.removeItem(REMEMBER_USERNAME_KEY);
    return;
  }
  localStorage.setItem(REMEMBER_ENABLED_KEY, "1");
  localStorage.setItem(REMEMBER_USERNAME_KEY, username.value.trim());
}

async function loadCaptcha() {
  captchaLoading.value = true;
  try {
    const { data } = await api.get<{ key: string; svg: string }>(
      "/auth/captcha",
    );
    captchaKey.value = data.key;
    captchaSvg.value = data.svg;
    captchaCode.value = isDemoMode ? "DEMO" : "";
  } catch {
    errorMessage.value = "验证码加载失败，请稍后重试";
  } finally {
    captchaLoading.value = false;
  }
}

async function onSubmit() {
  if (!canSubmit.value || loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const payload: LoginRequest = {
      username: username.value.trim(),
      password: password.value,
      captchaKey: captchaKey.value,
      captchaCode: captchaCode.value.trim(),
    };
    const { data } = await api.post<LoginResponse>("/auth/login", payload);
    if (!data?.accessToken) throw new Error();
    auth.setToken(data.accessToken, rememberMe.value);
    await auth.fetchMe();
    persistRemembered();
    await router.replace("/");
  } catch {
    errorMessage.value = "登录信息有误，请核对后重试";
    try {
      await loadCaptcha();
    } catch {
      /* loadCaptcha already reports its state */
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  hydrateRemembered();
  if (isDemoMode && !username.value) {
    username.value = "demo-admin";
    password.value = "Demo@123456";
  }
  void loadCaptcha();
});
</script>

<template>
  <main
    class="login-page"
    :class="{ 'without-visual': !systemSetting.hasLoginVisual }"
  >
    <section
      v-if="systemSetting.hasLoginVisual"
      class="brand-scene"
      :class="{ 'default-brand-scene': systemSetting.isDefaultStyle }"
      :style="sceneStyle"
      aria-label="网站登录视觉"
    >
      <template v-if="systemSetting.isDefaultStyle">
        <div class="scene-glow one" /><div class="scene-glow two" /><div class="scene-grid" />
        <div class="default-scene-content">
        <div class="default-login-brand"><span class="default-login-mark"><i /><i /><i /></span><span><strong>澄序</strong><small>让协作清晰有序</small></span></div>
        <div class="default-scene-message">
          <span class="default-eyebrow">专注每一次高效协作</span>
          <h1>把复杂事务，<br />整理成清晰进展。</h1>
          <p>统一管理团队、职责与工作信息，让每个人都能找到当下最重要的事。</p>
        </div>
        <div class="default-scene-card"><span class="default-pulse-dot" /><div><strong>今日工作井然有序</strong><small>信息清晰 · 协作顺畅 · 进展可见</small></div></div>
        </div>
      </template>
      <div v-else class="scene-content">
        <div
          v-if="systemSetting.loginLogoUrl || systemSetting.displaySiteName"
          class="login-brand"
        >
          <img
            v-if="systemSetting.loginLogoUrl"
            :src="systemSetting.loginLogoUrl"
            alt=""
          />
          <strong v-if="systemSetting.displaySiteName">{{
            systemSetting.displaySiteName
          }}</strong>
        </div>
        <p
          v-if="systemSetting.displayLoginDescription"
          class="scene-description"
        >
          {{ systemSetting.displayLoginDescription }}
        </p>
      </div>
    </section>

    <section class="login-panel">
      <div v-if="systemSetting.isDefaultStyle" class="default-mobile-brand"><span class="default-login-mark"><i /><i /><i /></span><strong>澄序</strong></div>
      <div
        v-else-if="systemSetting.loginLogoUrl || systemSetting.displaySiteName"
        class="mobile-brand"
      >
        <img
          v-if="systemSetting.loginLogoUrl"
          :src="systemSetting.loginLogoUrl"
          alt=""
        />
        <strong v-if="systemSetting.displaySiteName">{{ systemSetting.displaySiteName }}</strong>
      </div>

      <div class="login-form-wrap">
        <div v-if="systemSetting.isDefaultStyle" class="default-form-heading"><span>欢迎回来</span><h1>登录澄序</h1><p>请输入账号信息，继续你的工作。</p></div>
        <div v-else class="form-heading">
          <h1>登录</h1>
          <p v-if="systemSetting.displaySiteName">{{ systemSetting.displaySiteName }}</p>
        </div>
        <form @submit.prevent="onSubmit">
          <div class="login-field">
            <label for="username">账号</label>
            <div class="input-wrap">
              <UserRound />
              <input
                id="username"
                v-model="username"
                autocomplete="username"
                placeholder="请输入账号"
                required
              />
            </div>
          </div>
          <div class="login-field">
            <label for="password">密码</label>
            <div class="input-wrap">
              <LockKeyhole />
              <input
                id="password"
                v-model="password"
                autocomplete="current-password"
                type="password"
                placeholder="请输入密码"
                required
              />
            </div>
          </div>
          <div class="captcha-row">
            <div class="login-field">
              <label for="captcha">验证码</label>
              <div class="input-wrap">
                <input
                  id="captcha"
                  v-model="captchaCode"
                  autocomplete="one-time-code"
                  placeholder="请输入验证码"
                  required
                />
              </div>
            </div>
            <button
              class="captcha-image"
              type="button"
              aria-label="刷新验证码"
              :disabled="captchaLoading"
              @click="loadCaptcha"
            >
              <span v-if="captchaSvg" v-html="captchaSvg" />
              <RefreshCw v-else class="h-4 w-4 animate-spin" />
            </button>
          </div>
          <label class="remember-row">
            <input v-model="rememberMe" type="checkbox" />
            <span>记住我</span>
          </label>
          <div v-if="errorMessage" class="login-error" role="alert">
            {{ errorMessage }}
          </div>
          <button
            class="login-submit"
            type="submit"
            :disabled="!canSubmit || loading"
          >
            <span>{{ loading ? "正在登录…" : "登录" }}</span>
            <ArrowRight v-if="!loading" class="h-4 w-4" />
          </button>
        </form>

        <p v-if="systemSetting.isDefaultStyle" class="default-login-help">如需帮助，请联系你的业务负责人。</p>
        <footer v-if="systemSetting.setting.filingText" class="login-filing">
          <a
            v-if="systemSetting.setting.filingUrl"
            :href="systemSetting.setting.filingUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ systemSetting.setting.filingText }}
          </a>
          <span v-else>{{ systemSetting.setting.filingText }}</span>
        </footer>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page{min-height:100%;display:grid;grid-template-columns:minmax(420px,1.08fr) minmax(480px,.92fr);background:var(--surface)}.login-page.without-visual{grid-template-columns:1fr}.brand-scene{position:relative;min-height:100vh;overflow:hidden;color:#fff;background-color:#102957;background-size:cover;background-position:center}.default-brand-scene{background:radial-gradient(circle at 15% 12%,#387fd8 0,transparent 29%),linear-gradient(145deg,#173b75 0%,#102957 48%,#091832 100%)}.scene-grid{position:absolute;inset:0;opacity:.13;background-image:linear-gradient(rgba(255,255,255,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.25) 1px,transparent 1px);background-size:52px 52px;mask-image:linear-gradient(to bottom right,#000,transparent 78%)}.scene-glow{position:absolute;border-radius:50%;filter:blur(2px)}.scene-glow.one{width:430px;height:430px;right:-130px;top:12%;background:radial-gradient(circle,rgba(62,153,255,.34),transparent 68%)}.scene-glow.two{width:520px;height:520px;left:-240px;bottom:-210px;border:1px solid rgba(255,255,255,.12);box-shadow:0 0 0 70px rgba(255,255,255,.025),0 0 0 140px rgba(255,255,255,.018)}.default-scene-content,.scene-content{position:relative;z-index:2;min-height:100vh;display:flex;max-width:780px;flex-direction:column;padding:52px clamp(48px,7vw,112px)}.default-login-brand{display:flex;align-items:center;gap:13px}.default-login-brand>span:last-child{display:grid}.default-login-brand strong{font-size:20px;letter-spacing:.16em}.default-login-brand small{margin-top:3px;color:rgba(255,255,255,.62);font-size:11px}.default-login-mark{position:relative;display:grid;width:42px;height:42px;place-items:center;overflow:hidden;border-radius:13px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);box-shadow:0 10px 30px rgba(0,0,0,.13);backdrop-filter:blur(12px)}.default-login-mark i{position:absolute;width:21px;height:5px;border-radius:8px;background:#fff;transform:rotate(-34deg)}.default-login-mark i:first-child{transform:translate(-4px,-8px) rotate(-34deg);opacity:.72}.default-login-mark i:last-child{transform:translate(4px,8px) rotate(-34deg);opacity:.45}.default-scene-message{margin:auto 0}.default-eyebrow{display:inline-flex;padding:7px 11px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);font-size:12px}.default-scene-message h1{margin:24px 0 18px;font-size:clamp(38px,4vw,58px);line-height:1.18;letter-spacing:-.04em}.default-scene-message p{max-width:500px;color:rgba(255,255,255,.68);font-size:16px;line-height:1.9}.default-scene-card{display:flex;align-items:center;gap:13px;padding:16px 18px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(255,255,255,.07);backdrop-filter:blur(12px)}.default-scene-card strong,.default-scene-card small{display:block}.default-scene-card strong{font-size:13px}.default-scene-card small{margin-top:4px;color:rgba(255,255,255,.58);font-size:11px}.default-pulse-dot{width:9px;height:9px;border-radius:50%;background:#74ddb7;box-shadow:0 0 0 5px rgba(116,221,183,.14)}.scene-content{justify-content:space-between}.login-brand{display:flex;align-items:center;gap:14px;min-width:0}.login-brand img{width:48px;height:48px;object-fit:contain}.login-brand strong{overflow:hidden;text-overflow:ellipsis;font-size:20px;letter-spacing:.06em}.scene-description{margin:auto 0;max-width:560px;white-space:pre-wrap;font-size:clamp(24px,3vw,42px);font-weight:650;line-height:1.55;letter-spacing:-.025em}.login-panel{min-height:100vh;display:grid;place-items:center;padding:48px clamp(42px,7vw,108px)}.without-visual .login-panel{justify-self:center;width:min(100%,650px)}.login-form-wrap{width:100%;max-width:410px}.mobile-brand,.default-mobile-brand{display:none}.form-heading h1,.default-form-heading h1{margin:0;color:var(--text);font-size:30px;letter-spacing:-.035em}.form-heading p{margin:8px 0 34px;color:var(--text-secondary);font-size:14px}.form-heading:not(:has(p)){margin-bottom:34px}.default-form-heading>span{color:var(--brand-600);font-size:13px;font-weight:650}.default-form-heading h1{margin:7px 0 8px}.default-form-heading p{margin:0 0 34px;color:var(--text-secondary);font-size:14px}.login-field{display:grid;gap:9px;margin-bottom:19px}.login-field label{color:var(--text);font-size:13px;font-weight:600}.input-wrap{height:48px;display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface-raised);transition:.15s}.input-wrap:focus-within{border-color:var(--brand-500);box-shadow:0 0 0 3px rgba(47,116,220,.12)}.input-wrap svg{width:17px;color:var(--text-muted)}.input-wrap input{width:100%;min-width:0;background:transparent;color:var(--text);font-size:14px;outline:0}.input-wrap input::placeholder{color:var(--text-muted)}.captcha-row{display:grid;grid-template-columns:1fr 130px;align-items:end;gap:12px}.captcha-row .login-field{margin:0}.captcha-image{height:48px;overflow:hidden;border:1px solid var(--border);border-radius:10px;background:#fff;display:grid;place-items:center}.captcha-image span,.captcha-image :deep(svg){width:100%;height:100%}.remember-row{display:flex;min-height:44px;align-items:center;gap:9px;color:var(--text-secondary);font-size:13px;cursor:pointer}.remember-row input{width:16px;height:16px;accent-color:var(--brand-600)}.login-error{margin:3px 0 14px;padding:11px 13px;border-radius:9px;background:#fff1f1;color:#b42318;font-size:13px}.login-submit{height:48px;width:100%;display:flex;align-items:center;justify-content:center;gap:9px;border-radius:10px;background:var(--brand-600);color:#fff;font-size:14px;font-weight:650;box-shadow:0 8px 20px rgba(36,98,189,.22);transition:.15s}.login-submit:hover{background:var(--brand-700);transform:translateY(-1px)}.login-submit:disabled{opacity:.55;transform:none}.default-login-help,.login-filing{margin:24px 0 0;text-align:center;color:var(--text-muted);font-size:12px}.login-filing{line-height:1.7}.login-filing a{color:inherit;text-decoration:none}.login-filing a:hover{text-decoration:underline}@media(max-width:900px){.login-page{grid-template-columns:1fr}.brand-scene{display:none}.login-panel{min-height:100vh;padding:32px 24px}.mobile-brand,.default-mobile-brand{position:absolute;top:28px;left:28px;display:flex;align-items:center;gap:10px;max-width:calc(100% - 56px);color:var(--text)}.default-mobile-brand .default-login-mark{width:36px;height:36px;background:linear-gradient(145deg,#2868c7,#163f87)}.default-mobile-brand strong{letter-spacing:.12em}.mobile-brand img{width:38px;height:38px;object-fit:contain}.mobile-brand strong{overflow:hidden;text-overflow:ellipsis}.login-form-wrap{padding-top:56px}}@media(max-width:420px){.login-panel{padding:24px 20px}.form-heading h1,.default-form-heading h1{font-size:26px}.captcha-row{grid-template-columns:minmax(0,1fr) 112px}.captcha-image{width:112px}}
</style>
