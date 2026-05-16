import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Lock, CreditCard, CheckCircle, ShieldAlert, Activity } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/Navbar';
import PoweredByFooter from '../../components/PoweredByFooter';
import dinelyLogo from '../../assets/dinely-logo.png';
import { toast } from 'react-hot-toast';

export default function SuperAdminManualOnboard() {
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    plan: 'starter'
  });
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1517' : '#f8fafc' }}>Loading...</div>;
  }

  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/staff-login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await api.post('/admin/organizations/manual', formData);
      if (response.data?.success) {
        toast.success('Organization created successfully and payment bypassed.');
        navigate('/admin/super');
      }
    } catch (error: any) {
      console.error('Failed to create organization', error);
      toast.error(error.response?.data?.message || 'Failed to create organization.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = isDark ? '#101A1C' : '#ffffff';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const textPrimary = isDark ? '#ffffff' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0d1117' : '#ffffff';
  const gold = '#C99C63';

  const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: textSecondary, marginBottom: '8px' };
  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${borderColor}`,
    backgroundColor: inputBg, color: textPrimary, fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1517' : '#f8fafc',
      fontFamily: 'var(--font-sans)',
      color: textPrimary
    }}>
      <Navbar variant="admin" logoUrl={dinelyLogo} />

      <div style={{ padding: '48px 24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', backgroundColor: isDark ? 'rgba(201, 156, 99, 0.15)' : '#fef3c7', color: gold, marginBottom: '16px' }}>
            <ShieldAlert size={24} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0' }}>Manual Onboarding</h1>
          <p style={{ color: textSecondary, fontSize: '0.95rem', margin: 0 }}>
            Create an organization and bypass the payment gateway.
          </p>
        </div>

        <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}><Building2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} /> Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
                style={inputStyle}
                placeholder="e.g. The Golden Fork"
              />
            </div>
            
            <div>
              <label style={labelStyle}><User size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} /> Owner Full Name</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                required
                style={inputStyle}
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label style={labelStyle}><Mail size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} /> Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={inputStyle}
                placeholder="owner@restaurant.com"
              />
            </div>

            <div>
              <label style={labelStyle}><Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} /> Initial Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                style={inputStyle}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label style={labelStyle}><CreditCard size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} /> Subscription Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${isDark ? '%2394a3b8' : '%2364748b'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
              >
                <option value="starter">Starter Plan</option>
                <option value="professional">Professional Plan</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: gold,
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.2s'
              }}
            >
              {submitting ? 'Creating...' : <><CheckCircle size={18} /> Create & Bypass Payment</>}
            </button>
          </form>
        </div>
      </div>
      
      <PoweredByFooter theme={isDark ? 'dark' : 'light'} />
    </div>
  );
}
