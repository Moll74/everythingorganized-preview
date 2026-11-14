import styles from "./Nav.module.css";

export type NavTheme = "light" | "dark";

const LINKS = ["Product", "Benefits", "Countries", "Pricing", "Support"];
const ACTIVE: Record<NavTheme, string> = { light: "Product", dark: "Benefits" };

export function Nav({ theme }: { theme: NavTheme }) {
  return (
    <header className={styles.nav} data-theme={theme} data-intro="nav">
      <a href="#" className={styles.logo} aria-label="Portale home" />
      <nav className={styles.links} aria-label="Main">
        {LINKS.map((label) => (
          <a
            key={label}
            href="#"
            className={styles.link}
            data-active={ACTIVE[theme] === label || undefined}
            aria-current={ACTIVE[theme] === label ? "page" : undefined}
          >
            <span className={`${styles.linkText} trim`}>{label}</span>
            <span className={styles.bar} aria-hidden="true" />
          </a>
        ))}
      </nav>
      <div className={styles.actions}>
        <a href="#" className={styles.account}>
          <span className={styles.icon} aria-hidden="true" />
          <span className={`${styles.uiText} trim`}>Account</span>
        </a>
        <a href="#" className={styles.cta}>
          <span className={`${styles.uiText} trim`}>Watch Demo</span>
        </a>
      </div>
    </header>
  );
}
