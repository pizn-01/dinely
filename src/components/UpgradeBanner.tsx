import { Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { adminBillingPath } from '../utils/restaurantRoutes';

interface UpgradeBannerProps {
  title: string;
  description: string;
  restaurantSlug: string;
  isDark?: boolean;
}

export function UpgradeBanner({ title, description, restaurantSlug, isDark = false }: UpgradeBannerProps) {
  const containerStyle = {
    backgroundColor: isDark ? 'rgba(31, 41, 55, 0.4)' : '#f9fafb',
    border: `1px dashed ${isDark ? '#374151' : '#d1d5db'}`,
    borderRadius: '12px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    margin: '24px 0',
  };

  const iconStyle = {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
    color: '#f59e0b',
    padding: '12px',
    borderRadius: '50%',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '0.9rem',
    marginTop: '24px',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={containerStyle}>
      <div style={iconStyle}>
        <Lock size={24} strokeWidth={2} />
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.95rem', color: isDark ? '#9ca3af' : '#6b7280', maxWidth: '400px', lineHeight: 1.5 }}>
        {description}
      </p>
      <Link 
        to={adminBillingPath(restaurantSlug)} 
        style={btnStyle}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#374151'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#111827'}
      >
        Upgrade to Professional
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
