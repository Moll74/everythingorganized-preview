import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { loadImages, type LoadedImage } from "../lib/loadImages";
import { segment as seg } from "../lib/quad";
import { HeroCopy } from "./HeroCopy";
import { Nav, type NavTheme } from "./Nav";
import styles from "./Page.module.css";
import { Portal, type PortalState } from "./Portal";
import { Preloader } from "./Preloader";
import { Ready } from "./Ready";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const DESERT_URL = "https://assets.uberdesigner.ai/portale/desert.webp";
const CARD_URL = "https://assets.uberdesigner.ai/portale/bank-card.webp";
const FONTS = ['300 1em "Geist"', '400 1em "Geist"', '500 1em "Geist"'];

// Loading
const COUNTER_SHARE = 0.9; // the counter never passes 90 before everything is ready
const COUNTER_FOLLOW = 0.4;

// Intro (seconds from t = 0)
const COUNT_END = 0.5;
const COUNTER_OUT = 0.5;
const GROW_AT = 0.6;
const GROW_FOR = 0.85;
const WORDMARK_OUT = 0.7;
const LIGHT_ON = 1.05;
const BADGE_IN = 1.1;
const NAV_IN = 1.15;
const HEADLINE_IN = 1.25;
const BUTTONS_IN = 1.55;
const LEAD_IN = 1.85;
const UNLOCK = 2.3;
const WORD_STAGGER = 0.09;

// Scroll (fractions of p)
const SCROLL_SCREENS = 1.5;
const SCRUB = 0.6;
const RISE = 120; // design px the hero copy moves up
const RISE_RANGE: [number, number] = [0.2, 0.8];
const READY_FADE: [number, number] = [0.79, 0.81];
const NAV_DARK_AT = 0.76;
const REVEAL_AT = 0.8;
const UNREVEAL_BELOW = 0.74;
const REDUCED_FADE: [number, number] = [0.3, 0.6];

// Second screen
const TILT_Y = 8;
const TILT_X = 6;

type Assets = { desert: LoadedImage | null; card: LoadedImage | null };

const pad = (n: number) => String(Math.round(n)).padStart(2, "0");

const blurIn = (blur: number) => ({
  from: { opacity: 0, filter: `blur(${blur}px)` },
  to: { opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "power2.out", clearProps: "filter" },
});

const wordsIn = (words: Element[]) =>
  gsap.fromTo(
    words,
    { opacity: 0, filter: "blur(12px)", yPercent: 25 },
    {
      opacity: 1,
      filter: "blur(0px)",
      yPercent: 0,
      duration: 0.7,
      ease: "power2.out",
      stagger: WORD_STAGGER,
      clearProps: "filter,transform",
    },
  );

export function Page() {
  const mainRef = useRef<HTMLElement>(null);
  const portal = useRef<PortalState>({ scale: 0, face: 0, flash: 0, p: 0 });
  const [assets, setAssets] = useState<Assets | null>(null);
  const [theme, setTheme] = useState<NavTheme>("light");
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Links to "#" would rewind the pinned page
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href="#"]')) e.preventDefault();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Loading
  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.dataset.locked = "";

    let stale = false;
    const abort = new AbortController();
    const counterEl = mainRef.current!.querySelector<HTMLElement>('[data-preloader="counter"]')!;
    const counter = { v: 0 };
    let target = 0;
    const follow = gsap.quickTo(counter, "v", {
      duration: COUNTER_FOLLOW,
      ease: "power1.out",
      onUpdate: () => {
        counterEl.textContent = `${pad(counter.v)}%`;
      },
    });
    const onProgress = (fraction: number) => {
      const next = fraction * COUNTER_SHARE * 100;
      if (next <= target || stale) return;
      target = next;
      follow(target);
    };

    let urls: string[] = [];
    Promise.all([
      loadImages([DESERT_URL, CARD_URL], onProgress, abort.signal),
      Promise.all(FONTS.map((font) => document.fonts.load(font))).catch((err: unknown) => {
        console.error("Portale: font failed to load", err);
      }),
    ]).then(([[desert, card]]) => {
      urls = [desert?.src, card?.src].filter((u): u is string => !!u);
      if (stale) {
        urls.forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      gsap.killTweensOf(counter);
      setAssets({ desert, card });
    });

    return () => {
      stale = true;
      abort.abort();
      gsap.killTweensOf(counter);
      urls.forEach((u) => URL.revokeObjectURL(u));
      delete document.documentElement.dataset.locked;
    };
  }, []);

  // Intro, scroll transition, second screen
  useEffect(() => {
    if (!assets) return;
    const main = mainRef.current!;
    const state = portal.current;
    const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel)!;
    const qa = (sel: string) => Array.from(main.querySelectorAll(sel));

    const ctx = gsap.context((self) => {
      const nav = document.querySelector<HTMLElement>('[data-intro="nav"]')!;
      const media = q('[data-layer="media"]');
      const hero = q("[data-hero]");
      const ready = q('[data-ready="section"]');
      const headline = q('[data-intro="headline"]');
      const first = q('[data-ready="first"]');
      const second = q('[data-ready="second"]');
      const cardBox = q('[data-ready="card"]');
      const float = q('[data-ready="float"]');
      const cardImg = main.querySelector<HTMLElement>('[data-ready="card-img"]');
      const readyItems = ["more", "text", "button", "scroll"].map((k) => q(`[data-ready="${k}"]`));
      const wordmark = q('[data-ready="wordmark"]');

      const unlock = () => {
        delete document.documentElement.dataset.locked;
        ScrollTrigger.refresh();
      };

      // M1 · intro
      const intro = gsap.timeline();
      if (reduced) {
        const shown = [media, nav, q('[data-intro="badge"]'), headline, q('[data-intro="buttons"]'), q('[data-intro="lead"]')];
        Object.assign(state, { scale: 1, face: 1, flash: 0 });
        intro.fromTo(shown, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0);
        intro.call(unlock, undefined, 0.4);
      } else {
        const counter = { v: Number.parseFloat(q('[data-preloader="counter"]').textContent ?? "0") || 0 };
        const counterEl = q('[data-preloader="counter"]');
        intro
          .to(counter, {
            v: 100,
            duration: COUNT_END,
            ease: "power1.out",
            onUpdate: () => {
              counterEl.textContent = `${pad(counter.v)}%`;
            },
          })
          .to(counterEl, { opacity: 0, duration: 0.15, ease: "power1.in" }, COUNTER_OUT)
          .to(state, { scale: 1, duration: GROW_FOR, ease: "power2.out" }, GROW_AT)
          .to(q('[data-preloader="wordmark"]'), { opacity: 0, duration: 0.4, ease: "power1.out" }, WORDMARK_OUT)
          .to(state, { keyframes: { face: [0, 0.8, 0.15, 1, 0.55, 1] }, duration: 0.45, ease: "none" }, LIGHT_ON)
          .to(state, { keyframes: { flash: [0, 1, 0] }, duration: 0.7, ease: "power1.out" }, LIGHT_ON);

        const badge = blurIn(10);
        intro.fromTo(q('[data-intro="badge"]'), badge.from, badge.to, BADGE_IN);
        const navIn = blurIn(8);
        intro.fromTo(nav, navIn.from, navIn.to, NAV_IN);
        intro.set(headline, { opacity: 1 }, HEADLINE_IN);
        intro.add(wordsIn(qa('[data-intro="headline"] [data-word]')), HEADLINE_IN);
        const buttons = blurIn(10);
        intro.fromTo(q('[data-intro="buttons"]'), buttons.from, buttons.to, BUTTONS_IN);
        const lead = blurIn(10);
        intro.fromTo(q('[data-intro="lead"]'), lead.from, lead.to, LEAD_IN);
        intro.call(unlock, undefined, UNLOCK);
      }

      // M4 · second screen reveal
      const reveal = gsap.timeline({ paused: true });
      if (reduced) {
        reveal.fromTo(
          [cardBox, wordmark, first, second, ...readyItems],
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power1.out" },
        );
      } else {
        reveal
          .fromTo(cardBox, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, 0)
          .fromTo(
            float,
            { rotationY: -70, rotation: 18, scale: 0.75, filter: "blur(16px) brightness(1.6)" },
            {
              rotationY: 0,
              rotation: 0,
              scale: 1,
              filter: "blur(0px) brightness(1)",
              duration: 1.4,
              ease: "power3.out",
              clearProps: "filter",
            },
            0,
          )
          .set(first, { opacity: 1 }, 0.15)
          .add(wordsIn(qa('[data-ready="first"] [data-word]')), 0.15)
          .set(second, { opacity: 1 }, 0.3)
          .add(wordsIn(qa('[data-ready="second"] [data-word]')), 0.3)
          .fromTo(wordmark, { opacity: 0 }, { opacity: 1, duration: 1, ease: "power1.out" }, 0.4);
        [0.55, 0.65, 0.75, 0.9].forEach((at, i) => {
          const item = blurIn(10);
          reveal.fromTo(readyItems[i], item.from, item.to, at);
        });

        // The card floats and tilts towards the pointer
        if (cardImg) {
          gsap.fromTo(
            cardImg,
            { yPercent: 0.75, rotation: -0.75 },
            { yPercent: -0.75, rotation: 0.75, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 },
          );
          gsap.set(cardImg, { transformPerspective: 1200 });
          const tiltY = gsap.quickTo(cardImg, "rotationY", { duration: 0.8, ease: "power2.out" });
          const tiltX = gsap.quickTo(cardImg, "rotationX", { duration: 0.8, ease: "power2.out" });
          const onMove = (e: PointerEvent) => {
            tiltY((e.clientX / innerWidth - 0.5) * 2 * TILT_Y);
            tiltX(-(e.clientY / innerHeight - 0.5) * 2 * TILT_X);
          };
          window.addEventListener("pointermove", onMove);
          self.add(() => () => window.removeEventListener("pointermove", onMove));
        }
      }

      // M3 · through the portal
      let revealed = false;
      const setRevealed = (on: boolean) => {
        if (on === revealed) return;
        revealed = on;
        if (on) reveal.timeScale(1).play();
        else reveal.timeScale(2).reverse();
      };

      const update = (p: number) => {
        state.p = p;
        if (reduced) {
          const show = seg(p, ...REDUCED_FADE);
          ready.style.opacity = String(show);
          ready.style.visibility = show > 0 ? "visible" : "hidden";
          setTheme(show >= 1 ? "dark" : "light");
          if (show >= 1) setRevealed(true);
          else if (p < REDUCED_FADE[0]) setRevealed(false);
          return;
        }
        hero.style.transform = `translateY(calc(${-RISE * seg(p, ...RISE_RANGE)} * var(--u)))`;
        const show = seg(p, ...READY_FADE);
        ready.style.opacity = String(show);
        ready.style.visibility = show > 0 ? "visible" : "hidden";
        setTheme(p >= NAV_DARK_AT ? "dark" : "light");
        if (p >= REVEAL_AT) setRevealed(true);
        else if (p < UNREVEAL_BELOW) setRevealed(false);
      };

      const proxy = { p: 0 };
      gsap.to(proxy, {
        p: 1,
        ease: "none",
        onUpdate: () => update(proxy.p),
        scrollTrigger: {
          trigger: main,
          start: "top top",
          end: () => `+=${innerHeight * SCROLL_SCREENS}`,
          pin: true,
          scrub: reduced ? true : SCRUB,
          invalidateOnRefresh: true,
        },
      });
    }, main);

    return () => ctx.revert();
  }, [assets, reduced]);

  return (
    <>
      <Nav theme={theme} />
      <div>
        <main ref={mainRef} className={styles.main}>
          <Preloader />
          <Portal state={portal} desert={assets?.desert ?? null} reduced={reduced} />
          <HeroCopy />
          <Ready card={assets?.card ?? null} />
        </main>
      </div>
    </>
  );
}
