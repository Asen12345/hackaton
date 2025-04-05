import React, { useState, useEffect } from 'react';
import styles from './Modal.module.scss';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 600); // Длительность анимации закрытия
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`${styles.modalOverlay} ${isClosing ? styles.closing : ''}`} onClick={handleClose}>
      <div className={`${styles.modalContent} ${isClosing ? styles.closing : ''}`} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose}>
          Закрыть
        </button>
        {children}
      </div>
    </div>
  );
} 