import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onSwitchToSignup, onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Get role from sessionStorage
  const selectedRole = sessionStorage.getItem('selectedRole');

  // If no role, show message
  if (!selectedRole) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-logo">Hirely</h1>
          <h2>No Role Selected</h2>
          <p>Please go back and select your role</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Back to Role Selection
          </button>
        </div>
        <style>{`
          .auth-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .auth-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            width: 100%;
            max-width: 450px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .auth-logo {
            font-size: 36px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
          }
        `}</style>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Debug log
    console.log('Login attempt with:', {
      email: formData.email,
      password: formData.password,
      role: selectedRole
    });

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email: formData.email,
        password: formData.password,
        role: selectedRole
      });

      console.log('Login response:', response.data);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      console.error('Login error:', err.response?.data);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button 
          className="back-button" 
          onClick={() => {
            sessionStorage.removeItem('selectedRole');
            window.location.reload();
          }}
        >
          ← Back to Role Selection
        </button>
        
        <h1 className="auth-logo">Hirely</h1>
        <h2>Welcome Back!</h2>
        <p>Login as <strong>{selectedRole}</strong></p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="form-group password-group">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="switch">
          Don't have an account?{' '}
          <button onClick={onSwitchToSignup}>Sign up</button>
        </p>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .auth-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          width: 100%;
          max-width: 450px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          position: relative;
        }
        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .auth-logo {
          font-size: 36px;
          background: linear-gradient(135deg, #667eea);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 20px;
          margin-top: 10px;
        }
        .auth-card h2 {
          color: #333;
          margin-bottom: 10px;
        }
        .auth-card p {
          color: #666;
          margin-bottom: 20px;
        }
        .error {
          background: #fee;
          color: #f44336;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
        }
        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }
        .password-group {
          position: relative;
        }
        .password-group button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
        }
        button[type="submit"] {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }
        button[type="submit"]:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .switch {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .switch button {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default Login;