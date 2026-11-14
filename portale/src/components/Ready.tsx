import type { LoadedImage } from "../lib/loadImages";
import styles from "./Ready.module.css";
import { Words } from "./Words";

const FIRST = "Everything Ready";
const SECOND = "Before You Land";
const TEXT =
  "Open your account remotely, receive your digital card instantly, and arrive with payments, currency exchange, and banking already set up.";

export function Ready({ card }: { card: LoadedImage | null }) {
  return (
    <section className={styles.ready} data-ready="section">
      <div className={styles.wordmark} data-ready="wordmark">
        <img src="https://assets.uberdesigner.ai/portale/wordmark.svg" alt="" />
      </div>

      <div className={styles.card} data-ready="card">
        <div className={styles.float} data-ready="float">
          {card ? <img src={card.src} alt="" data-ready="card-img" /> : null}
        </div>
      </div>

      <h2 className={styles.headline} aria-label={`${FIRST} ${SECOND}`}>
        <span className={`${styles.line} ${styles.first} trim`} aria-hidden="true" data-ready="first">
          <Words text={FIRST} className={styles.word} />
        </span>
        <span className={`${styles.line} ${styles.second} trim`} aria-hidden="true" data-ready="second">
          <Words text={SECOND} className={styles.word} />
        </span>
      </h2>

      <a href="#" className={styles.more} data-ready="more">
        <img src="https://assets.uberdesigner.ai/portale/icon-plus.svg" alt="" className={styles.icon} />
        <span className={`${styles.uiText} trim`}>More</span>
      </a>

      <p className={`${styles.text} trim`} data-ready="text">
        {TEXT}
      </p>

      <a href="#" className={styles.button} data-ready="button">
        <span className="trim">Open account for free</span>
      </a>

      <p className={`${styles.scroll} trim`} data-ready="scroll">
        Scroll down for more ↓
      </p>
    </section>
  );
}
