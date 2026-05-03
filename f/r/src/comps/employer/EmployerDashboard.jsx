import React, { useState, useEffect } from 'react';
import EmployerSidebar   from './EmployerSidebar';
import EmployerProfile   from './EmployerProfile';
import PostJob           from './PostJob';
import ManageJobs        from './ManageJobs';
import ViewApplicants    from './ViewApplicants';
import AllApplicants     from './AllApplicants';
import ManageServices    from './ManageServices';
import ManageProducts    from './ManageProducts';

const API = 'http://localhost:5000';

const EmployerDashboard = ({ user, onLogout }) => {
  const [activeTab,     setActiveTab]     = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [companyData,   setCompanyData]   = useState(null);
  const [companyLogo,   setCompanyLogo]   = useState(null); // full URL string

  // ── Fetch company profile + logo path from DB ──
  const fetchCompanyProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/company/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCompanyData(data.data);
        // Logo field in DB is a path like  /uploads/logos/company_2_123.jpg
        if (data.data.Logo) {
          const url = data.data.Logo.startsWith('http')
            ? data.data.Logo
            : `${API}${data.data.Logo}`;
          setCompanyLogo(url);
        }
      }
    } catch (err) {
      console.error('fetchCompanyProfile:', err);
    }
  };

  useEffect(() => { fetchCompanyProfile(); }, []);

  const handleViewJobApplicants = (jobId) => {
    setSelectedJobId(jobId);
    setActiveTab('job-applicants');
  };

  const stats = {
    activeJobs:      companyData?.activeJobs      || 0,
    totalApplicants: companyData?.totalApplicants  || 0,
    servicesOffered: companyData?.servicesCount    || 0,
    productsListed:  companyData?.productsCount    || 0
  };

  // ── Tab title map for the top bar ──
  const TAB_TITLES = {
    dashboard:       '📊 Dashboard',
    profile:         '🏢 Company Profile',
    'post-job':      '📝 Post New Job',
    'manage-jobs':   '📋 Manage Jobs',
    'job-applicants':'👥 Job Applicants',
    'all-applicants':'👥 All Applicants',
    services:        '🔧 Services',
    products:        '📦 Products'
  };

  return (
    <div className="emp-layout">
      {/* ── Fixed sidebar ── */}
      <EmployerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={onLogout}
        companyLogo={companyLogo}
      />

      {/* ── Right-side content column ── */}
      <div className="emp-content">

        {/* ── Sticky top bar ── */}
        <div className="topbar">
          <span className="topbar-title">{TAB_TITLES[activeTab] || 'Hirely'}</span>
          <div className="topbar-right">
            <span className="company-label">
              {companyData?.CompanyName || user.name}
            </span>
            <div
              className="logo-badge"
              title="Go to Company Profile"
              onClick={() => setActiveTab('profile')}
            >
              {companyLogo
                ? <img src={companyLogo} alt="logo" className="logo-badge-img" />
                : <span className="logo-badge-init">
                    {(companyData?.CompanyName || user.name || 'C').charAt(0).toUpperCase()}
                  </span>
              }
            </div>
          </div>
        </div>

        {/* ── Page body ── */}
        <div className="page-body">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              <h1>Welcome back, {user.name}! 👋</h1>
              <p className="subtitle">{companyData?.CompanyName || 'Your Company Dashboard'}</p>

              <div className="stats-grid">
                {[
                  { c:'purple', icon:'📋', val:stats.activeJobs,      lbl:'Active Jobs',       tab:'manage-jobs'    },
                  { c:'blue',   icon:'👥', val:stats.totalApplicants,  lbl:'Total Applicants',  tab:'all-applicants' },
                  { c:'green',  icon:'🔧', val:stats.servicesOffered,  lbl:'Services',          tab:'services'       },
                  { c:'orange', icon:'📦', val:stats.productsListed,   lbl:'Products',          tab:'products'       }
                ].map(s => (
                  <div key={s.tab} className={`stat-card ${s.c}`} onClick={() => setActiveTab(s.tab)}>
                    <div className="sicon">{s.icon}</div>
                    <div><h3>{s.val}</h3><p>{s.lbl}</p></div>
                  </div>
                ))}
              </div>

              <div className="qa-box">
                <h2>Quick Actions</h2>
                <div className="qa-grid">
                  {[
                    { icon:'📝', lbl:'Post New Job',    tab:'post-job'     },
                    { icon:'📊', lbl:'Manage Jobs',     tab:'manage-jobs'  },
                    { icon:'🔧', lbl:'Add Services',    tab:'services'     },
                    { icon:'⚙️', lbl:'Company Profile', tab:'profile'      }
                  ].map(a => (
                    <button key={a.tab} onClick={() => setActiveTab(a.tab)} className="qa-btn">
                      <span>{a.icon}</span>{a.lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <EmployerProfile
              user={user}
              companyData={companyData}
              onUpdate={fetchCompanyProfile}
              onLogoChange={url => setCompanyLogo(url)}
            />
          )}

          {activeTab === 'post-job' && (
            <PostJob user={user}
              onJobPosted={() => { fetchCompanyProfile(); setActiveTab('manage-jobs'); }}
            />
          )}

          {activeTab === 'manage-jobs' && (
            <ManageJobs user={user} onViewApplicants={handleViewJobApplicants} />
          )}

          {activeTab === 'job-applicants' && (
            <ViewApplicants
              user={user}
              jobId={selectedJobId}
              onBack={() => setActiveTab('manage-jobs')}
            />
          )}

          {activeTab === 'all-applicants' && (
            <AllApplicants user={user} onViewJobApplicants={handleViewJobApplicants} />
          )}

          {activeTab === 'services' && <ManageServices user={user} />}
          {activeTab === 'products' && <ManageProducts user={user} />}

        </div>{/* end page-body */}
      </div>{/* end emp-content */}

      <style>{`
        .emp-layout {
          display: flex; min-height: 100vh; background: #F3F4F6;
        }

        .emp-content {
          flex: 1; margin-left: 250px; min-width: 0;
          display: flex; flex-direction: column;
        }

        /* ── Top bar ── */
        .topbar {
          position: sticky; top: 0; z-index: 50;
          background: white; border-bottom: 1px solid #E5E7EB;
          height: 62px; padding: 0 28px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .topbar-title { font-size: 16px; font-weight: 600; color: #111827; }
        .topbar-right  { display: flex; align-items: center; gap: 14px; }
        .company-label {
          font-size: 14px; font-weight: 500; color: #374151;
          max-width: 200px; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }

        /* Logo badge — top-right, clickable */
        .logo-badge {
          width: 40px; height: 40px; border-radius: 10px;
          border: 2px solid #E5E7EB; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          background: #EEF2FF; cursor: pointer; flex-shrink: 0;
          transition: border-color .2s, transform .15s;
        }
        .logo-badge:hover { border-color: #667eea; transform: scale(1.05); }
        .logo-badge-img { width:100%; height:100%; object-fit:cover; }
        .logo-badge-init { font-size:17px; font-weight:700; color:#667eea; }

        /* ── Page body ── */
        .page-body { flex: 1; padding: 28px 30px; }

        /* ── Dashboard stats ── */
        .page-body h1 { font-size: 26px; color: #111827; margin: 0 0 4px; }
        .subtitle { color: #6B7280; margin: 0 0 26px; font-size: 14px; }

        .stats-grid {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 18px; margin-bottom: 30px;
        }
        .stat-card {
          background: white; padding: 22px; border-radius: 14px;
          display: flex; align-items: center; gap: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          cursor: pointer; transition: transform .2s, box-shadow .2s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.09); }
        .sicon { font-size: 36px; }
        .stat-card h3 { font-size:26px; color:#111827; margin:0 0 2px; }
        .stat-card p  { color:#6B7280; font-size:13px; margin:0; }
        .stat-card.purple { border-left: 4px solid #667eea; }
        .stat-card.blue   { border-left: 4px solid #4facfe; }
        .stat-card.green  { border-left: 4px solid #43e97b; }
        .stat-card.orange { border-left: 4px solid #fa709a; }

        /* ── Quick actions ── */
        .qa-box h2 { margin: 0 0 14px; color: #111827; font-size: 17px; }
        .qa-grid {
          display: grid; grid-template-columns: repeat(4,1fr); gap: 14px;
        }
        .qa-btn {
          background: white; border: none; padding: 18px 12px;
          border-radius: 12px; cursor: pointer; font-size: 14px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          color: #374151; transition: all .2s;
        }
        .qa-btn span { font-size: 26px; }
        .qa-btn:hover { transform: translateY(-2px); color: #4338CA;
          box-shadow: 0 6px 18px rgba(102,126,234,0.18); }

        @media (max-width:1200px) {
          .stats-grid, .qa-grid { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width:768px) {
          .emp-content { margin-left: 0; }
          .stats-grid, .qa-grid { grid-template-columns: 1fr; }
          .page-body { padding: 16px; }
        }
      `}</style>
    </div>
  );
};

export default EmployerDashboard;