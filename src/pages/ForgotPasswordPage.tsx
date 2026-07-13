import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (err?.response?.status === 404) {
        setError('No admin account found with this email');
      } else {
        setError(serverMsg || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#1A73E8' }}>
      <div style={{ background: '#fff', padding: 40, borderRadius: 12, width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, color: '#1A73E8' }}>HJ Admin</h1>

        {sent ? (
          <>
            <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: 16, borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
              Password reset link has been sent to <strong>{email}</strong>. Please check your inbox and follow the instructions.
            </div>
            <Link to="/login" style={{ display: 'block', textAlign: 'center', color: '#1A73E8', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              Back to Login
            </Link>
          </>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: '#757575', marginBottom: 24, fontSize: 14 }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {error && (
              <div style={{ background: '#FFEBEE', color: '#D32F2F', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Email Address</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, marginTop: 4, fontSize: 14 }}
                  placeholder="admin@hjapp.com" />
              </label>

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 12, background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to="/login" style={{ color: '#1A73E8', textDecoration: 'none', fontSize: 13 }}>
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
