import React, { useState, useEffect } from 'react';
import './App.css';
import RoleSelection from './comps/RoleSelection';
import Login from './comps/Login';
import Signup from './comps/Signup';
import EmployerDashboard from './comps/employer/EmployerDashboard';

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
    if (currentUser.role === 'Company') {
      return (
        <EmployerDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
        />
      );
    }
    
    // Candidate dashboard (coming soon)
     return (
      <div className="App">
        <div className="dashboard-container">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
          <h1>Welcome, {currentUser.name || 'User'}!</h1>
          <h2>Candidate Dashboard</h2>
          <p>Your role: {currentUser.role}</p>
          <p>Coming Soon - We're building something awesome!</p>
        </div>
      </div>
    );
  }
   return (
    <div className="App">
      {currentView === 'role' && (
        <RoleSelection onSelectRole={(role) => {
          setCurrentView('login');
          // Store selected role if needed
        }} />
      )}
      {currentView === 'login' && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      {currentView === 'signup' && (
        <Signup onSignupSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;