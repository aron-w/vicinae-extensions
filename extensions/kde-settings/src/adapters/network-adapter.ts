import { Icon } from "@vicinae/api";

import { commandExists, runCommand } from "../lib/command.js";
import { matchesQuery } from "../lib/search.js";
import type { SettingResult, SettingsAdapter } from "../types.js";

interface WifiState {
  enabled?: boolean;
  available: boolean;
}

function parseWifiState(output: string): WifiState {
  const state = output.trim().toLowerCase();

  if (["enabled", "on", "true", "yes"].includes(state)) {
    return {
      available: true,
      enabled: true
    };
  }

  if (["disabled", "off", "false", "no"].includes(state)) {
    return {
      available: true,
      enabled: false
    };
  }

  return {
    available: false
  };
}

function networkModuleAction(): SettingResult["actions"][number] {
  return {
    kind: "open",
    title: "Open Network Settings",
    command: ["systemsettings", "kcm_networkmanagement"]
  };
}

function wifiUnavailableResult(subtitle: string): SettingResult {
  return {
    id: "network:wifi",
    type: "value",
    title: "Wi-Fi",
    subtitle,
    accessory: "Unavailable",
    icon: Icon.WifiDisabled,
    keywords: [
      "network",
      "wifi",
      "wi-fi",
      "wlan",
      "wireless",
      "internet",
      "networkmanager",
      "nmcli"
    ],
    actions: [
      networkModuleAction()
    ]
  };
}

function wifiToggleResult(state: WifiState): SettingResult | undefined {
  if (!state.available || state.enabled === undefined) {
    return undefined;
  }

  const nextState = state.enabled ? "disable" : "enable";
  const nextValue = state.enabled ? "off" : "on";
  const command = ["nmcli", "radio", "wifi", nextValue];

  return {
    id: "network:wifi",
    type: "toggle",
    title: "Wi-Fi",
    subtitle: `Turn ${nextState} wireless networking`,
    accessory: state.enabled ? "On" : "Off",
    icon: state.enabled ? Icon.Wifi : Icon.WifiDisabled,
    keywords: [
      "network",
      "wifi",
      "wi-fi",
      "wlan",
      "wireless",
      "internet",
      "networkmanager",
      "nmcli"
    ],
    actions: [
      {
        kind: "toggle",
        title: `Turn ${state.enabled ? "Off" : "On"} Wi-Fi`,
        command
      },
      networkModuleAction(),
      {
        kind: "copy",
        title: "Copy Wi-Fi Command",
        copyText: command.join(" ")
      }
    ]
  };
}

export class NetworkAdapter implements SettingsAdapter {
  private cachedResults: SettingResult[] | undefined;

  async refresh(): Promise<void> {
    if (!(await commandExists("nmcli"))) {
      this.cachedResults = [];
      return;
    }

    try {
      const result = await runCommand(["nmcli", "radio", "wifi"]);
      const state = parseWifiState(result.stdout);
      const wifiResult = wifiToggleResult(state);

      this.cachedResults = [
        wifiResult ?? wifiUnavailableResult("NetworkManager Wi-Fi radio state could not be read")
      ];
    } catch {
      this.cachedResults = [
        wifiUnavailableResult("NetworkManager is unavailable or Wi-Fi radio state could not be read")
      ];
    }
  }

  async search(query: string): Promise<SettingResult[]> {
    await this.refresh();

    return (this.cachedResults ?? []).filter((result) => matchesQuery(result, query));
  }
}
