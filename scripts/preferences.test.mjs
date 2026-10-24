import assert from "node:assert/strict";
import test from "node:test";
import {
  preferenceKeys,
  readAccentPreference,
  readDarkPreference,
  readDensityPreference,
  writeAccentPreference,
  writeDarkPreference,
  writeDensityPreference,
} from "../src/preferences.ts";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

test("theme preference honors explicit query overrides", () => {
  const storage = memoryStorage();
  storage.setItem(preferenceKeys.dark, "1");

  assert.equal(readDarkPreference("", storage), true);
  assert.equal(readDarkPreference("?theme=light", storage), false);
  assert.equal(readDarkPreference("?theme=dark", storage), true);
  assert.equal(readDarkPreference("?dark=1", memoryStorage()), true);
});

test("appearance preferences persist and reject invalid values", () => {
  const storage = memoryStorage();

  assert.equal(readDensityPreference(storage), "comfortable");
  assert.equal(readAccentPreference(storage), "mint");

  writeDensityPreference(storage, "compact");
  writeAccentPreference(storage, "ocean");
  writeDarkPreference(storage, true);

  assert.equal(readDensityPreference(storage), "compact");
  assert.equal(readAccentPreference(storage), "ocean");
  assert.equal(readDarkPreference("", storage), true);

  storage.setItem(preferenceKeys.density, "invalid");
  storage.setItem(preferenceKeys.accent, "invalid");
  storage.setItem(preferenceKeys.dark, "0");

  assert.equal(readDensityPreference(storage), "comfortable");
  assert.equal(readAccentPreference(storage), "mint");
  assert.equal(readDarkPreference("", storage), false);
});
