import React from 'react';

const RoleSelection = ({ onSelectRole }) => {
  const handleRoleSelect = (role) => {
    // Store the exact role value that matches DB constraint
    sessionStorage.setItem('selectedRole', role);
    // Call the parent handler
    onSelectRole(role);
  };

  return (
    <div className="role-container">
      <div className="role-card">
        <div className="logo-section">
          <h1>Hirely</h1>
          <p>Your Modern Recruitment & Service Platform</p>
        </div>

        <div className="roles">
          <div className="role-option" onClick={() => handleRoleSelect('Company')}>
            <div className="role-icon">🏢</div>
            <h3>Employer</h3>
            <p>Post jobs, manage applicants, and showcase your services</p>
            <button>GIVER</button>
          </div>

          <div className="role-option" onClick={() => handleRoleSelect('Candidate')}>
            <div className="role-icon">👨‍💻</div>
            <h3>Candidate</h3>
            <p>Find jobs, track applications, and discover opportunities</p>
            <button>FINDER</button>
          </div>
        </div>
      </div>

      <style>{`
        .role-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .role-card {
          max-width: 1000px;
          width: 100%;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .logo-section {
          background: linear-gradient(135deg, #667eea );
          padding: 40px;
          text-align: center;
          color: white;
        }
        .logo-section h1 {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .roles {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          padding: 50px;
        }
        .role-option {
          text-align: center;
          padding: 40px;
          background: #f8f9fa;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s;
          border: 2px solid transparent;
        }
        .role-option:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .role-option:hover:first-child {
          border-color: #764ba2;
        }
        .role-option:hover:last-child {
          border-color: #764ba2;
        }
        .role-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        .role-option h3 {
          font-size: 28px;
          margin-bottom: 15px;
          color: #333;
        }
        .role-option p {
          color: #666;
          margin-bottom: 25px;
        }
        .role-option button {
          padding: 12px 30px;
          background: linear-gradient(135deg, #667eea );
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }
        @media (max-width: 768px) {
          .roles {
            grid-template-columns: 1fr;
            padding: 30px;
          }
          .logo-section h1 {
            font-size: 32px;
          }
        }
      `}</style>
    </div>
  );
};

export default RoleSelection;