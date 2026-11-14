import styles from "./HeroCopy.module.css";
import { Words } from "./Words";

const HEADLINE = ["Enter New Places", "Without Starting Over"];
const LEAD =
  "Portale is a relocation card designed for people starting life abroad. Open remotely, spend instantly, exchange currencies fairly, and arrive already connected.";

export function HeroCopy() {
  return (
    <div className={styles.hero} data-hero="">
      <div className={styles.column}>
        <div className={styles.badge} data-intro="badge">
          <span className={styles.square} aria-hidden="true" />
          <span className={`${styles.badgeText} trim`}>World Banking system awards winner</span>
        </div>
        <h1 className={`${styles.headline} trim`} aria-label={HEADLINE.join(" ")} data-intro="headline">
          {HEADLINE.map((line) => (
            <span key={line} className={styles.line} aria-hidden="true">
              <Words text={line} className={styles.word} />
            </span>
          ))}
        </h1>
      </div>

      <div className={styles.buttons} data-intro="buttons">
        <a href="#" className={`${styles.button} ${styles.light}`}>
          <span className="trim">See Benefits</span>
        </a>
        <a href="#" className={`${styles.button} ${styles.outline}`}>
          <span className="trim">Watch Demo</span>
        </a>
      </div>

      <p className={`${styles.lead} trim`} data-intro="lead">
        {LEAD}
      </p>
    </div>
  );
}
