import React, { useState } from 'react';

const PostJob = ({ user, onJobPosted }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requiredSkills: '',
    experienceLevel: 'Entry Level',
    location: '',
    jobType: 'Job',
    workMode: 'Onsite',
    deadline: '',
    salaryRange: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Job posted successfully!');
        setFormData({
          title: '', description: '', requiredSkills: '',
          experienceLevel: 'Entry Level', location: '',
          jobType: 'Job', workMode: 'Onsite',
          deadline: '', salaryRange: ''
        });
        if (onJobPosted) setTimeout(onJobPosted, 1500);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (error) {
      setMessage('❌ Error posting job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-job-page">
      <h1>Post a New Job</h1>
      <p className="subtitle">Reach the best talent for your company</p>
      
      {message && <div className="message">{message}</div>}
      
      <form onSubmit={handleSubmit} className="job-form">
        <div className="form-group">
          <label>Job Title *</label>
          <input
            type="text" name="title" value={formData.title}
            onChange={handleChange} required
            placeholder="e.g., Senior Frontend Developer"
          />
        </div>
        
        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description" value={formData.description}
            onChange={handleChange} required rows="5"
            placeholder="Describe the role, responsibilities, and requirements..."
          />
        </div>
        
        <div className="form-group">
          <label>Required Skills (comma separated) *</label>
          <input
            type="text" name="requiredSkills"
            value={formData.requiredSkills} onChange={handleChange}
            placeholder="e.g., React, Node.js, SQL"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Experience Level</label>
            <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange}>
              <option>Entry Level</option>
              <option>Mid Level</option>
              <option>Senior Level</option>
              <option>Lead</option>
              <option>Manager</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Location *</label>
            <input
              type="text" name="location" value={formData.location}
              onChange={handleChange} required
              placeholder="e.g., Lahore, Pakistan"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Job Type</label>
            <select name="jobType" value={formData.jobType} onChange={handleChange}>
              <option value="Job">Full-time Job</option>
              <option value="Internship">Internship</option>
              <option value="Parttime">Part-time</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Work Mode</label>
            <select name="workMode" value={formData.workMode} onChange={handleChange}>
              <option value="Onsite">Onsite</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Application Deadline</label>
            <input
              type="date" name="deadline" value={formData.deadline}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>Salary Range</label>
            <input
              type="text" name="salaryRange" value={formData.salaryRange}
              onChange={handleChange}
              placeholder="e.g., $60,000 - $80,000"
            />
          </div>
        </div>
        
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Posting...' : 'POST JOB!!!'}
        </button>
      </form>

      <style>{`
        .post-job-page { max-width: 800px; }
        
        .post-job-page h1 { color: #333; margin-bottom: 5px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        
        .message {
          padding: 12px; border-radius: 8px; margin-bottom: 20px;
          background: #f0f9ff; border: 1px solid #bae6fd;
        }
        
        .job-form {
          background: white; padding: 30px;
          border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .form-group { margin-bottom: 20px; }
        
        .form-group label {
          display: block; margin-bottom: 8px;
          font-weight: 600; color: #333;
        }
        
        .form-group input, .form-group textarea, .form-group select {
          width: 100%; padding: 12px;
          border: 2px solid #e0e0e0; border-radius: 8px;
          font-size: 14px;
        }
        
        .form-group input:focus, .form-group textarea:focus,
        .form-group select:focus {
          outline: none; border-color: #667eea;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .submit-btn {
          background: linear-gradient(135deg, #667eea);
          color: white; border: none;
          padding: 14px 40px; border-radius: 8px;
          font-size: 16px; cursor: pointer;
          width: 100%;
        }
        
        .submit-btn:hover { transform: translateY(-2px); }
      `}</style>
    </div>
  );
};

export default PostJob;