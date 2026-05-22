import type { Image } from "@vicinae/api";

export type SettingResultType = "module" | "toggle" | "value" | "action";

export type SettingActionKind = "open" | "toggle" | "command" | "copy";

export interface SettingAction {
  kind: SettingActionKind;
  title: string;
  command?: string[];
  copyText?: string;
  dangerous?: false;
}

export interface SettingResult {
  id: string;
  type: SettingResultType;
  title: string;
  subtitle: string;
  accessory: string;
  icon?: Image.ImageLike;
  keywords: string[];
  actions: SettingAction[];
}

export interface SettingsAdapter {
  search(query: string): Promise<SettingResult[]>;
  refresh?(): Promise<void>;
}
