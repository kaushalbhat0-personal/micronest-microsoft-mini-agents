import { useRef, useEffect } from "react";
import { mark, getAverageDuration } from "./performance";

export function usePerfMark(name: string, dependencies: unknown[] = []): void {
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) mark(name);
    mounted.current = true;
  }, dependencies);
}

export function useRenderTiming(componentName: string): void {
  const startRef = useRef(performance.now());
  useEffect(() => {
    const duration = performance.now() - startRef.current;
    mark(`render:${componentName}`);
    startRef.current = performance.now();
  });
}

export function getRenderDuration(componentName: string): number {
  return getAverageDuration(`render:${componentName}`);
}
