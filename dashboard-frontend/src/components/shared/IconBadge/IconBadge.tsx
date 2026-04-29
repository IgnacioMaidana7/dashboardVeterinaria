import type { ReactNode, CSSProperties } from 'react';
import styles from './IconBadge.module.css';

type BadgeColor = 'navy' | 'amber' | 'teal' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface IconBadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  size?: BadgeSize;
  className?: string;
  style?: CSSProperties;
}

export function IconBadge({
  children,
  color = 'navy',
  size = 'md',
  className = '',
  style,
}: IconBadgeProps) {
  const classNames = [
    styles.badge,
    styles[`color-${color}`],
    styles[`size-${size}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} style={style} aria-hidden="true">
      {children}
    </div>
  );
}
