const ANSI_ESCAPE =
  /\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;

export function stripAnsi(value: string) {
  return value.replace(ANSI_ESCAPE, "").replace(/\r/g, "");
}

export function isInactiveLspStatus(key: string, value: string) {
  const text = stripAnsi(value).trim();
  return (
    /\blsp\b/i.test(`${key} ${text}`) &&
    /\binactive\b/i.test(text)
  );
}
