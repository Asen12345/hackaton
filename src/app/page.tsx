import Navigation from './components/Navigation';
import SearchBar from './components/SearchBar';
import HistoryTags from './components/HistoryTags';
import styles from './page.module.scss';

export default function Home() {
  return (
    <main className={styles.main}>
      <nav className={styles.navigation}>
        <div className={styles.navLinks}>
          <div className={styles.navContainer}>
            <Navigation />
            <SearchBar />
            <HistoryTags />
          </div>
        </div>
      </nav>
    </main>
  );
}
