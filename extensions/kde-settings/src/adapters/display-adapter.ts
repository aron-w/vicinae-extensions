import { Icon } from "@vicinae/api";

import { commandExists, runCommand } from "../lib/command.js";
import { matchesQuery } from "../lib/search.js";
import type { SettingResult, SettingsAdapter } from "../types.js";

interface DisplayState {
  outputId: string;
  name: string;
  hdrState?: boolean;
  hdrAvailable: boolean;
}

function parseDisplayStates(output: string): DisplayState[] {
  const lines = output.split(/\r?\n/);
  const states: DisplayState[] = [];
  let currentState: DisplayState | undefined;

  for (const line of lines) {
    const outputMatch = line.match(/^\s*Output:\s+(\d+)\s+(.+)$/i);

    if (outputMatch) {
      currentState = {
        outputId: outputMatch[1],
        name: outputMatch[2].replace(/\s+\(.*\)$/, "").trim(),
        hdrAvailable: false
      };
      states.push(currentState);
      continue;
    }

    if (currentState === undefined) {
      continue;
    }

    const lowerLine = line.toLowerCase();

    if (/\bhdr\b/.test(lowerLine)) {
      currentState.hdrAvailable = true;

      if (/\b(enabled|on|true|yes)\b/.test(lowerLine)) {
        currentState.hdrState = true;
      } else if (/\b(disabled|off|false|no)\b/.test(lowerLine)) {
        currentState.hdrState = false;
      }
    }
  }

  return states;
}

function displayModuleResult(): SettingResult {
  return {
    id: "display:kcm-kscreen",
    type: "module",
    title: "Displays & Monitor",
    subtitle: "Resolution, refresh rate, HDR, scaling",
    accessory: "kcm_kscreen",
    icon: Icon.Monitor,
    keywords: [
      "display",
      "monitor",
      "screen",
      "resolution",
      "refresh",
      "rate",
      "hdr",
      "sdr",
      "brightness",
      "scaling",
      "kscreen",
      "kcm_kscreen"
    ],
    actions: [
      {
        kind: "open",
        title: "Open Displays & Monitor",
        command: ["systemsettings", "kcm_kscreen"]
      },
      {
        kind: "command",
        title: "Open Displays & Monitor with kcmshell6",
        command: ["kcmshell6", "kcm_kscreen"]
      },
      {
        kind: "copy",
        title: "Copy Open Command",
        copyText: "systemsettings kcm_kscreen"
      }
    ]
  };
}

function hdrToggleResult(state: DisplayState): SettingResult | undefined {
  if (!state.hdrAvailable || state.hdrState === undefined) {
    return undefined;
  }

  const nextState = state.hdrState ? "disable" : "enable";
  const nextValue = state.hdrState ? "off" : "on";
  const command = ["kscreen-doctor", `output.${state.outputId}.hdr.${nextValue}`];

  return {
    id: `display:${state.outputId}:hdr`,
    type: "toggle",
    title: "HDR",
    subtitle: `Turn ${nextState} HDR for ${state.name}`,
    accessory: state.hdrState ? "On" : "Off",
    icon: Icon.Monitor,
    keywords: [
      "display",
      "monitor",
      "screen",
      "hdr",
      "high dynamic range",
      state.name
    ],
    actions: [
      {
        kind: "toggle",
        title: `Turn ${state.hdrState ? "Off" : "On"} HDR`,
        command
      },
      {
        kind: "open",
        title: "Open Displays & Monitor",
        command: ["systemsettings", "kcm_kscreen"]
      },
      {
        kind: "copy",
        title: "Copy HDR Command",
        copyText: command.join(" ")
      }
    ]
  };
}

function sdrBrightnessResult(hdrAvailable: boolean): SettingResult {
  return {
    id: "display:sdr-brightness",
    type: "value",
    title: "SDR Brightness",
    subtitle: "Open Displays & Monitor",
    accessory: hdrAvailable ? "Open Settings" : "Unavailable",
    icon: Icon.Monitor,
    keywords: [
      "display",
      "monitor",
      "screen",
      "hdr",
      "sdr",
      "brightness"
    ],
    actions: [
      {
        kind: "open",
        title: "Open Displays & Monitor",
        command: ["systemsettings", "kcm_kscreen"]
      },
      {
        kind: "copy",
        title: "Copy Open Command",
        copyText: "systemsettings kcm_kscreen"
      }
    ]
  };
}

export class DisplayAdapter implements SettingsAdapter {
  private cachedResults: SettingResult[] | undefined;

  async refresh(): Promise<void> {
    const baseResult = displayModuleResult();

    if (!(await commandExists("kscreen-doctor"))) {
      this.cachedResults = [baseResult];
      return;
    }

    try {
      const result = await runCommand(["kscreen-doctor", "-o"]);
      const states = parseDisplayStates(result.stdout);
      const hdrResults = states
        .map(hdrToggleResult)
        .filter((settingResult): settingResult is SettingResult => settingResult !== undefined);

      if (states.length === 0) {
        this.cachedResults = [baseResult];
        return;
      }

      this.cachedResults = [
        ...hdrResults,
        baseResult,
        sdrBrightnessResult(states.some((state) => state.hdrAvailable))
      ];
    } catch {
      this.cachedResults = [baseResult];
    }
  }

  async search(query: string): Promise<SettingResult[]> {
    await this.refresh();

    return (this.cachedResults ?? []).filter((result) => matchesQuery(result, query));
  }
}
