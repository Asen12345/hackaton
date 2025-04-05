import styles from './Navigation.module.scss';

export default function Navigation() {
  return (
    <div className={styles.content}>
      <div className={styles.topNav}>
        <a href="#" className={styles.navLink}>Для заказчика</a>
        <a href="#" className={styles.navLink}>Инструкции</a>
        <a href="#" className={styles.navLink}>Общий раздел</a>
        <a href="#" className={styles.navLink}>Для поставщика</a>
      </div>
    </div>
  );
} 