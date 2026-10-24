import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { ChatMessage } from "./chat-types";
import {
  readScrollMemory,
  writeScrollMemory,
  type ScrollMemoryStore,
} from "./scroll-memory";
import {
  buildTurnNavigation,
  TURN_NAVIGATOR_MIN_TURNS,
  type TurnNavigationItem,
} from "./turn-navigation";

type UseSessionNavigationOptions = {
  activeSessionPath: string;
  liveMessages: ChatMessage[];
  messagesLoading: boolean;
  historyLoading: boolean;
  messagesRef: RefObject<HTMLDivElement | null>;
};

export function useSessionNavigation({
  activeSessionPath,
  liveMessages,
  messagesLoading,
  historyLoading,
  messagesRef,
}: UseSessionNavigationOptions) {
  const [messageRenderLimit, setMessageRenderLimit] = useState(120);
  const [showScrollLatest, setShowScrollLatest] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [unseenMessages, setUnseenMessages] = useState(0);
  const [findOpen, setFindOpen] = useState(
    new URLSearchParams(window.location.search).has("find"),
  );
  const [findQuery, setFindQuery] = useState(
    new URLSearchParams(window.location.search).get("find") ?? "",
  );
  const [findIndex, setFindIndex] = useState(0);

  const scrollMemoryRef = useRef<ScrollMemoryStore>(readScrollMemory());
  const scrollMemorySaveTimerRef = useRef<number | null>(null);
  const scrollAnchorTimerRef = useRef<number | null>(null);
  const stickToBottomRef = useRef(true);
  const suppressScrollLatestRef = useRef(false);
  const scrollLatestTimerRef = useRef<number | null>(null);
  const scrollStateFrameRef = useRef<number | null>(null);
  const lastLiveMessageCountRef = useRef(0);
  const pendingTurnLocateRef = useRef<{
    messageId: string;
    behavior: ScrollBehavior;
  } | null>(null);

  const scrollMessagesToBottom = (
    behavior: ScrollBehavior = "auto",
  ) => {
    suppressScrollLatestRef.current = true;
    setShowScrollLatest(false);
    setUnseenMessages(0);
    if (scrollLatestTimerRef.current) {
      window.clearTimeout(scrollLatestTimerRef.current);
    }
    window.requestAnimationFrame(() => {
      const element = messagesRef.current;
      if (!element) {
        suppressScrollLatestRef.current = false;
        return;
      }
      element.scrollTo({ top: element.scrollHeight, behavior });
      scrollLatestTimerRef.current = window.setTimeout(
        () => {
          suppressScrollLatestRef.current = false;
          stickToBottomRef.current = true;
          setShowScrollLatest(false);
          setShowScrollTop(
            Boolean(
              messagesRef.current && messagesRef.current.scrollTop > 360,
            ),
          );
        },
        behavior === "smooth" ? 420 : 60,
      );
    });
  };

  const scrollMessagesToTop = () => {
    suppressScrollLatestRef.current = true;
    if (scrollLatestTimerRef.current) {
      window.clearTimeout(scrollLatestTimerRef.current);
    }
    window.requestAnimationFrame(() => {
      const element = messagesRef.current;
      if (!element) {
        suppressScrollLatestRef.current = false;
        return;
      }
      element.scrollTo({ top: 0, behavior: "smooth" });
      scrollLatestTimerRef.current = window.setTimeout(() => {
        suppressScrollLatestRef.current = false;
        stickToBottomRef.current = false;
        setShowScrollTop(false);
        setShowScrollLatest(
          element.scrollHeight - element.clientHeight > 72,
        );
      }, 420);
    });
  };

  const scrollMessageIntoView = useCallback(
    (messageId: string, behavior: ScrollBehavior = "smooth") => {
      const container = messagesRef.current;
      if (!container) {
        return false;
      }
      const target = Array.from(
        container.querySelectorAll<HTMLElement>("[data-msg-id]"),
      ).find((element) => element.dataset.msgId === messageId);
      if (!target) {
        return false;
      }
      if (scrollLatestTimerRef.current) {
        window.clearTimeout(scrollLatestTimerRef.current);
        scrollLatestTimerRef.current = null;
      }
      suppressScrollLatestRef.current = false;
      stickToBottomRef.current = false;
      target.scrollIntoView({ block: "center", behavior });
      return true;
    },
    [messagesRef],
  );

  const scheduleScrollMemorySave = useCallback(() => {
    if (scrollMemorySaveTimerRef.current !== null) {
      return;
    }
    scrollMemorySaveTimerRef.current = window.setTimeout(() => {
      scrollMemorySaveTimerRef.current = null;
      writeScrollMemory(scrollMemoryRef.current);
    }, 450);
  }, []);

  const rememberCurrentScroll = useCallback(
    (path: string) => {
      const container = messagesRef.current;
      if (!path || !container) {
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const anchorY =
        containerRect.top + Math.min(120, containerRect.height * 0.2);
      let messageId: string | null = null;
      let offset = 0;
      for (const element of container.querySelectorAll<HTMLElement>(
        ".message[data-msg-id]",
      )) {
        const rect = element.getBoundingClientRect();
        if (rect.bottom > anchorY) {
          messageId = element.dataset.msgId ?? null;
          offset = rect.top - containerRect.top;
          break;
        }
      }
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      scrollMemoryRef.current[path] = {
        messageId,
        offset,
        top: container.scrollTop,
        atBottom: distanceFromBottom < 72,
        updatedAt: Date.now(),
      };
      scheduleScrollMemorySave();
    },
    [messagesRef, scheduleScrollMemorySave],
  );

  const handleMessagesScroll = () => {
    if (suppressScrollLatestRef.current) {
      return;
    }
    if (scrollStateFrameRef.current !== null) {
      return;
    }
    scrollStateFrameRef.current = window.requestAnimationFrame(() => {
      scrollStateFrameRef.current = null;
      const element = messagesRef.current;
      if (!element) {
        return;
      }
      const distanceFromBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 72;
      setShowScrollLatest(distanceFromBottom >= 72);
      setShowScrollTop(element.scrollTop > 360);
      if (distanceFromBottom < 72) {
        setUnseenMessages(0);
      }
      if (activeSessionPath) {
        const previous = scrollMemoryRef.current[activeSessionPath];
        scrollMemoryRef.current[activeSessionPath] = {
          messageId: previous?.messageId ?? null,
          offset: previous?.offset ?? 0,
          top: element.scrollTop,
          atBottom: distanceFromBottom < 72,
          updatedAt: Date.now(),
        };
        scheduleScrollMemorySave();
        if (scrollAnchorTimerRef.current !== null) {
          window.clearTimeout(scrollAnchorTimerRef.current);
        }
        scrollAnchorTimerRef.current = window.setTimeout(() => {
          scrollAnchorTimerRef.current = null;
          rememberCurrentScroll(activeSessionPath);
        }, 180);
      }
    });
  };

  useEffect(() => {
    const viewport = messagesRef.current;
    if (!viewport) {
      return;
    }
    const content = viewport.querySelector(".thread");
    if (!content) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [messagesRef, activeSessionPath]);

  useEffect(() => {
    if (messagesLoading || historyLoading || !stickToBottomRef.current) {
      return;
    }
    scrollMessagesToBottom();
  }, [liveMessages, messagesLoading, historyLoading]);

  useEffect(() => {
    const previousCount = lastLiveMessageCountRef.current;
    lastLiveMessageCountRef.current = liveMessages.length;
    if (!stickToBottomRef.current && liveMessages.length > previousCount) {
      setUnseenMessages(
        (count) => count + (liveMessages.length - previousCount),
      );
      setShowScrollLatest(true);
    }
  }, [liveMessages]);

  useEffect(() => {
    setMessageRenderLimit(120);
  }, [activeSessionPath]);

  const findMatches = useMemo(() => {
    const needle = findQuery.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    return liveMessages
      .filter((message) => message.text.toLowerCase().includes(needle))
      .map((message) => message.id);
  }, [liveMessages, findQuery]);
  const findMatchSet = useMemo(
    () => new Set(findMatches),
    [findMatches],
  );
  const visibleLiveMessages = useMemo(
    () => liveMessages.slice(-messageRenderLimit),
    [liveMessages, messageRenderLimit],
  );
  const hiddenMessageCount =
    liveMessages.length - visibleLiveMessages.length;
  const turnNavigationItems = useMemo(
    () => buildTurnNavigation(liveMessages),
    [liveMessages],
  );
  const turnNumberById = useMemo(
    () =>
      new Map(
        turnNavigationItems.length >= TURN_NAVIGATOR_MIN_TURNS
          ? turnNavigationItems.map(
              (turn) => [turn.id, turn.number] as const,
            )
          : [],
      ),
    [turnNavigationItems],
  );
  const currentTurn: TurnNavigationItem | null =
    turnNavigationItems.at(-1) ?? null;
  const showTurnNavigation =
    turnNavigationItems.length >= TURN_NAVIGATOR_MIN_TURNS;

  const locateTurn = useCallback(
    (messageId: string, behavior: ScrollBehavior = "smooth") => {
      const sourceIndex = liveMessages.findIndex(
        (message) => message.id === messageId,
      );
      if (sourceIndex < 0) {
        return;
      }
      const required = liveMessages.length - sourceIndex + 12;
      if (required > messageRenderLimit) {
        pendingTurnLocateRef.current = { messageId, behavior };
        setMessageRenderLimit(required);
        return;
      }
      scrollMessageIntoView(messageId, behavior);
    },
    [liveMessages, messageRenderLimit, scrollMessageIntoView],
  );

  const showEarlierMessages = () => {
    const container = messagesRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    const previousTop = container?.scrollTop ?? 0;
    setMessageRenderLimit((value) => value + 120);
    window.requestAnimationFrame(() => {
      if (container) {
        container.scrollTop =
          previousTop + (container.scrollHeight - previousHeight);
      }
    });
  };

  useEffect(() => {
    const pending = pendingTurnLocateRef.current;
    if (!pending) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (scrollMessageIntoView(pending.messageId, pending.behavior)) {
        pendingTurnLocateRef.current = null;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messageRenderLimit, scrollMessageIntoView, visibleLiveMessages]);

  useEffect(() => {
    pendingTurnLocateRef.current = null;
  }, [activeSessionPath]);

  useEffect(() => {
    if (!findOpen || findMatches.length === 0) {
      return;
    }
    const id = findMatches[Math.min(findIndex, findMatches.length - 1)];
    const sourceIndex = liveMessages.findIndex(
      (message) => message.id === id,
    );
    if (sourceIndex >= 0) {
      const required = liveMessages.length - sourceIndex;
      if (required > messageRenderLimit) {
        setMessageRenderLimit(required + 20);
        return;
      }
    }
    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-msg-id]"),
    ).find((element) => element.dataset.msgId === id);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [
    findOpen,
    findIndex,
    findMatches,
    liveMessages,
    messageRenderLimit,
  ]);

  useEffect(
    () => () => {
      if (scrollStateFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollStateFrameRef.current);
      }
      if (scrollMemorySaveTimerRef.current !== null) {
        window.clearTimeout(scrollMemorySaveTimerRef.current);
      }
      if (scrollAnchorTimerRef.current !== null) {
        window.clearTimeout(scrollAnchorTimerRef.current);
      }
      if (scrollLatestTimerRef.current !== null) {
        window.clearTimeout(scrollLatestTimerRef.current);
      }
    },
    [],
  );

  return {
    messageRenderLimit,
    setMessageRenderLimit,
    showScrollLatest,
    setShowScrollLatest,
    showScrollTop,
    setShowScrollTop,
    unseenMessages,
    setUnseenMessages,
    findOpen,
    setFindOpen,
    findQuery,
    setFindQuery,
    findIndex,
    setFindIndex,
    findMatches,
    findMatchSet,
    visibleLiveMessages,
    hiddenMessageCount,
    turnNavigationItems,
    turnNumberById,
    currentTurn,
    showTurnNavigation,
    scrollMemoryRef,
    stickToBottomRef,
    scrollMessagesToBottom,
    scrollMessagesToTop,
    scrollMessageIntoView,
    rememberCurrentScroll,
    handleMessagesScroll,
    locateTurn,
    showEarlierMessages,
  };
}
