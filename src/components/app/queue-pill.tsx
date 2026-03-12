import type { QueueItem } from '@/lib/use-gateway-chat';
import { gsap } from 'gsap';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  queue: QueueItem[];
  onRemove: (id: string) => void;
};

const STACK_OFFSET = 10;
const STACK_SCALE = 0.04;
const MAX_STACK_VISIBLE = 3;
const ITEM_HEIGHT = 36;
const EXPANDED_GAP = 8;
const DURATION = 0.38;

function cardTargets(idx: number, total: number, expanded: boolean) {
  const stackDepth = Math.min(idx, MAX_STACK_VISIBLE - 1);
  const y = expanded
    ? -(idx * (ITEM_HEIGHT + EXPANDED_GAP))
    : -(stackDepth * STACK_OFFSET);
  const scale = expanded ? 1 : 1 - stackDepth * STACK_SCALE;
  const opacity = expanded
    ? 1
    : idx >= MAX_STACK_VISIBLE
      ? 0
      : idx === 0
        ? 1
        : 0.65 - stackDepth * 0.1;
  const zIndex = total - idx;
  return { y, scale, opacity, zIndex };
}

export function QueuePill({ queue, onRemove }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const hoveredRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const visibleCount = Math.min(queue.length, MAX_STACK_VISIBLE);
  const collapsedHeight = ITEM_HEIGHT + (visibleCount - 1) * STACK_OFFSET;
  const expandedHeight =
    queue.length * ITEM_HEIGHT + (queue.length - 1) * EXPANDED_GAP;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (queue.length > 0 && prevLengthRef.current === 0) {
      gsap.fromTo(
        el,
        { y: 10, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.28, ease: 'power3.out' }
      );
    } else if (queue.length === 0 && prevLengthRef.current > 0) {
      gsap.to(el, {
        y: 8,
        opacity: 0,
        scale: 0.97,
        duration: 0.2,
        ease: 'power2.in',
      });
    }
    prevLengthRef.current = queue.length;
  }, [queue.length]);

  const animateAll = (expanded: boolean) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const targetHeight = expanded ? expandedHeight : collapsedHeight;
    gsap.to(wrapper, {
      height: targetHeight,
      duration: DURATION,
      ease: expanded ? 'power3.out' : 'power3.inOut',
    });

    queue.forEach((item, idx) => {
      const el = itemRefs.current.get(item.id);
      if (!el) return;
      const { y, scale, opacity, zIndex } = cardTargets(
        idx,
        queue.length,
        expanded
      );
      gsap.set(el, { zIndex });
      gsap.to(el, {
        y,
        scale,
        opacity,
        duration: DURATION,
        delay: expanded ? idx * 0.025 : (queue.length - 1 - idx) * 0.02,
        ease: expanded ? 'power3.out' : 'power3.inOut',
        overwrite: 'auto',
      });
    });
  };

  const handleMouseEnter = () => {
    hoveredRef.current = true;
    setHovered(true);
    animateAll(true);
  };

  const handleMouseLeave = () => {
    hoveredRef.current = false;
    setHovered(false);
    animateAll(false);
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const expanded = hoveredRef.current;
    const targetHeight = expanded ? expandedHeight : collapsedHeight;
    gsap.set(wrapper, { height: targetHeight });
    queue.forEach((item, idx) => {
      const el = itemRefs.current.get(item.id);
      if (!el) return;
      const { y, scale, opacity, zIndex } = cardTargets(
        idx,
        queue.length,
        expanded
      );
      gsap.set(el, { y, scale, opacity, zIndex });
    });
  }, [queue]);

  if (queue.length === 0 && prevLengthRef.current === 0) return null;

  return (
    <div className="shrink-0 px-6 pb-1">
      <div
        ref={wrapperRef}
        style={{ opacity: 0, height: collapsedHeight }}
        className="relative w-full overflow-visible"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {[...queue].reverse().map((item, reversedIdx) => {
          const idx = queue.length - 1 - reversedIdx;
          return (
            <QueueCard
              key={item.id}
              item={item}
              idx={idx}
              total={queue.length}
              hovered={hovered}
              itemRefs={itemRefs}
              onRemove={onRemove}
            />
          );
        })}
      </div>
    </div>
  );
}

function QueueCard({
  item,
  idx,
  total,
  hovered,
  itemRefs,
  onRemove,
}: {
  item: QueueItem;
  idx: number;
  total: number;
  hovered: boolean;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onRemove: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const setRef = (el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(item.id, el);
      cardRef.current = el;
    } else {
      itemRefs.current.delete(item.id);
    }
  };

  useEffect(() => {
    const el = cardRef.current;
    if (!el || mountedRef.current) return;
    mountedRef.current = true;
    const { y, scale, opacity, zIndex } = cardTargets(idx, total, false);
    gsap.set(el, { zIndex });
    gsap.fromTo(
      el,
      { y: y + 10, opacity: 0, scale: scale - 0.02 },
      { y, opacity, scale, duration: 0.28, ease: 'power3.out' }
    );
  }, []);

  const handleRemove = () => {
    const el = cardRef.current;
    if (!el) {
      onRemove(item.id);
      return;
    }
    gsap.to(el, {
      x: 12,
      opacity: 0,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => onRemove(item.id),
    });
  };

  const isTop = idx === 0;

  return (
    <div
      ref={setRef}
      style={{
        position: 'absolute',
        width: '100%',
        bottom: 0,
        transformOrigin: 'top center',
      }}
      className="group"
    >
      <div
        className="flex items-center gap-2 rounded-md bg-floated-blur backdrop-blur-sm px-3 shadow-fancy"
        style={{ height: ITEM_HEIGHT }}
      >
        <span
          className={`flex-1 truncate text-sm transition-colors duration-200 ${isTop || hovered ? 'text-foreground/80' : 'text-muted-foreground/60'}`}
        >
          {isTop || hovered ? item.text : ''}
        </span>
        {(isTop || hovered) && (
          <button
            type="button"
            aria-label="Remove queued message"
            onClick={handleRemove}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-foreground transition-all"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
