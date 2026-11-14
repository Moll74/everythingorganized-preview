import { useEffect, useRef, type RefObject } from "react";
import { inOut, lerpQuad, quadToMatrix3d, rectQuad, scaleQuad, segment as seg, type Quad } from "../lib/quad";
import type { LoadedImage } from "../lib/loadImages";
import styles from "./Portal.module.css";

export type PortalState = { scale: number; face: number; flash: number; p: number };

// The glass card in the desert photo, in image pixels: top left, top right, bottom right, bottom left.
const IMAGE_W = 4096;
const IMAGE_H = 2640;
const CARD_CORNERS: [number, number][] = [[1738, 944], [2359, 994], [2359, 1984], [1738, 2052]];
const CARD_W = 652;
const CARD_H = 1024;

const DOLLY = 0.18; // camera move into the photo
const DOLLY_END = 0.7;
const TURN_END = 0.45;
const TURN_HEIGHT = 1.06;
const GROW_START = 0.5;
const GROW_END = 0.82;
const COVER = 1.2; // how far the portal overhangs the screen
const LIGHT_OFF: [number, number] = [0.15, 0.4];
const RIM_ON: [number, number] = [0.1, 0.4];
const FILL_ON: [number, number] = [0.35, 0.62];

type Props = {
  state: RefObject<PortalState>;
  desert: LoadedImage | null;
  reduced: boolean;
};

export function Portal({ state, desert, reduced }: Props) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = mediaRef.current!;
    const over = overRef.current!;
    const photo = photoRef.current!;
    const light = lightRef.current!;
    const portal = portalRef.current!;
    const fill = fillRef.current!;
    const rim = rimRef.current!;

    let layoutDirty = true;
    const observer = new ResizeObserver(() => {
      layoutDirty = true;
    });
    observer.observe(media);
    observer.observe(photo);

    let last = "";
    let frame = 0;

    const render = () => {
      frame = requestAnimationFrame(render);
      const s = state.current;
      const p = reduced ? 0 : s.p;
      const key = `${s.scale}|${s.face}|${s.flash}|${p}`;
      if (key === last && !layoutDirty) return;
      last = key;
      layoutDirty = false;

      const W = media.offsetWidth;
      const H = media.offsetHeight;
      const bx = photo.offsetLeft;
      const by = photo.offsetTop;
      const bw = photo.offsetWidth;
      const bh = photo.offsetHeight;

      // 1. Grow out of the centre of the screen
      const layerScale = `scale(${s.scale})`;
      media.style.transform = layerScale;
      over.style.transform = layerScale;

      // 2. The card in the photo
      const base = CARD_CORNERS.map(([x, y]) => ({ x: bx + (x / IMAGE_W) * bw, y: by + (y / IMAGE_H) * bh })) as Quad;
      const c = { x: base.reduce((a, q) => a + q.x, 0) / 4, y: base.reduce((a, q) => a + q.y, 0) / 4 };

      // 3. Camera move
      const d = 1 + DOLLY * inOut(seg(p, 0, DOLLY_END));
      photo.style.transformOrigin = `${c.x - bx}px ${c.y - by}px`;
      photo.style.transform = `scale(${d})`;
      const inPhoto = scaleQuad(base, c, d);

      // 4. Turn to face the camera
      const h = ((inPhoto[3].y - inPhoto[0].y + inPhoto[2].y - inPhoto[1].y) / 2) * TURN_HEIGHT;
      const turned = lerpQuad(inPhoto, rectQuad(c.x, c.y, (h * CARD_W) / CARD_H, h), inOut(seg(p, 0, TURN_END)));

      // 5. Grow past the edges of the screen
      const coverH = Math.max(H, (W * CARD_H) / CARD_W) * COVER;
      const cover = rectQuad(W / 2, H / 2, (coverH * CARD_W) / CARD_H, coverH);
      const quad = lerpQuad(turned, cover, seg(p, GROW_START, GROW_END) ** 3);

      // 6. Both planes get the same mapping
      const matrix = quadToMatrix3d(CARD_W, CARD_H, quad);
      light.style.transform = matrix;
      portal.style.transform = matrix;

      // 7. Light off, rim on, fill on
      light.style.opacity = String(s.face * (1 - seg(p, ...LIGHT_OFF)));
      rim.style.opacity = String(reduced ? 0 : Math.max(s.flash, seg(p, ...RIM_ON)));
      fill.style.opacity = String(reduced ? 0 : seg(p, ...FILL_ON));
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [state, reduced]);

  return (
    <>
      <div ref={mediaRef} className={styles.media} data-layer="media">
        <div ref={photoRef} className={styles.photo}>
          {desert ? <img src={desert.src} alt="" className={styles.photoImg} /> : null}
        </div>
        <div ref={lightRef} className={styles.plane} data-plane="light">
          <div className={styles.light}>
            <img
              src="https://assets.uberdesigner.ai/portale/card-logo.svg"
              alt=""
              className={styles.cardLogo}
            />
            <img
              src="https://assets.uberdesigner.ai/portale/card-chip.svg"
              alt=""
              className={styles.chip}
            />
            <span className={`${styles.cardText} ${styles.name} trim`}>SEAN GALT</span>
            <span className={`${styles.cardText} ${styles.number} trim`}>9276 9400 2812 0000</span>
          </div>
        </div>
      </div>

      <div ref={overRef} className={styles.over} aria-hidden="true">
        <div ref={portalRef} className={styles.plane}>
          <div ref={fillRef} className={styles.fill} />
          <div ref={rimRef} className={styles.rim} />
        </div>
      </div>
    </>
  );
}
