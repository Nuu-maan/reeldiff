import { type RefObject, useLayoutEffect, useState } from "react";

export function useScale(ref: RefObject<HTMLElement | null>, width: number) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setScale(element.clientWidth / width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, width]);
  return scale;
}
