import React, { useState, useEffect } from 'react';
import './App.css';
import RoleSelection from './comps/RoleSelection';
import Login from './comps/Login';
import Signup from './comps/Signup';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('role'); // role, login, signup

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setCurrentView('dashboard');
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setCurrentView('role');
  };

  if (currentUser) {
    return (
      <div className="App">
        <div className="dashboard-container">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
          <h1>Welcome, {currentUser.name}!</h1>
          <h2>{currentUser.role === 'Company' ? 'Employer Dashboard' : 'Candidate Dashboard'}</h2>
          <p>Coming Soon - Full dashboard features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {currentView === 'role' && (
        <RoleSelection onSelectRole={() => setCurrentView('login')} />
      )}
      {currentView === 'login' && (
        <Login 
          onSwitchToSignup={() => setCurrentView('signup')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {currentView === 'signup' && (
        <Signup 
          onSwitchToLogin={() => setCurrentView('login')}
          onSignupSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

export default App;