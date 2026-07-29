<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RefreshCw, Save } from "lucide-vue-next";
import { api } from "../../api";
import SystemSettingImageUploader from "../../components/SystemSettingImageUploader.vue";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/toast";
import {
  DEFAULT_SYSTEM_SETTING,
  isEmptySystemSetting,
  resolveAssetUrl,
  useSystemSettingStore,
} from "../../stores/system-setting";

type SystemSettingForm = {
  siteName: string;
  loginLogoPath: string;
  loginDescription: string;
  loginBackgroundPath: string;
  filingText: string;
  filingUrl: string;
};

const emptyForm = (): SystemSettingForm => ({
  siteName: "",
  loginLogoPath: "",
  loginDescription: "",
  loginBackgroundPath: "",
  filingText: "",
  filingUrl: "",
});

const publicSetting = useSystemSettingStore();
const form = ref<SystemSettingForm>(emptyForm());
const loading = ref(false);
const saving = ref(false);
const previewSetting = computed(() =>
  isEmptySystemSetting(form.value) ? DEFAULT_SYSTEM_SETTING : form.value,
);
const logoUrl = computed(() =>
  resolveAssetUrl(previewSetting.value.loginLogoPath),
);
const backgroundUrl = computed(() =>
  resolveAssetUrl(previewSetting.value.loginBackgroundPath),
);
const hasPreviewVisual = computed(() =>
  Boolean(
    previewSetting.value.siteName ||
      previewSetting.value.loginLogoPath ||
      previewSetting.value.loginDescription ||
      previewSetting.value.loginBackgroundPath,
  ),
);

function hydrate(value: Partial<SystemSettingForm>) {
  const next = emptyForm();
  for (const key of Object.keys(next) as (keyof SystemSettingForm)[]) {
    next[key] = typeof value[key] === "string" ? value[key]!.trim() : "";
  }
  form.value = next;
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Partial<SystemSettingForm>>("/system-setting");
    hydrate(data);
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    const payload = Object.fromEntries(
      Object.entries(form.value).map(([key, value]) => [
        key,
        value.trim() || null,
      ]),
    );
    const { data } = await api.patch<Partial<SystemSettingForm>>(
      "/system-setting",
      payload,
    );
    hydrate(data);
    await publicSetting.loadPublic(true);
    toast({ title: "系统设置已保存", description: "新的视觉设置已全局生效" });
  } finally {
    saving.value = false;
  }
}

onMounted(() => void load());
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div>
        <h1 class="page-title">系统设置</h1>
        <p class="page-description">
          配置登录页、后台品牌和浏览器标题。所有字段均留空时，系统会使用内置默认登录页。
        </p>
      </div>
      <div class="page-actions">
        <Button variant="secondary" :loading="loading" @click="load">
          <RefreshCw class="h-4 w-4" />刷新
        </Button>
        <Button
          v-permission="'systemSetting:update'"
          :loading="saving"
          @click="save"
        >
          <Save class="h-4 w-4" />保存设置
        </Button>
      </div>
    </header>

    <div class="settings-grid">
      <section class="panel settings-form" :aria-busy="loading">
        <div class="section-heading">
          <h2>基础视觉设置</h2>
          <p>Logo 同时作为浏览器 favicon 使用，不单独维护 favicon。</p>
        </div>

        <div class="field">
          <label for="site-name">网站名称</label>
          <input
            id="site-name"
            v-model="form.siteName"
            class="app-input"
            maxlength="100"
            placeholder="全部字段留空时使用内置默认名称"
          />
        </div>

        <SystemSettingImageUploader
          v-model="form.loginLogoPath"
          kind="logo"
          label="登录页 Logo"
          recommended-size="512 × 512 px"
          hint="建议使用透明背景的正方形图片，可同时保证侧栏和 favicon 的清晰度"
          :disabled="loading || saving"
        />

        <div class="field">
          <label for="login-description">登录描述</label>
          <textarea
            id="login-description"
            v-model="form.loginDescription"
            class="app-textarea"
            maxlength="500"
            rows="4"
            placeholder="全部字段留空时使用内置默认描述"
          />
          <p class="field-hint">{{ form.loginDescription.length }}/500</p>
        </div>

        <SystemSettingImageUploader
          v-model="form.loginBackgroundPath"
          kind="background"
          label="登录背景图"
          recommended-size="1920 × 1080 px（16:9）"
          hint="建议使用宽屏图片，重要内容置于中央安全区域；预览区域会居中裁切"
          :disabled="loading || saving"
        />

        <div class="field">
          <label for="filing-text">登录页底部备案文字</label>
          <input
            id="filing-text"
            v-model="form.filingText"
            class="app-input"
            maxlength="200"
            placeholder="留空则不展示备案区域"
          />
        </div>

        <div class="field">
          <label for="filing-url">备案链接（可选）</label>
          <input
            id="filing-url"
            v-model="form.filingUrl"
            class="app-input"
            maxlength="500"
            type="url"
            placeholder="https://"
          />
          <p class="field-hint">仅接受完整的 http:// 或 https:// 链接。</p>
        </div>
      </section>

      <aside class="preview-column">
        <div class="preview-sticky">
          <div class="section-heading">
            <h2>登录页实时预览</h2>
            <p>预览按当前表单即时更新，保存后才会对其他用户生效。</p>
          </div>
          <div class="login-preview">
            <section
              v-if="hasPreviewVisual"
              class="preview-scene"
              :style="
                backgroundUrl
                  ? { backgroundImage: `linear-gradient(135deg, rgba(8,24,55,.78), rgba(8,24,55,.5)), url('${backgroundUrl}')` }
                  : undefined
              "
            >
              <div v-if="logoUrl || previewSetting.siteName" class="preview-brand">
                <img v-if="logoUrl" :src="logoUrl" alt="" />
                <strong v-if="previewSetting.siteName">{{ previewSetting.siteName }}</strong>
              </div>
              <p v-if="previewSetting.loginDescription">{{ previewSetting.loginDescription }}</p>
            </section>
            <section class="preview-form">
              <div class="preview-heading">
                <small>登录</small>
                <strong v-if="previewSetting.siteName">{{ previewSetting.siteName }}</strong>
              </div>
              <i /><i /><button type="button">登录</button>
              <div v-if="form.filingText" class="preview-filing">
                {{ form.filingText }}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.settings-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.9fr);gap:20px;align-items:start}.settings-form{display:grid;gap:22px;padding:24px}.section-heading h2{margin:0;color:var(--text);font-size:16px}.section-heading p{margin:6px 0 0;color:var(--text-secondary);font-size:12px;line-height:1.6}.app-textarea{width:100%;resize:vertical;padding:12px 14px;color:var(--text);background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;line-height:1.7}.app-textarea:focus{border-color:var(--brand-500);outline:3px solid rgba(47,116,220,.14)}.preview-column{min-width:0}.preview-sticky{position:sticky;top:92px}.login-preview{min-height:430px;display:grid;grid-template-columns:1.05fr .95fr;margin-top:12px;overflow:hidden;border:1px solid var(--border);border-radius:16px;background:var(--surface-raised);box-shadow:var(--shadow-card)}.preview-scene{display:flex;min-width:0;flex-direction:column;justify-content:space-between;padding:28px;color:#fff;background-color:#102957;background-size:cover;background-position:center}.preview-brand{display:flex;align-items:center;gap:10px;min-width:0}.preview-brand img{width:38px;height:38px;object-fit:contain}.preview-brand strong{overflow:hidden;text-overflow:ellipsis}.preview-scene>p{white-space:pre-wrap;font-size:15px;line-height:1.8}.preview-form{display:flex;min-width:0;flex-direction:column;justify-content:center;padding:26px}.preview-heading{display:grid;gap:4px;margin-bottom:24px}.preview-heading small{color:var(--text-muted)}.preview-heading strong{overflow:hidden;text-overflow:ellipsis;color:var(--text);font-size:20px}.preview-form>i{height:40px;margin-bottom:12px;border:1px solid var(--border);border-radius:8px}.preview-form>button{height:40px;margin-top:5px;border-radius:8px;background:var(--brand-600);color:#fff}.preview-filing{margin-top:28px;overflow-wrap:anywhere;text-align:center;color:var(--text-muted);font-size:10px}@media(max-width:1100px){.settings-grid{grid-template-columns:1fr}.preview-sticky{position:static}}@media(max-width:620px){.settings-form{padding:18px}.login-preview{grid-template-columns:1fr}.preview-scene{min-height:220px}.preview-form{min-height:300px}}
</style>
