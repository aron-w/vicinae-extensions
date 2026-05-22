import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { Icon } from "@vicinae/api";

import { matchesQuery } from "../lib/search.js";
import type { SettingResult, SettingsAdapter } from "../types.js";

interface DesktopEntry {
  moduleId: string;
  name: string;
  comment: string;
  icon?: string;
  categories: string[];
  keywords: string[];
}

function dataDirs(): string[] {
  const rawDirs = process.env.XDG_DATA_DIRS ?? "/usr/local/share:/usr/share";

  return rawDirs
    .split(":")
    .map((path) => path.trim())
    .filter(Boolean);
}

function parseDesktopEntry(path: string): DesktopEntry | undefined {
  const content = readFileSync(path, "utf8");
  const entry: Record<string, string> = {};
  let inDesktopEntry = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      inDesktopEntry = line === "[Desktop Entry]";
      continue;
    }

    if (!inDesktopEntry) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);

    if (!key.includes("[") && entry[key] === undefined) {
      entry[key] = value;
    }
  }

  const baseName = path.split("/").pop() ?? "";
  const moduleId = (entry["X-KDE-ServiceTypes"]?.includes("KCModule") ? entry["X-KDE-PluginInfo-Name"] : undefined)
    ?? entry["X-KDE-PluginInfo-Name"]
    ?? baseName.replace(/\.desktop$/, "");
  const name = entry.Name;

  if (!name || !moduleId) {
    return undefined;
  }

  return {
    moduleId,
    name,
    comment: entry.Comment ?? "",
    icon: entry.Icon,
    categories: (entry.Categories ?? "").split(";").filter(Boolean),
    keywords: (entry.Keywords ?? "").split(";").filter(Boolean)
  };
}

function findDesktopFiles(): string[] {
  const seen = new Set<string>();
  const files: string[] = [];

  for (const dir of dataDirs()) {
    const applicationsDir = join(dir, "applications");

    if (!existsSync(applicationsDir)) {
      continue;
    }

    for (const filename of readdirSync(applicationsDir)) {
      if (!filename.startsWith("kcm_") || !filename.endsWith(".desktop")) {
        continue;
      }

      const path = join(applicationsDir, filename);

      if (seen.has(filename) || !statSync(path).isFile()) {
        continue;
      }

      seen.add(filename);
      files.push(path);
    }
  }

  return files;
}

function entryToResult(entry: DesktopEntry): SettingResult {
  const openCommand = ["systemsettings", entry.moduleId];
  const fallbackOpenCommand = ["kcmshell6", entry.moduleId];
  const keywords = [
    entry.moduleId,
    entry.name,
    entry.comment,
    ...entry.categories,
    ...entry.keywords
  ].filter(Boolean);

  return {
    id: `kcm:${entry.moduleId}`,
    type: "module",
    title: entry.name,
    subtitle: entry.comment || entry.moduleId,
    accessory: entry.moduleId,
    icon: entry.icon ?? Icon.Gear,
    keywords,
    actions: [
      {
        kind: "open",
        title: `Open ${entry.name}`,
        command: openCommand
      },
      {
        kind: "command",
        title: `Open ${entry.name} with kcmshell6`,
        command: fallbackOpenCommand
      },
      {
        kind: "copy",
        title: "Copy Open Command",
        copyText: openCommand.join(" ")
      }
    ]
  };
}

export class KcmModuleAdapter implements SettingsAdapter {
  private cachedResults: SettingResult[] | undefined;

  async refresh(): Promise<void> {
    const entries = findDesktopFiles()
      .map((path) => {
        try {
          return parseDesktopEntry(path);
        } catch {
          return undefined;
        }
      })
      .filter((entry): entry is DesktopEntry => entry !== undefined);

    this.cachedResults = entries.map(entryToResult);
  }

  async search(query: string): Promise<SettingResult[]> {
    if (this.cachedResults === undefined) {
      await this.refresh();
    }

    return (this.cachedResults ?? []).filter((result) => matchesQuery(result, query));
  }
}
