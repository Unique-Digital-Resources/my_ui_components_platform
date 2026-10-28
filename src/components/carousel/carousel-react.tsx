"use client";
import * as React from "react";
import { Carousel, type CarouselSlide, type CarouselEventPayload } from "@/lib/components/carousel";
export type { CarouselSlide, CarouselEventPayload };
export function CarouselReact({ slides, current, loop, autoplay, autoplayInterval, showArrows, showDots, transition, onChange, className, instanceRef }: {
  slides?: CarouselSlide[]; current?: number; loop?: boolean; autoplay?: boolean;
  autoplayInterval?: number; showArrows?: boolean; showDots?: boolean; transition?: "slide" | "fade";
  onChange?: (p: CarouselEventPayload) => void;
  className?: string; instanceRef?: React.MutableRefObject<Carousel | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<Carousel | null>(null);
  const cbRef = React.useRef({ onChange });
  React.useEffect(() => { cbRef.current = { onChange }; });
  const initSlides = React.useRef(slides);
  React.useEffect(() => {
    if (!ref.current) return;
    const c = new Carousel(ref.current, { slides: initSlides.current ?? [], current, loop, autoplay, autoplayInterval, showArrows, showDots, transition });
    inst.current = c; if (instanceRef) instanceRef.current = c;
    c.on("change", (p) => cbRef.current.onChange?.(p));
    return () => { c.destroy(); inst.current = null; if (instanceRef) instanceRef.current = null; };
  }, []);
  React.useEffect(() => { if (loop !== undefined) inst.current?.setProperty("loop", loop); }, [loop]);
  React.useEffect(() => { if (autoplay !== undefined) inst.current?.setProperty("autoplay", autoplay); }, [autoplay]);
  React.useEffect(() => { if (autoplayInterval !== undefined) inst.current?.setProperty("autoplayInterval", autoplayInterval); }, [autoplayInterval]);
  React.useEffect(() => { if (showArrows !== undefined) inst.current?.setProperty("showArrows", showArrows); }, [showArrows]);
  React.useEffect(() => { if (showDots !== undefined) inst.current?.setProperty("showDots", showDots); }, [showDots]);
  React.useEffect(() => { if (transition !== undefined) inst.current?.setProperty("transition", transition); }, [transition]);
  React.useEffect(() => { if (slides !== undefined) inst.current?.setSlides(slides); }, [slides]);
  return <div ref={ref} className={className} />;
}
