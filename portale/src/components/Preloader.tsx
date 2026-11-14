import styles from "./Preloader.module.css";

export function Preloader() {
  return (
    <div className={styles.preloader} aria-hidden="true">
      <img
        src="https://assets.uberdesigner.ai/portale/wordmark.svg"
        alt=""
        className={styles.wordmark}
        data-preloader="wordmark"
      />
      <span className={`${styles.counter} trim`} data-preloader="counter">
        00%
      </span>
    </div>
  );
}
