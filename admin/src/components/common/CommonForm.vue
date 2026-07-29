<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  ElAlert,
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTooltip,
  ElUpload,
} from "element-plus";
import AppDrawer from "./AppDrawer.vue";
import { api } from "../../api";
import IconPicker from "./IconPicker.vue";
import RichTextEditor from "./RichTextEditor.vue";
import JsonImageUploader from "../JsonImageUploader.vue";
import { HelpCircle } from "lucide-vue-next";

export type CommonField =
  | {
      name: string;
      label: string;
      type: "input" | "textarea" | "richtext";
      placeholder?: string;
      helpMessage?: string;
    }
  | {
      name: string;
      label: string;
      type: "select";
      options: { label: string; value: string | number }[];
      multiple?: boolean;
      filterable?: boolean;
      placeholder?: string;
      helpMessage?: string;
    }
  | {
      name: string;
      label: string;
      type: "datetime";
      helpMessage?: string;
    }
  | {
      name: string;
      label: string;
      type: "image";
      helpMessage?: string;
    }
  | {
      name: string;
      label: string;
      type: "images";
      max?: number;
      helpMessage?: string;
    }
  | {
      name: string;
      label: string;
      type: "jsonImages";
      max?: number;
      helpMessage?: string;
    }
  | {
      name: string;
      label: string;
      type: "icon";
      helpMessage?: string;
    }
  | {
      name: string;
      label: string;
      type: "switch";
      helpMessage?: string;
    };

const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
  fields: CommonField[];
  schema: {
    safeParse: (
      value: unknown,
    ) =>
      | { success: true; data: any }
      | {
          success: false;
          error: {
            flatten: () => {
              fieldErrors: Record<string, string[] | undefined>;
              formErrors: string[];
            };
          };
        };
    parse: (value: unknown) => any;
  };
  modelValue: Record<string, any>;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "update:modelValue", value: Record<string, any>): void;
  (e: "submit", value: Record<string, any>): void;
}>();

const values = reactive<Record<string, any>>({});
const errors = reactive<Record<string, string>>({});
const uploading = ref<Record<string, boolean>>({});

const canSubmit = computed(() => !props.submitting);

function setValue(name: string, value: any) {
  values[name] = value;
  emit("update:modelValue", { ...values });
}

function resetErrors() {
  for (const k of Object.keys(errors)) delete errors[k];
}

function hydrateFromModel() {
  const next: Record<string, any> = {};
  for (const f of props.fields) {
    const fromModel = props.modelValue?.[f.name];
    if (fromModel !== undefined) {
      next[f.name] = fromModel;
      continue;
    }
    next[f.name] =
      f.type === "switch"
        ? false
        : f.type === "images" ||
            f.type === "jsonImages" ||
            (f.type === "select" && f.multiple)
          ? []
          : "";
  }

  for (const k of Object.keys(values)) delete values[k];
  Object.assign(values, next);
  resetErrors();
}

watch(
  () => props.open,
  (open) => {
    if (open) hydrateFromModel();
  },
);

watch(
  () => props.modelValue,
  () => {
    if (props.open) hydrateFromModel();
  },
  { deep: true },
);

function validate(): boolean {
  resetErrors();
  const parsed = props.schema.safeParse(values);
  if (parsed.success) return true;

  const flattened = parsed.error.flatten();
  for (const [name, messages] of Object.entries(flattened.fieldErrors)) {
    const msg = Array.isArray(messages)
      ? messages.filter(Boolean)[0]
      : undefined;
    if (typeof msg === "string" && msg) errors[name] = msg;
  }
  if (flattened.formErrors.length) {
    errors._form = flattened.formErrors.join("; ");
  }
  return false;
}

function onSubmit() {
  if (!canSubmit.value) return;
  const ok = validate();
  if (!ok) return;

  const parsed = props.schema.parse(values);
  emit("submit", parsed);
}

function resolvePreviewUrl(value: any): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  )
    return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const base = String(api.defaults.baseURL ?? "").trim();
  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      return `${new URL(base).origin}${path}`;
    } catch {
      return `${base.replace(/\/$/, "")}${path}`;
    }
  }
  return `${window.location.origin}${path}`;
}

async function uploadImage(fieldName: string, file: File) {
  uploading.value = { ...uploading.value, [fieldName]: true };
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<{ relativePath: string }>(
      "/file/upload",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    if (typeof data?.relativePath === "string" && data.relativePath.trim()) {
      setValue(fieldName, data.relativePath.trim());
    }
  } finally {
    uploading.value = { ...uploading.value, [fieldName]: false };
  }
}

async function uploadRequest(
  fieldName: string,
  options: {
    file: File;
    onSuccess?: (data?: any) => void;
    onError?: (err: any) => void;
  },
) {
  try {
    await uploadImage(fieldName, options.file);
    options.onSuccess?.({ ok: true });
  } catch (e) {
    options.onError?.(e);
  }
}
</script>

<template>
  <AppDrawer
    :open="open"
    :title="title"
    :description="description"
    :busy="submitting"
    @update:open="emit('update:open', $event)"
  >
    <ElAlert
      v-if="errors._form"
      type="error"
      :closable="false"
      show-icon
      class="mb-4"
    >
      {{ errors._form }}
    </ElAlert>

    <ElForm label-position="top">
      <ElFormItem
        v-for="field in fields"
        :key="field.name"
        :error="errors[field.name]"
      >
        <template #label>
          <span class="inline-flex items-center gap-2">
            <span>{{ field.label }}</span>
            <ElTooltip
              v-if="field.helpMessage"
              :content="field.helpMessage"
              placement="top"
              effect="dark"
              :show-after="100"
              popper-class="whitespace-pre-line max-w-[360px]"
            >
              <span class="inline-flex items-center">
                <HelpCircle class="h-4 w-4 text-neutral-400" />
              </span>
            </ElTooltip>
          </span>
        </template>

        <ElInput
          v-if="field.type === 'input'"
          :model-value="values[field.name]"
          :placeholder="field.placeholder"
          clearable
          @update:model-value="setValue(field.name, $event)"
        />

        <ElInput
          v-else-if="field.type === 'textarea'"
          :model-value="values[field.name]"
          type="textarea"
          :rows="4"
          :placeholder="field.placeholder"
          @update:model-value="setValue(field.name, $event)"
        />

        <RichTextEditor
          v-else-if="field.type === 'richtext'"
          :model-value="values[field.name]"
          :placeholder="field.placeholder"
          :disabled="submitting"
          @update:modelValue="setValue(field.name, $event)"
        />

        <ElSelect
          v-else-if="field.type === 'select'"
          :model-value="values[field.name]"
          class="w-full"
          :multiple="field.multiple"
          :filterable="field.filterable"
          :placeholder="field.placeholder || '请选择'"
          @update:model-value="setValue(field.name, $event)"
        >
          <ElOption
            v-for="opt in field.options"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </ElSelect>

        <ElDatePicker
          v-else-if="field.type === 'datetime'"
          :model-value="values[field.name]"
          type="datetime"
          class="w-full"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm"
          @update:model-value="setValue(field.name, $event)"
        />

        <div v-else-if="field.type === 'image'" class="grid gap-3 w-full">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-xs text-neutral-500">当前图片</div>
              <div
                class="mt-1 break-all text-xs font-semibold text-neutral-700"
              >
                {{ values[field.name] ? "已选择" : "未选择" }}
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <ElUpload
                :show-file-list="false"
                accept="image/*"
                :disabled="Boolean(uploading[field.name]) || submitting"
                :http-request="(opt: any) => uploadRequest(field.name, opt)"
              >
                <ElButton
                  :loading="Boolean(uploading[field.name])"
                  :disabled="submitting"
                >
                  {{ uploading[field.name] ? "上传中…" : "选择图片" }}
                </ElButton>
              </ElUpload>
              <ElButton
                v-if="values[field.name]"
                :disabled="Boolean(uploading[field.name]) || submitting"
                @click="setValue(field.name, '')"
              >
                清除
              </ElButton>
            </div>
          </div>

          <img
            v-if="resolvePreviewUrl(values[field.name])"
            :src="resolvePreviewUrl(values[field.name])"
            class="max-h-48 w-full rounded-xl object-contain ring-1 ring-neutral-200"
            alt=""
            loading="lazy"
          />
        </div>

        <JsonImageUploader
          v-else-if="field.type === 'images'"
          :model-value="
            Array.isArray(values[field.name]) ? values[field.name] : []
          "
          :disabled="submitting"
          :max="field.max"
          @update:modelValue="setValue(field.name, $event)"
        />

        <JsonImageUploader
          v-else-if="field.type === 'jsonImages'"
          :model-value="
            Array.isArray(values[field.name]) ? values[field.name] : []
          "
          :disabled="submitting"
          :max="field.max"
          @update:modelValue="setValue(field.name, $event)"
        />

        <IconPicker
          v-else-if="field.type === 'icon'"
          :model-value="values[field.name]"
          @update:modelValue="setValue(field.name, $event)"
        />

        <ElSwitch
          v-else-if="field.type === 'switch'"
          :model-value="Boolean(values[field.name])"
          :disabled="submitting"
          @update:model-value="setValue(field.name, $event)"
        />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton :disabled="submitting" @click="emit('update:open', false)"
        >取消</ElButton
      >
      <ElButton
        type="primary"
        :loading="submitting"
        :disabled="submitting"
        @click="onSubmit"
      >
        {{ submitting ? "提交中…" : "提交" }}
      </ElButton>
    </template>
  </AppDrawer>
</template>
