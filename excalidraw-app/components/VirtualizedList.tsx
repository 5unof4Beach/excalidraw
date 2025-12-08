import React, { useRef, useEffect, useState, useCallback } from "react";
import "./VirtualizedList.scss";

interface VirtualizedListProps<T extends { id: string }> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  selectedId: string | null;
}

const VirtualizedList = React.forwardRef<
  HTMLDivElement,
  VirtualizedListProps<any>
>(({ items, itemHeight, renderItem, selectedId }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 });

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;

    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight);

    // Add buffer for smooth scrolling
    const bufferedStart = Math.max(0, start - 5);
    const bufferedEnd = Math.min(items.length, end + 5);

    setVisibleRange({ start: bufferedStart, end: bufferedEnd });
  }, [itemHeight, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const offsetY = visibleRange.start * itemHeight;
  const totalHeight = items.length * itemHeight;

  return (
    <div ref={containerRef || ref} className="virtualized-list">
      <div className="virtualized-list__spacer" style={{ height: totalHeight }}>
        <div
          className="virtualized-list__content"
          style={{
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="virtualized-list__item"
              style={{ height: itemHeight }}
            >
              {renderItem(item, selectedId === item.id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedList.displayName = "VirtualizedList";

export default VirtualizedList;
