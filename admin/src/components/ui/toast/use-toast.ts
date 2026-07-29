import { readonly, ref } from "vue";

export type ToastVariant = "default" | "destructive";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
};

const toasts = ref<ToastItem[]>([]);

function randomId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function toast(input: {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}) {
  const item: ToastItem = {
    id: randomId(),
    title: input.title,
    description: input.description,
    variant: input.variant ?? "default",
    createdAt: Date.now(),
  };

  toasts.value = [item, ...toasts.value].slice(0, 3);

  const durationMs = input.durationMs ?? 2600;
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== item.id);
  }, durationMs);
}

export function useToasts() {
  return {
    toasts: readonly(toasts),
    dismiss: (id: string) => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    },
  };
}
