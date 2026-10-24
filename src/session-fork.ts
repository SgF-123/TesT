export type ForkMessage = {
  entryId?: string;
  text?: string;
};

export function resolveForkTarget(
  messages: readonly ForkMessage[],
  userMessageIds: readonly string[],
  target: { messageId?: string; text?: string },
) {
  if (!messages.length) {
    return null;
  }

  const targetMessageId = String(target.messageId || "");
  if (targetMessageId) {
    const selectedIndex = userMessageIds.findIndex(
      (messageId) => messageId === targetMessageId,
    );
    if (selectedIndex >= 0) {
      const fromEnd = userMessageIds.length - 1 - selectedIndex;
      const mapped = messages[messages.length - 1 - fromEnd];
      if (mapped?.entryId) {
        return mapped;
      }
    }
  }

  const targetText = String(target.text || "").trim();
  if (targetText) {
    const matched = [...messages]
      .reverse()
      .find((message) => String(message.text || "").trim() === targetText);
    if (matched?.entryId) {
      return matched;
    }
  }

  return messages[messages.length - 1]?.entryId
    ? messages[messages.length - 1]
    : null;
}
