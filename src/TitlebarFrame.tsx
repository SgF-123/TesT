import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type TitlebarFrameProps = {
  isShell: boolean;
  bridge: typeof window.tesT;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

export function TitlebarFrame({
  isShell,
  bridge,
  left,
  center,
  right,
}: TitlebarFrameProps) {
  const dragFrameRef = useRef<number | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  const finishDrag = useCallback(() => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    dragPointRef.current = null;
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    if (isShell) {
      bridge?.endDrag();
    }
  }, [bridge, isShell]);

  useEffect(
    () => () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      dragPointRef.current = null;
      if (draggingRef.current && isShell) {
        bridge?.endDrag();
      }
    },
    [bridge, isShell],
  );

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isShell || !bridge) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("button, input, a, .project-chip, .omnibox")) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    bridge.beginDrag(event.screenX, event.screenY);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isShell || !draggingRef.current || event.buttons !== 1) {
      return;
    }
    dragPointRef.current = {
      x: event.screenX,
      y: event.screenY,
    };
    if (dragFrameRef.current !== null) {
      return;
    }
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const point = dragPointRef.current;
      if (point) {
        bridge?.dragTo(point.x, point.y);
      }
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag();
  };

  return (
    <header
      className="titlebar"
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={finishDrag}
    >
      {left}
      {center}
      {right}
    </header>
  );
}
