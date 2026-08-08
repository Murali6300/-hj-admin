/**
 * LoginPage — HJ Admin Portal Premium Enterprise Design
 *
 * Two-column responsive layout:
 *   Desktop: Illustration (left) + Login Card (right)
 *   Mobile:  Stacked vertically
 *
 * Features:
 *   - HJ branding with logo + tagline
 *   - Flat vector illustration (city skyline, vehicles, pin)
 *   - Three feature cards (Driver Management, Ride Monitoring, Analytics)
 *   - Glassmorphism login card with rounded inputs
 *   - Gradient submit button with loading spinner
 *   - Remember me + Forgot password
 *   - Fade-in / slide-up animations
 *   - Fully responsive
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import '../styles/LoginPage.css';

/* ── SVG Icon Components ────────────────────────────────────────── */

const UserIcon = () => (
  <svg className="login-input-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg className="login-input-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="login-submit__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const AlertIcon = () => (
  <svg className="login-error__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ── Feature Cards Data ─────────────────────────────────────────── */

const FEATURES = [
  { icon: '👥', label: 'Driver Management', color: 'blue' as const },
  { icon: '📍', label: 'Ride Monitoring', color: 'green' as const },
  { icon: '📊', label: 'Analytics Dashboard', color: 'orange' as const },
];

/* ── Component ──────────────────────────────────────────────────── */

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [slowWarning, setSlowWarning] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlowWarning(false);
      return;
    }
    const t = setTimeout(() => setSlowWarning(true), 12_000);
    return () => clearTimeout(t);
  }, [loading]);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await api.post('/login', { email, password });
      const { accessToken, refreshToken, name, role } = res.data || {};
      if (!accessToken) {
        setError('Invalid server response - no token received');
        setLoading(false);
        return;
      }
      localStorage.setItem('admin_token', accessToken);
      if (refreshToken) localStorage.setItem('admin_refresh_token', refreshToken);
      if (name) localStorage.setItem('admin_name', name);
      if (role) localStorage.setItem('admin_role', role);
      if (rememberMe) localStorage.setItem('admin_remember', 'true');
      navigate('/', { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;

      if (status === 401) {
        setError(serverMsg || 'Invalid email or password');
      } else if (status === 423) {
        setError(serverMsg || 'Account is locked. Try again later.');
      } else if (status === 500) {
        setError('Server error. The backend may be starting up - please try again in 30 seconds.');
      } else if (err?.code === 'ECONNABORTED') {
        setError('Login request timed out. The backend may be cold-starting - please try again.');
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
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb login-bg-orb--blue" />
      <div className="login-bg-orb login-bg-orb--green" />
      <div className="login-bg-orb login-bg-orb--orange" />

      {/* ── LEFT: Illustration Panel ──────────────────────── */}
      <div className="login-left">
        <div className="login-left__brand">
          <div className="login-left__logo">
            <span className="login-left__logo-text">HJ</span>
          </div>
          <h1 className="login-left__title">Happy Journey</h1>
          <p className="login-left__subtitle">Administrator Portal</p>
          <p className="login-left__desc">Premium Ride Management System</p>
        </div>

        {/* Illustration */}
        <div className="login-illustration">
          <div className="illust-sky" />
          <div className="illust-sun">
            <div className="illust-sun__ring" />
          </div>
          <div className="illust-cloud illust-cloud--1" />
          <div className="illust-cloud illust-cloud--2" />

          {/* Buildings */}
          <div className="illust-building illust-building--1" />
          <div className="illust-building illust-building--2" />
          <div className="illust-building illust-building--3" />
          <div className="illust-building illust-building--4" />
          <div className="illust-building illust-building--5" />
          <div className="illust-building illust-building--6" />

          {/* Navigation Pin */}
          <div className="illust-pin">
            <div className="illust-pin__head">
              <div className="illust-pin__dot" />
            </div>
          </div>

          {/* Route line */}
          <div className="illust-route" />

          {/* Road */}
          <div className="illust-road">
            <div className="illust-road__line" />
          </div>

          {/* Vehicles */}
          <div className="illust-vehicle illust-bike">
            <div className="illust-bike__body">
              <div className="illust-bike__rider" />
              <div className="illust-bike__wheel illust-bike__wheel--l" />
              <div className="illust-bike__wheel illust-bike__wheel--r" />
            </div>
          </div>

          <div className="illust-vehicle illust-auto">
            <div className="illust-auto__body">
              <div className="illust-auto__roof" />
              <div className="illust-auto__wheel illust-auto__wheel--l" />
              <div className="illust-auto__wheel illust-auto__wheel--r" />
            </div>
          </div>

          <div className="illust-vehicle illust-car">
            <div className="illust-car__body">
              <div className="illust-car__roof" />
              <div className="illust-car__wheel illust-car__wheel--l" />
              <div className="illust-car__wheel illust-car__wheel--r" />
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="login-features">
          {FEATURES.map((f) => (
            <div className="login-feature" key={f.label}>
              <div className={`login-feature__icon login-feature__icon--${f.color}`}>
                <CheckIcon />
              </div>
              <span className="login-feature__text">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Login Card ─────────────────────────────── */}
      <div className="login-right">
        <div className="login-card">
          {/* Header */}
          <div className="login-card__header">
            <div className="login-card__logo">
              <span className="login-card__logo-text">HJ</span>
            </div>
            <p className="login-card__portal">Admin Portal</p>
            <h2 className="login-card__title">Welcome Back</h2>
            <p className="login-card__subtitle">Sign in to continue managing your platform.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="login-field">
              <label className="login-field__label" htmlFor="login-email">Username</label>
              <div className="login-input-wrap">
                <UserIcon />
                <input
                  id="login-email"
                  className={`login-input${fieldErrors.email ? ' login-input--error' : ''}`}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
              {fieldErrors.email && <span className="login-field__error">{fieldErrors.email}</span>}
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-field__label" htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <LockIcon />
                <input
                  id="login-password"
                  className={`login-input${fieldErrors.password ? ' login-input--error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-input-wrap__toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.password && <span className="login-field__error">{fieldErrors.password}</span>}
            </div>

            {/* Remember + Forgot */}
            <div className="login-form-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  className="login-remember__checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="login-forgot">Forgot Password?</Link>
            </div>

            {/* Submit */}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="login-submit__spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRightIcon />
                </>
              )}
            </button>
            {slowWarning && (
              <p className="login-slow-hint">
                Backend is warming up (free-tier cold start). First login after inactivity can take up to a minute.
              </p>
            )}
          </form>

          {/* Footer */}
          <div className="login-footer">
            <p className="login-footer__text">
              &copy; Happy Journey &middot; v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
