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
      localStorage.setItem('admin_token', res.data.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#1A73E8' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 40, borderRadius: 12, width: 380, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, color: '#1A73E8' }}>HJ Admin</h1>
        <p style={{ textAlign: 'center', color: '#757575', marginBottom: 24 }}>Sign in to your admin account</p>

        {error && <div style={{ background: '#FFEBEE', color: '#D32F2F', padding: 10, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}

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
          style={{ width: '100%', padding: 12, background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
