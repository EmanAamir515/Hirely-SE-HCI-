import React, { useState, useEffect } from 'react';
import './App.css';
import RoleSelection from './comps/RoleSelection';
import Login from './comps/Login';
import Signup from './comps/Signup';
import EmployerDashboard from './comps/employer/EmployerDashboard';
import CandidateDashboard from './comps/candidate/CandidateDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('role'); // role, login, signup
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setCurrentView('dashboard');
    }
    // Don't clear sessionStorage on mount
  }, []);

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setCurrentView('dashboard');
    // Don't clear selectedRole yet, might be needed
    // sessionStorage.removeItem('selectedRole');  // Remove this line
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('selectedRole');
    setCurrentUser(null);
    setCurrentView('role');
    setSelectedRole(null);
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    sessionStorage.setItem('selectedRole', role);
    setCurrentView('login');
  };

  const handleBackToRole = () => {
    sessionStorage.removeItem('selectedRole');
    setCurrentView('role');
    setSelectedRole(null);
  };

  const handleSwitchToSignup = () => {
    // Make sure role is preserved
    const role = sessionStorage.getItem('selectedRole');
    if (!role) {
      // If no role stored, go back to role selection
      setCurrentView('role');
      return;
    }
    setCurrentView('signup');
  };

  const handleSwitchToLogin = () => {
    setCurrentView('login');
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
    if (currentUser.role === 'Candidate') {
      return <CandidateDashboard user={currentUser} onLogout={handleLogout} />;
    }
  }

  return (
    <div className="App">
      {currentView === 'role' && (
        <RoleSelection onSelectRole={handleRoleSelect} />
      )}
      {currentView === 'login' && (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          onBack={handleBackToRole}
          onSwitchToSignup={handleSwitchToSignup}
        />
      )}
      {currentView === 'signup' && (
        <Signup 
          onSignupSuccess={handleLoginSuccess}
          onBack={handleBackToRole}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
    </div>
  );
}

export default App;