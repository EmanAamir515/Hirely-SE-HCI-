import React from 'react';

const JobCard = ({ job, onApply, showApplyButton = true, onViewApplicants, userRole }) => {
  const getStatusColor = (status) => {
    const colors = {
      'Open': '#10b981',
      'Closed': '#ef4444',
      'Pending': '#f59e0b',
      'Shortlisted': '#3b82f6',
      'Interview': '#8b5cf6',
      'Accepted': '#10b981',
      'Rejected': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getJobTypeIcon = (type) => {
    const icons = {
      'Job': '💼',
      'Internship': '🎓',
      'Parttime': '⏰'
    };
    return icons[type] || '📋';
  };

  const getWorkModeIcon = (mode) => {
    const icons = {
      'Remote': '🏠',
      'Onsite': '🏢',
      'Hybrid': '🔄'
    };
    return icons[mode] || '📍';
  };

  const getDaysAgo = (dateString) => {
    if (!dateString) return '';
    const posted = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - posted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return posted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`job-card ${job.Status === 'Closed' ? 'closed' : ''}`}>
      {/* Header Section */}
      <div className="job-card-header">
        <div className="company-info">
          <div className="company-logo">
            {job.CompanyName ? job.CompanyName.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <h3 className="job-title">{job.Title}</h3>
            {job.CompanyName && (
              <p className="company-name">{job.CompanyName}</p>
            )}
          </div>
        </div>
        
        <div className="job-badges">
          <span className="badge job-type" title="Job Type">
            {getJobTypeIcon(job.JobType)} {job.JobType}
          </span>
          <span 
            className="badge status"
            style={{ backgroundColor: getStatusColor(job.Status), color: 'white' }}
          >
            {job.Status}
          </span>
        </div>
      </div>

      {/* Meta Information */}
      <div className="job-meta">
        <span className="meta-item" title="Location">
          📍 {job.Location || 'Not specified'}
        </span>
        <span className="meta-item" title="Work Mode">
          {getWorkModeIcon(job.WorkMode)} {job.WorkMode}
        </span>
        {job.ExperienceLevel && (
          <span className="meta-item" title="Experience Level">
            🎯 {job.ExperienceLevel}
          </span>
        )}
        {job.SalaryRange && (
          <span className="meta-item" title="Salary Range">
            💰 {job.SalaryRange}
          </span>
        )}
      </div>

      {/* Description */}
      {job.Description && (
        <p className="job-description">
          {job.Description.length > 200 
            ? `${job.Description.substring(0, 200)}...` 
            : job.Description}
        </p>
      )}

      {/* Skills Section */}
      {job.RequiredSkills && (
        <div className="skills-section">
          <strong>Required Skills:</strong>
          <div className="skills-list">
            {job.RequiredSkills.split(',').map((skill, index) => (
              <span key={index} className="skill-tag">
                {skill.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Section */}
      <div className="job-card-footer">
        <div className="footer-left">
          {job.Deadline && (
            <span className="deadline-info" title="Application Deadline">
              📅 Deadline: {new Date(job.Deadline).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          )}
          {job.CreatedAt && (
            <span className="posted-info" title="Posted Date">
              🕒 Posted {getDaysAgo(job.CreatedAt)}
            </span>
          )}
          {job.ApplicantCount !== undefined && (
            <span className="applicant-count" title="Number of Applicants">
              👥 {job.ApplicantCount} applicant{job.ApplicantCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="footer-actions">
          {/* For Candidates: Apply Button */}
          {showApplyButton && userRole === 'Candidate' && job.Status === 'Open' && (
            <button 
              className="apply-btn"
              onClick={() => onApply && onApply(job)}
            >
              ✨ Apply Now
            </button>
          )}

          {/* For Employers: View Applicants Button */}
          {userRole === 'Company' && onViewApplicants && (
            <button 
              className="view-applicants-btn"
              onClick={() => onViewApplicants(job.JobID)}
            >
              👥 View Applicants
            </button>
          )}

          {/* Already Applied Badge */}
          {job.hasApplied && (
            <span className="applied-badge">
              ✅ Applied
            </span>
          )}

          {/* Closed Badge */}
          {job.Status === 'Closed' && (
            <span className="closed-badge">
              🔒 Closed
            </span>
          )}
        </div>
      </div>

      <style>{`
        .job-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .job-card:hover {
          border-color: #667eea;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
          transform: translateY(-2px);
        }

        .job-card.closed {
          opacity: 0.7;
          background: #f9fafb;
        }

        /* Header */
        .job-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .company-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .company-logo {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          color: white;
          flex-shrink: 0;
        }

        .job-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0 0 4px 0;
        }

        .company-name {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .job-badges {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge.job-type {
          background: #e0e7ff;
          color: #4338ca;
        }

        .badge.status {
          padding: 4px 12px;
        }

        /* Meta */
        .job-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .meta-item {
          font-size: 13px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Description */
        .job-description {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        /* Skills */
        .skills-section {
          margin-bottom: 16px;
        }

        .skills-section strong {
          display: block;
          font-size: 13px;
          color: #374151;
          margin-bottom: 8px;
        }

        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .skill-tag {
          background: #f3f4f6;
          color: #4b5563;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .skill-tag:hover {
          background: #e5e7eb;
        }

        /* Footer */
        .job-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }

        .footer-left {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
        }

        .deadline-info,
        .posted-info,
        .applicant-count {
          font-size: 12px;
          color: #9ca3af;
        }

        .deadline-info {
          color: #ef4444;
          font-weight: 500;
        }

        .footer-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .apply-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .apply-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .view-applicants-btn {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .view-applicants-btn:hover {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
        }

        .applied-badge {
          background: #dcfce7;
          color: #166534;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .closed-badge {
          background: #fee2e2;
          color: #991b1b;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .job-card-header {
            flex-direction: column;
            gap: 12px;
          }

          .job-badges {
            width: 100%;
          }

          .job-card-footer {
            flex-direction: column;
            gap: 12px;
          }

          .footer-left {
            width: 100%;
          }

          .footer-actions {
            width: 100%;
          }

          .apply-btn,
          .view-applicants-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default JobCard;