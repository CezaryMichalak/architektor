import { useId, useLayoutEffect, useRef, useState } from "react";

type Placement = "top" | "bottom";

interface InfoTooltipProps {
  content: string;
  ariaLabel?: string;
}

export function InfoTooltip({
  content,
  ariaLabel = "Wyjaśnienie znaczenia pytania",
}: InfoTooltipProps) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState<Placement>("top");
  const [offsetX, setOffsetX] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible) return;

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const margin = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipHeight = tooltipRect.height + margin;

    const spaceAbove = triggerRect.top;
    const spaceBelow = window.innerHeight - triggerRect.bottom;

    if (spaceAbove >= tooltipHeight) {
      setPlacement("top");
    } else if (spaceBelow >= tooltipHeight) {
      setPlacement("bottom");
    } else {
      setPlacement(spaceAbove >= spaceBelow ? "top" : "bottom");
    }

    const projectedLeft = triggerRect.right - tooltipRect.width;
    const projectedRight = triggerRect.right;
    let nextOffsetX = 0;

    if (projectedLeft < margin) {
      nextOffsetX = margin - projectedLeft;
    } else if (projectedRight > window.innerWidth - margin) {
      nextOffsetX = window.innerWidth - margin - projectedRight;
    }

    setOffsetX(nextOffsetX);
  }, [visible, content]);

  return (
    <div className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-describedby={visible ? tooltipId : undefined}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-semibold leading-none text-slate-muted transition-colors hover:border-slate-muted hover:text-graphite focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus-visible:ring-offset-1"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        <span aria-hidden="true" className="font-serif italic">
          i
        </span>
      </button>
      {/* tooltip panel */}
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={{ transform: offsetX ? `translateX(${offsetX}px)` : undefined }}
        className={`pointer-events-none absolute right-0 z-20 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-md bg-graphite px-2.5 py-2 text-xs leading-relaxed text-white shadow-lg transition-opacity ${
          placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {content}
      </div>
    </div>
  );
}
