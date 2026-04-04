
import { useEffect, useRef } from "react";

// inspiration from https://www.youtube.com/watch?v=gcHKQAbHX20

type ScrollObserverProps = {
  loading: boolean;
  onLoadMore: () => void;
};

export function ScrollObserver({ loading, onLoadMore }: ScrollObserverProps) {
  const loader = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !loader.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 } // 10% of the element must be visible
    );

    observer.observe(loader.current);

    // Cleanup function removes observer when loading changes or component unmounts
    return () => observer.disconnect();
    
  }, [loading, onLoadMore]); // Re-run effect when loading state changes

  return <div ref={loader} style={{ height: "20px", marginBottom: "20px" }} />;
}