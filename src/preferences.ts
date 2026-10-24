import type { AccentKey, Density } from "./settings-config";

export type PreferenceStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export const preferenceKeys = {
  dark: "tesT.dark",
  density: "tesT.density",
  accent: "tesT.accent",
} as const;

export function readDarkPreference(
  search: string,
  storage: PreferenceStorage,
) {
  const params = new URLSearchParams(search);
  const forcedTheme = params.get("theme");
  if (forcedTheme === "dark") {
    return true;
  }
  if (forcedTheme === "light") {
    return false;
  }
  return params.has("dark") || storage.getItem(preferenceKeys.dark) === "1";
}

export function readDensityPreference(
  storage: PreferenceStorage,
): Density {
  return storage.getItem(preferenceKeys.density) === "compact"
    ? "compact"
    : "comfortable";
}

export function readAccentPreference(
  storage: PreferenceStorage,
): AccentKey {
  const saved = storage.getItem(preferenceKeys.accent);
  return saved === "graphite" || saved === "ocean" ? saved : "mint";
}

export function writeDarkPreference(
  storage: PreferenceStorage,
  dark: boolean,
) {
  storage.setItem(preferenceKeys.dark, dark ? "1" : "0");
}

export function writeDensityPreference(
  storage: PreferenceStorage,
  density: Density,
) {
  storage.setItem(preferenceKeys.density, density);
}

export function writeAccentPreference(
  storage: PreferenceStorage,
  accent: AccentKey,
) {
  storage.setItem(preferenceKeys.accent, accent);
}
