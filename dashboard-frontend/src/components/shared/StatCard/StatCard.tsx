import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { IconBadge } from '@/components/shared/IconBadge';
import styles from './StatCard.module.css';

type TrendDirection = 'up' | 'down' | 'neutral';
type StatVariant = 'default' | 'compact';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconColor?: 'navy' | 'amber' | 'teal' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  trend?: {
    value: string;
    direction: TrendDirection;
    label?: string;
  };
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  progressBar?: {
    value: number;
    color?: string;
  };
  variant?: StatVariant;
  className?: string;
  id?: string;
}

export function StatCard({
  label,
  value,
  icon,
  iconColor = 'navy',
  trend,
  badge,
  progressBar,
  variant = 'default',
  className = '',
  id,
}: StatCardProps) {
  const trendIcon = trend ? (
    trend.direction === 'up' ? <TrendingUp size={14} /> :
    trend.direction === 'down' ? <TrendingDown size={14} /> :
    <Minus size={14} />
  ) : null;

  return (
    <Card
      id={id}
      className={`${styles.statCard} ${styles[`variant-${variant}`]} ${className}`}
      padding="md"
    >
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <IconBadge color={iconColor} size="sm">
            {icon}
          </IconBadge>
        )}
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {badge && (
          <span className={`${styles.badge} ${styles[`badge-${badge.variant}`]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {trend && (
        <div className={`${styles.trend} ${styles[`trend-${trend.direction}`]}`}>
          {trendIcon}
          <span className={styles.trendValue}>{trend.value}</span>
          {trend.label && <span className={styles.trendLabel}>{trend.label}</span>}
        </div>
      )}

      {progressBar && (
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{
              width: `${Math.min(progressBar.value, 100)}%`,
              backgroundColor: progressBar.color || 'var(--color-amber-500)',
            }}
          />
        </div>
      )}
    </Card>
  );
}
