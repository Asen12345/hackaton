import styles from './HistoryTags.module.scss';

export default function HistoryTags() {
  return (
    <div className={styles.historySection}>
      <p>История запросов</p>
      <div className={styles.tags}>
        <span className={styles.tag}>Консультация</span>
        <span className={styles.tag}>Работа с СТЕ</span>
        <span className={styles.tag}>Как оформить поставку</span>
        <span className={styles.all}>Все 155</span>
      </div>
    </div>
  );
} 