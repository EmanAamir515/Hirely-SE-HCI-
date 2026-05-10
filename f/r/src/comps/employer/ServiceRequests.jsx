import React, { useState, useEffect } from 'react';

const ServiceRequests = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'service' | 'product'

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/service-requests/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    setActionLoading(requestId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/service-requests/${requestId}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ Handles DB values: 'Pending', 'Accepted', 'Rejected', 'Completed'
  const getStatusStyle = (status) => {
    const map = {
      pending:   { bg: '#FEF3C7', color: '#92400E' },
      accepted:  { bg: '#D1FAE5', color: '#065F46' },
      rejected:  { bg: '#FEE2E2', color: '#991B1B'},
      completed: { bg: '#DBEAFE', color: '#1D4ED8' },
    };
    return map[status?.toLowerCase()] || map.pending;
  };

  // ✅ Case-insensitive pending count
  const pendingCount = requests.filter(r => r.Status?.toLowerCase() === 'pending').length;

  const visible = filterType === 'all'
    ? requests
    : requests.filter(r => r.RequestType?.toLowerCase() === filterType);

  const svcCount = requests.filter(r => r.RequestType === 'service').length;
  const prdCount = requests.filter(r => r.RequestType === 'product').length;

  return (
    <div className="sr-root">
      {/* Header */}
      <div className="sr-header">
        <div>
          <h2>Service &amp; Product Requests</h2>
          <p>Manage incoming requests from users</p>
        </div>
        {pendingCount > 0 && (
          <span className="sr-badge">🔔 {pendingCount} Pending</span>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="sr-tabs">
        {[
          { key: 'all',     label: 'All',      count: requests.length },
          { key: 'service', label: 'Services', count: svcCount },
          { key: 'product', label: 'Products', count: prdCount },
        ].map(t => (
          <button
            key={t.key}
            className={`sr-tab ${filterType === t.key ? 'active' : ''}`}
            onClick={() => setFilterType(t.key)}
          >
            {t.label}
            <span className="sr-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sr-loading">
          {[1,2,3].map(i => <div key={i} className="sr-skeleton" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="sr-empty">
          <span>📭</span>
          <p>No {filterType === 'all' ? '' : filterType} requests yet</p>
        </div>
      ) : (
        <div className="sr-list">
          {visible.map(req => {
            const st = getStatusStyle(req.Status);
            // ✅ Use RequestDate (the actual DB column name)
            const dateStr = req.RequestDate
              ? new Date(req.RequestDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })
              : '—';
            const isPending   = req.Status?.toLowerCase() === 'pending';
            const isAccepted  = req.Status?.toLowerCase() === 'accepted';
            const isProduct   = req.RequestType === 'product';

            return (
              <div key={req.RequestID} className="sr-card">
                <div className="sr-card-left">
                  <div className={`sr-avatar ${isProduct ? 'product' : 'service'}`}>
                    {(req.RequesterName || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="sr-card-body">
                  <div className="sr-card-top">
                    <div>
                      <div className="sr-title-row">
                        <h4 className="sr-service-title">{req.ServiceTitle || 'Request'}</h4>
                        <span className={`sr-type-badge ${isProduct ? 'product' : 'service'}`}>
                          {isProduct ? 'Product' : 'Service'}
                        </span>
                      </div>
                      <span className="sr-requester">
                        Requested by <strong>{req.RequesterName}</strong>
                      </span>
                    </div>
                    <span className="sr-status" style={{ background: st.bg, color: st.color }}>
                      {st.icon} {req.Status}
                    </span>
                  </div>

                  {req.Message && (
                    <div className="sr-message">
                      💬 "{req.Message}"
                    </div>
                  )}

                  <div className="sr-meta">
                    <span> {dateStr}</span>
                    {req.RequesterEmail && <span>📧 {req.RequesterEmail}</span>}
                    {req.RequesterPhone && <span> {req.RequesterPhone}</span>}
                  </div>

                  {/* ✅ Case-insensitive status checks */}
                  {isPending && (
                    <div className="sr-actions">
                      <button
                        className="sr-accept-btn"
                        onClick={() => handleAction(req.RequestID, 'accept')}
                        disabled={actionLoading === req.RequestID}
                      >
                        {actionLoading === req.RequestID ? '⏳...' : '✅ Accept'}
                      </button>
                      <button
                        className="sr-reject-btn"
                        onClick={() => handleAction(req.RequestID, 'reject')}
                        disabled={actionLoading === req.RequestID}
                      >
                        {actionLoading === req.RequestID ? '⏳...' : '❌ Decline'}
                      </button>
                    </div>
                  )}

                  {isAccepted && (
                    <div className="sr-actions">
                      <button
                        className="sr-complete-btn"
                        onClick={() => handleAction(req.RequestID, 'complete')}
                        disabled={actionLoading === req.RequestID}
                      >
                        {actionLoading === req.RequestID ? '⏳...' : ' Mark Completed'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .sr-root { max-width: 800px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .sr-header { display: flex; align-items: center; justify-content: space-between; }
        .sr-header h2 { font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .sr-header p  { color: #64748B; margin: 0; font-size: 14px; }
        .sr-badge { background: #FEF3C7; color: #92400E; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }

        /* Tabs */
        .sr-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .sr-tab {
          padding: 7px 16px; border-radius: 20px; border: 1.5px solid #E2E8F0;
          background: #F8FAFC; color: #475569; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px;
        }
        .sr-tab:hover  { border-color: #667eea; color: #4338CA; }
        .sr-tab.active { background: #EEF2FF; color: #4338CA; border-color: #C7D2FE; font-weight: 600; }
        .sr-tab-count { background: #E0E7FF; color: #4338CA; border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 700; }

        /* Skeleton */
        .sr-loading { display: flex; flex-direction: column; gap: 12px; }
        .sr-skeleton {
          height: 120px; border-radius: 14px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .sr-empty { text-align: center; padding: 60px 0; color: #94A3B8; }
        .sr-empty span { font-size: 48px; display: block; margin-bottom: 12px; }
        .sr-empty p    { font-size: 15px; margin: 0; }

        /* Cards */
        .sr-list { display: flex; flex-direction: column; gap: 16px; }
        .sr-card {
          background: #fff; border-radius: 14px; padding: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06); display: flex; gap: 16px;
          transition: box-shadow 0.2s;
        }
        .sr-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.09); }

        .sr-avatar {
          width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 18px;
        }
        .sr-avatar.product { background: linear-gradient(135deg, #f093fb, #f5576c); }

        .sr-card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .sr-card-top  { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .sr-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
        .sr-service-title { font-size: 16px; font-weight: 600; color: #1E293B; margin: 0; }
        .sr-type-badge {
          padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 600;
        }
        .sr-type-badge.service { background: #EDE9FE; color: #5B21B6; }
        .sr-type-badge.product { background: #FCE7F3; color: #9D174D; }
        .sr-requester { font-size: 13px; color: #64748B; }
        .sr-status    { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }

        .sr-message {
          background: #F8FAFC; padding: 12px; border-radius: 8px;
          font-size: 13px; color: #475569; font-style: italic;
        }
        .sr-meta { display: flex; gap: 16px; flex-wrap: wrap; }
        .sr-meta span { font-size: 12px; color: #94A3B8; }

        .sr-actions { display: flex; gap: 8px; }
        .sr-accept-btn, .sr-reject-btn, .sr-complete-btn {
          padding: 8px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          border: none; transition: all 0.2s;
        }
        .sr-accept-btn   { background: #059669; color: #fff; }
        .sr-accept-btn:hover:not(:disabled)   { background: #047857; }
        .sr-reject-btn   { background: #FEE2E2; color: #991B1B; }
        .sr-reject-btn:hover:not(:disabled)   { background: #FECACA; }
        .sr-complete-btn { background: #667eea; color: #fff; }
        .sr-complete-btn:hover:not(:disabled) { background: #5a6fd6; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default ServiceRequests;