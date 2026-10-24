import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { Bookmark } from "lucide-react";
import {
  findBookmarkedTurn,
  TURN_NAVIGATOR_MIN_TURNS,
  type TurnNavigationItem,
} from "./turn-navigation";

type TurnNavigatorProps = {
  turns: TurnNavigationItem[];
  bookmarkedIds: ReadonlySet<string>;
  scrollRef: RefObject<HTMLDivElement | null>;
  onLocate: (messageId: string, behavior?: ScrollBehavior) => void;
  onToggleBookmark?: (messageId: string) => void;
};

type ScrubState = {
  pointerId: number;
  startIndex: number;
  lastIndex: number;
  moved: boolean;
};

export default function TurnNavigator({
  turns,
  bookmarkedIds,
  scrollRef,
  onLocate,
  onToggleBookmark,
}: TurnNavigatorProps) {
  const [activeId, setActiveId] = useState<string | null>(
    turns.at(-1)?.id ?? null,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [numericQuery, setNumericQuery] = useState("");
  const [numericInvalid, setNumericInvalid] = useState(false);
  const railRef = useRef<HTMLElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const locateFrameRef = useRef<number | null>(null);
  const tipTimerRef = useRef<number | null>(null);
  const invalidTimerRef = useRef<number | null>(null);
  const pendingLocateIdRef = useRef<string | null>(null);
  const scrubRef = useRef<ScrubState | null>(null);
  const activeLockRef = useRef<{ id: string; until: number } | null>(null);
  const suppressClickRef = useRef(false);
  const turnIds = useMemo(() => new Set(turns.map((turn) => turn.id)), [turns]);

  const clearTipTimer = useCallback(() => {
    if (tipTimerRef.current !== null) {
      window.clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
  }, []);

  const showTransientTip = useCallback(
    (id: string, duration = 1100) => {
      clearTipTimer();
      setHoveredId(id);
      tipTimerRef.current = window.setTimeout(() => {
        tipTimerRef.current = null;
        setHoveredId(null);
      }, duration);
    },
    [clearTipTimer],
  );

  const updateActiveTurn = useCallback(() => {
    const root = scrollRef.current;
    if (!root || turns.length === 0) {
      return;
    }

    const lock = activeLockRef.current;
    if (lock && performance.now() < lock.until) {
      setActiveId((current) => (current === lock.id ? current : lock.id));
      return;
    }
    if (lock) {
      activeLockRef.current = null;
    }

    const viewport = root.getBoundingClientRect();
    const threshold =
      viewport.top + Math.min(420, viewport.height * 0.62);
    let nextActiveId: string | null = null;

    for (const element of root.querySelectorAll<HTMLElement>("[data-msg-id]")) {
      const id = element.dataset.msgId;
      if (!id || !turnIds.has(id)) {
        continue;
      }

      if (element.getBoundingClientRect().top <= threshold) {
        nextActiveId = id;
      } else {
        break;
      }
    }

    if (!nextActiveId) {
      nextActiveId = turns[0]?.id ?? null;
    }

    setActiveId((current) =>
      current === nextActiveId ? current : nextActiveId,
    );
  }, [scrollRef, turnIds, turns]);

  useLayoutEffect(() => {
    if (turns.length === 0) {
      setActiveId(null);
      return;
    }
    if (!turns.some((turn) => turn.id === activeId)) {
      activeLockRef.current = null;
      setActiveId(turns.at(-1)?.id ?? null);
    }
  }, [activeId, turns]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || turns.length === 0) {
      return;
    }

    const queueUpdate = () => {
      if (scrollFrameRef.current !== null) {
        return;
      }
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        updateActiveTurn();
      });
    };

    queueUpdate();
    root.addEventListener("scroll", queueUpdate, { passive: true });
    return () => {
      root.removeEventListener("scroll", queueUpdate);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [scrollRef, turns.length, updateActiveTurn]);

  const locateTurn = useCallback(
    (turn: TurnNavigationItem, behavior: ScrollBehavior = "smooth") => {
      activeLockRef.current = {
        id: turn.id,
        until: performance.now() + (behavior === "smooth" ? 650 : 160),
      };
      setActiveId(turn.id);
      showTransientTip(turn.id, behavior === "smooth" ? 1200 : 800);
      onLocate(turn.id, behavior);
    },
    [onLocate, showTransientTip],
  );

  const queueScrubLocate = useCallback(
    (turn: TurnNavigationItem) => {
      activeLockRef.current = { id: turn.id, until: performance.now() + 160 };
      setActiveId(turn.id);
      setHoveredId(turn.id);
      pendingLocateIdRef.current = turn.id;

      if (locateFrameRef.current !== null) {
        return;
      }

      locateFrameRef.current = window.requestAnimationFrame(() => {
        locateFrameRef.current = null;
        const messageId = pendingLocateIdRef.current;
        pendingLocateIdRef.current = null;
        if (messageId) {
          onLocate(messageId, "auto");
        }
      });
    },
    [onLocate],
  );

  useEffect(
    () => () => {
      if (locateFrameRef.current !== null) {
        window.cancelAnimationFrame(locateFrameRef.current);
      }
      if (tipTimerRef.current !== null) {
        window.clearTimeout(tipTimerRef.current);
      }
      if (invalidTimerRef.current !== null) {
        window.clearTimeout(invalidTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (turns.length < TURN_NAVIGATOR_MIN_TURNS) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.key !== "ArrowUp" && event.key !== "ArrowDown")
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true']",
        )
      ) {
        return;
      }

      if (event.shiftKey) {
        const currentIndex = Math.max(
          0,
          turns.findIndex((turn) => turn.id === activeId),
        );
        const turn = findBookmarkedTurn(
          turns,
          bookmarkedIds,
          activeId ?? turns[currentIndex]?.id,
          event.key === "ArrowUp" ? "previous" : "next",
        );
        if (!turn) {
          return;
        }

        event.preventDefault();
        locateTurn(turn, "smooth");
        return;
      }

      const currentIndex = Math.max(
        0,
        turns.findIndex((turn) => turn.id === activeId),
      );
      const nextIndex =
        event.key === "ArrowUp"
          ? Math.max(0, currentIndex - 1)
          : Math.min(turns.length - 1, currentIndex + 1);
      const turn = turns[nextIndex];
      if (!turn || turn.id === activeId) {
        return;
      }

      event.preventDefault();
      locateTurn(turn, "smooth");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, bookmarkedIds, locateTurn, turns]);

  const findTurnIndexAt = (clientY: number) => {
    const items = railRef.current?.querySelectorAll<HTMLElement>(
      ".turn-rail-item",
    );
    if (!items?.length) {
      return -1;
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  };

  const beginScrub = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      !event.isPrimary ||
      (typeof event.button === "number" && event.button !== 0)
    ) {
      return;
    }

    const index = findTurnIndexAt(event.clientY);
    const turn = turns[index];
    if (!turn) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    railRef.current?.focus({ preventScroll: true });
    clearTipTimer();
    scrubRef.current = {
      pointerId: event.pointerId,
      startIndex: index,
      lastIndex: index,
      moved: false,
    };
    setScrubbing(true);
    setHoveredId(turn.id);
  };

  const moveScrub = (event: ReactPointerEvent<HTMLElement>) => {
    const state = scrubRef.current;

    if (!state) {
      const hoverIndex = findTurnIndexAt(event.clientY);
      const hoveredTurn = turns[hoverIndex];
      if (hoveredTurn) {
        clearTipTimer();
        setHoveredId(hoveredTurn.id);
      }
      return;
    }

    if (state.pointerId !== event.pointerId) {
      return;
    }

    const index = findTurnIndexAt(event.clientY);
    const turn = turns[index];
    if (!turn || index === state.lastIndex) {
      return;
    }

    state.lastIndex = index;
    state.moved = state.moved || index !== state.startIndex;
    queueScrubLocate(turn);
  };

  const endScrub = (event: ReactPointerEvent<HTMLElement>) => {
    const state = scrubRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    scrubRef.current = null;
    setScrubbing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const turn = turns[state.lastIndex];
    if (!state.moved && turn) {
      locateTurn(turn, "smooth");
    }

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const cancelScrub = (event: ReactPointerEvent<HTMLElement>) => {
    const state = scrubRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    scrubRef.current = null;
    setScrubbing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const rejectNumericJump = () => {
    setNumericInvalid(true);
    if (invalidTimerRef.current !== null) {
      window.clearTimeout(invalidTimerRef.current);
    }
    invalidTimerRef.current = window.setTimeout(() => {
      invalidTimerRef.current = null;
      setNumericInvalid(false);
    }, 900);
  };

  const commitNumericJump = () => {
    const requested = Number(numericQuery);
    if (
      !Number.isInteger(requested) ||
      requested < 1 ||
      requested > turns.length
    ) {
      rejectNumericJump();
      return;
    }

    const turn = turns[requested - 1];
    setNumericQuery("");
    setNumericInvalid(false);
    if (turn) {
      locateTurn(turn, "smooth");
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (turns.length === 0) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      clearTipTimer();
      setHoveredId(null);
      setNumericInvalid(false);
      setNumericQuery((current) =>
        `${current}${event.key}`.slice(
          0,
          Math.max(3, String(turns.length).length),
        ),
      );
      return;
    }

    if (event.key === "Backspace" && numericQuery) {
      event.preventDefault();
      setNumericInvalid(false);
      setNumericQuery((current) => current.slice(0, -1));
      return;
    }

    if (event.key === "Enter" && numericQuery) {
      event.preventDefault();
      commitNumericJump();
      return;
    }

    if (event.key === "Escape" && numericQuery) {
      event.preventDefault();
      setNumericQuery("");
      setNumericInvalid(false);
      return;
    }

    const currentIndex = Math.max(
      0,
      turns.findIndex((turn) => turn.id === activeId),
    );
    let nextIndex = currentIndex;

    if (event.key === "ArrowUp") {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (event.key === "ArrowDown") {
      nextIndex = Math.min(turns.length - 1, currentIndex + 1);
    } else if (event.key === "PageUp") {
      nextIndex = Math.max(0, currentIndex - 5);
    } else if (event.key === "PageDown") {
      nextIndex = Math.min(turns.length - 1, currentIndex + 5);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = turns.length - 1;
    } else {
      return;
    }

    setNumericQuery("");
    setNumericInvalid(false);
    event.preventDefault();
    const turn = turns[nextIndex];
    if (turn && turn.id !== activeId) {
      locateTurn(turn, "smooth");
    }
  };

  if (turns.length < TURN_NAVIGATOR_MIN_TURNS) {
    return null;
  }

  const activeNumber =
    turns.find((turn) => turn.id === activeId)?.number ?? turns.length;

  return (
    <nav
      ref={railRef}
      className="turn-rail"
      aria-label={`会话轮次定位，共 ${turns.length} 轮，当前第 ${activeNumber} 轮`}
      aria-roledescription="轮次轨道"
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+Shift+ArrowUp Alt+Shift+ArrowDown"
      tabIndex={0}
      data-scrubbing={scrubbing ? "true" : undefined}
      data-density={turns.length > 80 ? "dense" : undefined}
      style={{ height: Math.min(420, Math.max(70, turns.length * 14)) }}
      onPointerDown={beginScrub}
      onPointerMove={moveScrub}
      onPointerUp={endScrub}
      onPointerCancel={cancelScrub}
      onLostPointerCapture={cancelScrub}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => {
        const index = findTurnIndexAt(event.clientY);
        const turn = turns[index];
        if (!turn || !onToggleBookmark) {
          return;
        }
        event.preventDefault();
        onToggleBookmark(turn.id);
        showTransientTip(turn.id);
      }}
      onMouseLeave={() => {
        if (!scrubRef.current) {
          setHoveredId(null);
        }
      }}
    >
      {numericQuery && (
        <span
          className="turn-rail-jump-hud"
          data-invalid={numericInvalid ? "true" : undefined}
          aria-live="polite"
        >
          <b>{numericQuery}</b>
          <span>/ {turns.length}</span>
          <small>{numericInvalid ? "没有这一轮" : "Enter 定位"}</small>
        </span>
      )}
      {turns.map((turn) => {
        const active = turn.id === activeId;
        const hovered = turn.id === hoveredId;
        const bookmarked = bookmarkedIds.has(turn.id);

        return (
          <button
            key={turn.id}
            type="button"
            className="turn-rail-item"
            tabIndex={-1}
            data-active={active ? "true" : undefined}
            data-hovered={hovered ? "true" : undefined}
            data-bookmarked={bookmarked ? "true" : undefined}
            aria-current={active ? "location" : undefined}
            aria-label={`第 ${turn.number} 轮${bookmarked ? "，已加入书签" : ""}：${turn.preview}`}
            onClick={() => {
              if (suppressClickRef.current) {
                return;
              }
              locateTurn(turn, "smooth");
            }}
          >
            <span className="turn-rail-tick" />
            {hovered && !numericQuery && (
              <span className="turn-rail-tip" role="tooltip">
                <b>第 {turn.number} / {turns.length} 轮</b>
                <span className="turn-rail-tip-preview">{turn.preview}</span>
                {bookmarked && (
                  <span className="turn-rail-tip-bookmark">
                    <Bookmark size={9} aria-hidden="true" />
                    已加入书签
                  </span>
                )}
                {onToggleBookmark && (
                  <small className="turn-rail-tip-hint">
                    {bookmarked ? "右键取消书签" : "右键添加书签"} · Alt+Shift+↑↓
                  </small>
                )}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
