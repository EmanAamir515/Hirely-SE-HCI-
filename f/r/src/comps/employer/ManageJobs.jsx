import React, { useState, useEffect } from 'react';
import JobCard from '../JobCard';

const ManageJobs = ({ user, onViewApplicants }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/jobs/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs || []); // Changed from data.data to data.jobs
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  if (loading) return <div className="loading">Loading jobs...</div>;

  return (
    <div className="manage-jobs-page">
      <h1>Manage Jobs</h1>
      <p className="subtitle">View and manage all your job postings</p>
      
      {jobs.length === 0 ? (
        <div className="empty-state">
          <p>📋 No jobs posted yet</p>
          <p>Start posting jobs to find the best talent!</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => (
            <JobCard 
              key={job.JobID}
              job={job}
              showApplyButton={false}
              userRole="Company"
              onViewApplicants={(jobId) => onViewApplicants(jobId)}
            />
          ))}
        </div>
      )}

      <style>{`
        .manage-jobs-page { max-width: 1100px; margin: 0 auto; }
        .manage-jobs-page h1 { 
          font-size: 28px; color: #1a1a2e; margin-bottom: 5px; 
        }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 15px; }
        
        .jobs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }
        
        .empty-state {
          text-align: center; padding: 80px 20px;
          background: white; border-radius: 16px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.06);
        }
        .empty-state p:first-child { 
          font-size: 48px; margin-bottom: 12px; 
        }
        .empty-state p:last-child { color: #888; font-size: 15px; }
        
        .loading { 
          text-align: center; padding: 80px; color: #666; font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default ManageJobs;