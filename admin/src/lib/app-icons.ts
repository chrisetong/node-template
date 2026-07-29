import type { Component } from "vue";
import { elementPlusIconMap } from "./element-icons";
import { lucideIconMap } from "./lucide-icons";

export const appIconMap: Record<string, Component> = {
  ...lucideIconMap,
  ...elementPlusIconMap,
};

export function resolveAppIcon(name?: string): Component {
  const key = name || "";
  return (
    appIconMap[key] ??
    elementPlusIconMap[`el:${key}`] ??
    lucideIconMap.CircleDot
  );
}
