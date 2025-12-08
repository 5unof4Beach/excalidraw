import React, { useRef, useEffect, useState, useCallback } from "react";
import "./VirtualizedGrid.scss";

interface VirtualizedGridProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  selectedId: string | null;
}

const VirtualizedGrid = React.forwardRef<
  HTMLDivElement,
  VirtualizedGridProps<any>
>(({ items, renderItem, selectedId }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [columnsCount, setColumnsCount] = useState(3);

  // Calculate columns based on container width
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      let cols = 3; // default

      if (width < 400) {
        cols = 1;
      } else if (width < 600) {
        cols = 2;
      } else if (width < 900) {
        cols = 3;
      } else if (width < 1200) {
        cols = 4;
      } else {
        cols = 5;
      }

      setColumnsCount(cols);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      handleResize();
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const itemHeight = 200; // Card height + gap
  const rowsPerViewport = Math.ceil(
    (containerRef.current?.clientHeight || 400) / itemHeight,
  );
  const rowCount = Math.ceil(items.length / columnsCount);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;

    const startRow = Math.floor(scrollTop / itemHeight);
    const endRow = Math.ceil((scrollTop + containerHeight) / itemHeight);

    // Add buffer for smooth scrolling
    const bufferedStartRow = Math.max(0, startRow - 2);
    const bufferedEndRow = Math.min(rowCount, endRow + 2);

    const start = bufferedStartRow * columnsCount;
    const end = bufferedEndRow * columnsCount;

    setVisibleRange({ start, end });
  }, [itemHeight, rowCount, columnsCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const totalHeight = rowCount * itemHeight;
  const startRowOffset = Math.floor(visibleRange.start / columnsCount) * itemHeight;

  return (
    <div ref={containerRef || ref} className="virtualized-grid">
      <div
        className="virtualized-grid__spacer"
        style={{ height: totalHeight }}
      >
        <div
          className="virtualized-grid__content"
          style={{
            transform: `translateY(${startRowOffset}px)`,
            display: "grid",
            gridTemplateColumns: `repeat(${columnsCount}, 1fr)`,
            gap: "1rem",
            padding: "1rem",
          }}
        >
          {visibleItems.map((item) => (
            <div key={item.id} className="virtualized-grid__item">
              {renderItem(item, selectedId === item.id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedGrid.displayName = "VirtualizedGrid";

export default VirtualizedGrid;
