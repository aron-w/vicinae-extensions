import { Action, ActionPanel, Icon, List, showToast, Toast } from "@vicinae/api";
import { useEffect, useMemo, useState } from "react";

import { DisplayAdapter } from "./adapters/display-adapter.js";
import { KcmModuleAdapter } from "./adapters/kcm-module-adapter.js";
import { launchCommand, runCommand } from "./lib/command.js";
import { sortResults } from "./lib/search.js";
import type { SettingAction, SettingResult, SettingsAdapter } from "./types.js";

function useSettingsSearch(query: string): {
  isLoading: boolean;
  results: SettingResult[];
} {
  const adapters = useMemo<SettingsAdapter[]>(() => [
    new DisplayAdapter(),
    new KcmModuleAdapter()
  ], []);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<SettingResult[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function search(): Promise<void> {
      setIsLoading(true);

      try {
        const adapterResults = await Promise.all(adapters.map((adapter) => adapter.search(query)));
        const nextResults = sortResults(adapterResults.flat(), query);

        if (!isCancelled) {
          setResults(nextResults);
        }
      } catch (error) {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : String(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not search KDE settings",
            message
          });
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void search();

    return () => {
      isCancelled = true;
    };
  }, [adapters, query]);

  return {
    isLoading,
    results
  };
}

async function executeAction(action: SettingAction): Promise<void> {
  if (action.command === undefined) {
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: action.title
  });

  try {
    if (action.kind === "open") {
      await launchCommand(action.command);
    } else {
      await runCommand(action.command, 10000);
    }

    await showToast({
      style: Toast.Style.Success,
      title: action.title
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Command failed",
      message
    });
  }
}

function iconForAction(action: SettingAction): Icon {
  switch (action.kind) {
    case "copy":
      return Icon.Clipboard;
    case "open":
      return Icon.Gear;
    case "toggle":
      return Icon.Switch;
    case "command":
      return Icon.Terminal;
  }
}

function ResultActions({ result }: { result: SettingResult }): JSX.Element {
  return (
    <ActionPanel>
      {result.actions.map((action) => {
        if (action.kind === "copy" && action.copyText !== undefined) {
          return (
            <Action.CopyToClipboard
              key={`${result.id}:${action.title}`}
              title={action.title}
              content={action.copyText}
              icon={iconForAction(action)}
            />
          );
        }

        return (
          <Action
            key={`${result.id}:${action.title}`}
            title={action.title}
            icon={iconForAction(action)}
            onAction={() => {
              void executeAction(action);
            }}
          />
        );
      })}
    </ActionPanel>
  );
}

export default function SearchKdeSettings(): JSX.Element {
  const [query, setQuery] = useState("");
  const { isLoading, results } = useSettingsSearch(query);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search KDE settings... :)"
    >
      {results.map((result) => (
        <List.Item
          key={result.id}
          title={result.title}
          subtitle={result.subtitle}
          icon={result.icon}
          accessories={[
            {
              text: result.accessory
            }
          ]}
          keywords={result.keywords}
          actions={<ResultActions result={result} />}
        />
      ))}
    </List>
  );
}
