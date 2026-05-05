import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000';

const EmployerProfile = ({ user, companyData, onUpdate, onLogoChange }) => {
  const [formData, setFormData] = useState({
    companyName: '', description: '', contactDetails: '', portfolio: ''
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState('');

  // ── Populate form from DB data ──
  useEffect(() => {
    if (!companyData) return;
    setFormData({
      companyName:    companyData.CompanyName    || companyData.companyName    || '',
      description:    companyData.Description    || companyData.description    || '',
      contactDetails: companyData.ContactDetails || companyData.contactDetails || '',
      portfolio:      companyData.Portfolio      || companyData.portfolio      || ''
    });
    // Logo comes from DB (full URL if already uploaded)
    if (companyData.Logo) {
      const url = companyData.Logo.startsWith('http')
        ? companyData.Logo
        : `${API}${companyData.Logo}`;
      setLogoPreview(url);
      if (onLogoChange) onLogoChange(url);
    }
  }, [companyData]);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Logo: upload immediately on file pick ──
  const handleLogoFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage('❌ Logo must be under 2 MB');
      return;
    }

    // Show preview instantly
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to backend
    setUploading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/company/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        const fullUrl = `${API}${data.logoUrl}`;
        setLogoPreview(fullUrl);
        if (onLogoChange) onLogoChange(fullUrl);
        setMessage('✅ Logo uploaded and saved!');
        if (onUpdate) onUpdate();          // refresh companyData stats
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch {
      setMessage('❌ Upload failed. Is the server running?');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    // Just clear locally — backend keeps the file but we clear the DB Logo field
    // by sending an empty string in a dedicated call (or do it on next profile save)
    setLogoPreview(null);
    if (onLogoChange) onLogoChange(null);
  };

  // ── Profile text fields ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/company/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Profile updated successfully!');
        if (onUpdate) onUpdate();
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch {
      setMessage('❌ Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const isSuccess = message.startsWith('✅');

  return (
    <div className="profile-page">
      <h1>Company Profile</h1>
      <p className="subtitle">Manage your company information visible to candidates</p>

      {message && (
        <div className={`msg ${isSuccess ? 'msg-ok' : 'msg-err'}`}>{message}</div>
      )}

      {/* ── Logo card ── */}
      <div className="logo-card">
        <div className="logo-left">
          <div className="logo-frame">
            {logoPreview
              ? <img src={logoPreview} alt="Company logo" />
              : <span className="logo-ph">
                  {formData.companyName?.charAt(0)?.toUpperCase() || '🏢'}
                </span>
            }
            {uploading && <div className="logo-overlay">⏳</div>}
          </div>
          <div className="logo-meta">
            <p className="logo-title">Company Logo</p>
            <p className="logo-hint">
              Saved to <code>b/public/uploads/logos/</code> and stored in your database.<br/>
              PNG · JPG · WEBP · max 2 MB
            </p>
          </div>
        </div>

        <div className="logo-btns">
          <label className={`btn-upload ${uploading ? 'disabled' : ''}`} htmlFor="logoFile">
            {uploading ? '⏳ Uploading…' : '📁 Upload Logo'}
          </label>
          <input
            id="logoFile" type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoFile}
            style={{ display:'none' }}
            disabled={uploading}
          />
          {logoPreview && !uploading && (
            <button className="btn-remove" onClick={removeLogo} type="button">✕ Remove</button>
          )}
        </div>
      </div>

      {/* ── Profile form ── */}
      <form onSubmit={handleSubmit} className="profile-form">

        <div className="form-group">
          <label>Company Name *</label>
          <input
            type="text" name="companyName"
            value={formData.companyName} onChange={handleChange}
            required placeholder="Enter company name"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description" rows="4"
            value={formData.description} onChange={handleChange}
            placeholder="Describe your company, mission, culture…"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact Details</label>
            <input
              type="text" name="contactDetails"
              value={formData.contactDetails} onChange={handleChange}
              placeholder="Email, phone, address…"
            />
            <small className="field-hint">
              Leave blank to keep the existing value
            </small>
          </div>
          <div className="form-group">
            <label>Portfolio / Website</label>
            <input
              type="url" name="portfolio"
              value={formData.portfolio} onChange={handleChange}
              placeholder="https://your-company.com"
            />
            <small className="field-hint">
              Leave blank to keep the existing value
            </small>
          </div>
        </div>

        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Changes'}
        </button>
      </form>

      <style>{`
        .profile-page { max-width: 820px; }
        .profile-page h1 { font-size: 26px; color: #111827; margin: 0 0 4px; }
        .subtitle { color: #6B7280; margin: 0 0 22px; font-size: 14px; }

        /* message */
        .msg { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: 14px; }
        .msg-ok  { background:#F0FDF4; border:1px solid #86EFAC; color:#166534; }
        .msg-err { background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; }

        /* logo card */
        .logo-card {
          background: white; border-radius: 14px;
          padding: 20px 24px; margin-bottom: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          display: flex; align-items: center;
          justify-content: space-between; gap: 20px; flex-wrap: wrap;
        }
        .logo-left { display: flex; align-items: center; gap: 18px; }
        .logo-frame {
          width: 82px; height: 82px; border-radius: 14px;
          border: 2px dashed #D1D5DB; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          background: #F9FAFB; flex-shrink: 0; position: relative;
        }
        .logo-frame img { width:100%; height:100%; object-fit:cover; }
        .logo-ph { font-size: 30px; color: #9CA3AF; }
        .logo-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
        }
        .logo-title { font-weight:600; color:#111827; margin:0 0 4px; font-size:14px; }
        .logo-hint  { font-size:12px; color:#9CA3AF; margin:0; line-height:1.5; }
        .logo-hint code { background:#F3F4F6; padding:1px 5px; border-radius:4px; font-size:11px; }
        .logo-btns  { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

        .btn-upload {
          padding: 9px 18px;
          background: linear-gradient(135deg,#667eea);
          color: white; border-radius: 8px; cursor: pointer;
          font-size: 13px; font-weight: 500; white-space: nowrap;
          transition: opacity .2s; user-select: none;
        }
        .btn-upload.disabled { opacity:.6; cursor:not-allowed; }
        .btn-upload:not(.disabled):hover { opacity:.88; }

        .btn-remove {
          padding: 9px 14px; border: 1.5px solid #E5E7EB;
          background: white; border-radius: 8px; cursor: pointer;
          font-size: 13px; color: #6B7280; transition: all .2s;
        }
        .btn-remove:hover { border-color:#EF4444; color:#EF4444; }

        /* form */
        .profile-form {
          background: white; padding: 28px; border-radius: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .form-group { margin-bottom: 20px; }
        .form-group label {
          display: block; margin-bottom: 7px;
          font-weight: 600; color: #374151; font-size: 13.5px;
        }
        .form-group input,
        .form-group textarea {
          width: 100%; padding: 11px 14px;
          border: 2px solid #E5E7EB; border-radius: 9px;
          font-size: 14px; font-family: inherit;
          transition: border-color .2s;
        }
        .form-group input:focus,
        .form-group textarea:focus { outline:none; border-color:#667eea; }

        .field-hint { display:block; margin-top:5px; font-size:11.5px; color:#9CA3AF; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

        .btn-save {
          width: 100%; padding: 13px;
          background: linear-gradient(135deg,#667eea);
          color: white; border: none; border-radius: 9px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          transition: opacity .2s;
        }
        .btn-save:hover:not(:disabled) { opacity:.9; }
        .btn-save:disabled { opacity:.6; cursor:not-allowed; }

        @media(max-width:600px){
          .form-row { grid-template-columns:1fr; }
          .logo-card { flex-direction:column; align-items:flex-start; }
        }
      `}</style>
    </div>
  );
};

export default EmployerProfile;