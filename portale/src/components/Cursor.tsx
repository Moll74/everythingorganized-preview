import { useEffect, useRef, useState } from "react";
import styles from "./Cursor.module.css";

const FOLLOW = 0.3; // share of the remaining distance covered per 60 fps frame
const FRAME = 1000 / 60;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export function Cursor() {
  const [enabled, setEnabled] = useState(() => window.matchMedia(FINE_POINTER).matches);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER);
    const onChange = () => setEnabled(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current!;
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let seen = false;
    let lastTime = performance.now();
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!seen) {
        seen = true;
        pos.x = target.x;
        pos.y = target.y;
      }
      el.dataset.visible = "";
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) delete el.dataset.visible;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const k = 1 - (1 - FOLLOW) ** ((now - lastTime) / FRAME);
      lastTime = now;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
    };
    frame = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove);
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
    };
  }, [enabled]);

  return enabled ? <div ref={ref} className={styles.cursor} aria-hidden="true" /> : null;
}
