import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const dataDirectory = join(projectRoot, "data");
const dataFile = join(dataDirectory, "expenses.json");
const settingsFile = join(dataDirectory, "settings.json");

export async function load() {
  await mkdir(dirname(dataFile), { recursive: true });

  try {
    const contents = await readFile(dataFile, "utf8");
    const expenses = JSON.parse(contents);
    if (!Array.isArray(expenses)) {
      throw new Error("Expense data must be a JSON array.");
    }
    return expenses;
  } catch (error) {
    if (error.code === "ENOENT") {
      await save([]);
      return [];
    }
    throw error;
  }
}

export async function save(expenses) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");
}

export async function loadSettings() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    const contents = await readFile(settingsFile, "utf8");
    const settings = JSON.parse(contents);
    if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
      throw new Error("Settings data must be a JSON object.");
    }
    return settings;
  } catch (error) {
    if (error.code === "ENOENT") {
      await saveSettings({});
      return {};
    }
    throw error;
  }
}

export async function saveSettings(settings) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}
