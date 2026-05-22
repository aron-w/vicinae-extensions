import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export async function runCommand(command: string[], timeout = 5000): Promise<CommandResult> {
  if (command.length === 0) {
    throw new Error("No command provided");
  }

  const [file, ...args] = command;
  const result = await execFileAsync(file, args, {
    timeout,
    windowsHide: true
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr
  };
}

export async function launchCommand(command: string[]): Promise<void> {
  if (command.length === 0) {
    throw new Error("No command provided");
  }

  const [file, ...args] = command;
  const child = spawn(file, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });

  await new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("spawn", resolve);
  });

  child.unref();
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    await runCommand(["sh", "-c", `command -v "$1" >/dev/null`, "sh", command], 2000);
    return true;
  } catch {
    return false;
  }
}
