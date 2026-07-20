import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return; }
    setLoading(true);
    try {
      const res = await api.post('/forgot-password', { email });
      const code = res.data?.resetCode;
      if (code) setResetCode(code);
      setStep('reset');
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setError(serverMsg || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resetCode.trim()) { setError('Reset code is required'); return; }
    if (!newPassword) { setError('New password is required'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/reset-password', { resetCode, newPassword });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setError(serverMsg || 'Failed to reset password. The code may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#1E88E5' }}>
      <div style={{ background: '#fff', padding: 40, borderRadius: 12, width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, color: '#1E88E5' }}>HJ Admin</h1>

        {success ? (
          <>
            <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: 16, borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
              {success}
            </div>
            <Link to="/login" style={{ display: 'block', textAlign: 'center', color: '#1E88E5', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              Back to Login
            </Link>
          </>
        ) : step === 'request' ? (
          <>
            <p style={{ textAlign: 'center', color: '#757575', marginBottom: 24, fontSize: 14 }}>
              Enter your email address and we'll send you a reset code.
            </p>
            {error && (
              <div style={{ background: '#FFEBEE', color: '#D32F2F', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleRequestCode}>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Email Address</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, marginTop: 4, fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="admin@hjapp.com" />
              </label>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 12, background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: '#757575', marginBottom: 24, fontSize: 14 }}>
              Enter the reset code and your new password.
            </p>
            {error && (
              <div style={{ background: '#FFEBEE', color: '#D32F2F', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleResetPassword}>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Reset Code</span>
                <input type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, marginTop: 4, fontSize: 14, letterSpacing: 4, boxSizing: 'border-box' }}
                  placeholder="Enter 6-digit code" maxLength={6} />
              </label>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>New Password</span>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    style={{ display: 'block', width: '100%', padding: '10px 36px 10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, marginTop: 4, fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </label>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Confirm Password</span>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, marginTop: 4, fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="Re-enter password" />
              </label>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 12, background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ color: '#1E88E5', textDecoration: 'none', fontSize: 13 }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
