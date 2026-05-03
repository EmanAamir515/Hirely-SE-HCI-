import React, { useState, useEffect } from 'react';
import PostJob from './PostJob';
import ManageJobs from './ManageJobs';
import ManageServices from './ManageServices';
import ManageProducts from './ManageProducts';
import AllApplicants from './AllApplicants';
import ViewApplicants from './ViewApplicants';
import CompanyProfile from './CompanyProfile';

const CompanyDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplicants: 0,
    servicesCount: 0,
    productsCount: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/company/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setStats({
          activeJobs: data.data.activeJobs || 0,
          totalApplicants: data.data.totalApplicants || 0,
          servicesCount: data.data.servicesCount || 0,
          productsCount: data.data.productsCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewApplicants = (jobId) => {
    setSelectedJobId(jobId);
    setActiveTab('viewApplicants');
  };

  const handleBackToJobs = () => {
    setSelectedJobId(null);
    setActiveTab('jobs');
  };

  const handleJobPosted = () => {
    setActiveTab('jobs');
    fetchDashboardStats();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="overview-page">
            <h1>Welcome back, {user?.name || 'Employer'}! 👋</h1>
            <p className="subtitle">Here's what's happening with your company</p>
            
            <div className="stats-grid">
              <div className="stat-card" onClick={() => setActiveTab('jobs')}>
                <div className="stat-icon">💼</div>
                <div className="stat-info">
                  <span className="stat-number">{stats.activeJobs}</span>
                  <span className="stat-label">Active Jobs</span>
                </div>
              </div>
              
              <div className="stat-card" onClick={() => setActiveTab('applicants')}>
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <span className="stat-number">{stats.totalApplicants}</span>
                  <span className="stat-label">Total Applicants</span>
                </div>
              </div>
              
              <div className="stat-card" onClick={() => setActiveTab('servicesProducts')}>
                <div className="stat-icon">🛠️</div>
                <div className="stat-info">
                    <span className="stat-number">{stats.servicesCount + stats.productsCount}</span>
                    <span className="stat-label">Services & Products</span>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-btn" onClick={() => setActiveTab('postJob')}>
                  <span>📝</span> Post New Job
                </button>
                <button className="action-btn" onClick={() => setActiveTab('jobs')}>
                  <span>📋</span> Manage Jobs
                </button>
                <button className="action-btn" onClick={() => setActiveTab('applicants')}>
                  <span>👥</span> View Applicants
                </button>
                <button className="action-btn" onClick={() => setActiveTab('profile')}>
                  <span>⚙️</span> Company Profile
                </button>
              </div>
            </div>
          </div>
        );

      case 'postJob':
        return <PostJob user={user} onJobPosted={handleJobPosted} />;

      case 'jobs':
        return <ManageJobs user={user} onViewApplicants={handleViewApplicants} />;

      case 'viewApplicants':
        return (
          <ViewApplicants 
            user={user} 
            jobId={selectedJobId} 
            onBack={handleBackToJobs} 
          />
        );

      case 'applicants':
        return <AllApplicants user={user} onViewApplicants={handleViewApplicants} />;

      case 'servicesProducts':
         return <ServicesProducts user={user} />;
      case 'profile':
        return <CompanyProfile user={user} />;

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="company-dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Hirely</h2>
          <span className="company-badge">Employer</span>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>📊</span> Dashboard
          </button>
          
          <div className="nav-section">
            <span className="nav-section-title">Jobs</span>
            <button 
              className={`nav-item ${activeTab === 'postJob' ? 'active' : ''}`}
              onClick={() => setActiveTab('postJob')}
            >
              <span>➕</span> Post New Job
            </button>
            <button 
              className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              <span>📋</span> Manage Jobs
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-section-title">Applicants</span>
            <button 
              className={`nav-item ${activeTab === 'applicants' ? 'active' : ''}`}
              onClick={() => setActiveTab('applicants')}
            >
              <span>👥</span> All Applicants
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-section-title">Services & Products</span>
            <button 
                className={`nav-item ${activeTab === 'servicesProducts' ? 'active' : ''}`}
                onClick={() => setActiveTab('servicesProducts')}
            >
                <span>🛠️</span> Services & Products
            </button>
            </div>

      

          <div className="nav-section">
            <span className="nav-section-title">Settings</span>
            <button 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span>⚙️</span> Company Profile
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {renderContent()}
      </main>

      <style>{`
        .company-dashboard {
          display: flex;
          min-height: 100vh;
          background: #F3F4F6;
        }

        /* Sidebar */
        .sidebar {
          width: 260px;
          background: white;
          border-right: 1px solid #E5E7EB;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
        }

        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid #E5E7EB;
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 24px;
          color: #111827;
          font-weight: 700;
        }

        .company-badge {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 12px;
          background: #EEF2FF;
          color: #4338CA;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 16px 12px;
        }

        .nav-section {
          margin-bottom: 20px;
        }

        .nav-section-title {
          display: block;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #9CA3AF;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          transition: all 0.2s;
          text-align: left;
        }

        .nav-item:hover {
          background: #F3F4F6;
        }

        .nav-item.active {
          background: #EEF2FF;
          color: #4338CA;
          font-weight: 500;
        }

        .nav-item span {
          font-size: 18px;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          margin-left: 260px;
          padding: 32px;
          min-height: 100vh;
        }

        /* Overview Page */
        .overview-page h1 {
          font-size: 28px;
          color: #111827;
          margin: 0 0 4px 0;
        }

        .subtitle {
          color: #6B7280;
          margin: 0 0 32px 0;
          font-size: 15px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .stat-icon {
          font-size: 36px;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .stat-label {
          font-size: 13px;
          color: #6B7280;
        }

        .quick-actions {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .quick-actions h3 {
          margin: 0 0 16px 0;
          color: #111827;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          background: #F9FAFB;
          border: 2px solid #E5E7EB;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #EEF2FF;
          border-color: #667EEA;
          color: #4338CA;
        }

        .action-btn span {
          font-size: 24px;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            position: relative;
            height: auto;
          }
          
          .main-content {
            margin-left: 0;
            padding: 16px;
          }
          
          .company-dashboard {
            flex-direction: column;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CompanyDashboard;