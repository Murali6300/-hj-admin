import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/login', { email, password });
      const token = res.data?.accessToken;
      if (!token) {
        setError('Invalid server response - no token received');
        setLoading(false);
        return;
      }
      localStorage.setItem('admin_token', token);
      navigate('/', { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;

      if (status === 401) {
        setError(serverMsg || 'Invalid email or password');
      } else if (status === 500) {
        setError('Server error. The backend may be starting up - please try again in 30 seconds.');
      } else if (!err?.response) {
        setError('Cannot reach the server. Check if the backend is running.');
      } else {
        setError(serverMsg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#1A73E8' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 40, borderRadius: 12, width: 380, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, color: '#1A73E8' }}>HJ Admin</h1>
        <p style={{ textAlign: 'center', color: '#757575', marginBottom: 24 }}>Sign in to your admin account</p>

        {error && (
          <div style={{ background: '#FFEBEE', color: '#D32F2F', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, marginTop: 4, fontSize: 14 }}
            placeholder="admin@hjapp.com" />
        </label>

        <label style={{ display: 'block', marginBottom: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, marginTop: 4, fontSize: 14 }}
            placeholder="Enter password" />
        </label>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: 12, background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
