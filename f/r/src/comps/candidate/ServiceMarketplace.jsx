import React, { useState, useEffect } from 'react';

const ServiceMarketplace = ({ user }) => {
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('services');
  const [search, setSearch] = useState('');
  const [requesting, setRequesting] = useState(null);
  const [msg, setMsg] = useState({ id: null, type: '', text: '' });

  useEffect(() => { fetchMarketplace(); }, []);

  const fetchMarketplace = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('http://localhost:5000/api/marketplace', { headers });
      const data = await res.json();
      if (data.success) {
        setServices(data.services || []);
        setProducts(data.products || []);
      }
    } catch (_) {} finally { setLoading(false); }
  };

  const handleRequest = async (serviceId) => {
    setRequesting(serviceId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/service-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, message: 'Interested in your service.' })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ id: serviceId, type: 'success', text: 'Request sent!' });
      } else {
        setMsg({ id: serviceId, type: 'error', text: data.message || 'Failed' });
      }
    } catch (_) {
      setMsg({ id: serviceId, type: 'error', text: 'Network error' });
    } finally {
      setRequesting(null);
      setTimeout(() => setMsg({ id: null, type: '', text: '' }), 3000);
    }
  };

  const catColors = {
    Design: '#EDE9FE', Development: '#DBEAFE', Marketing: '#FCE7F3',
    Writing: '#FEF3C7', Consulting: '#D1FAE5', Default: '#F1F5F9'
  };
  const catText = {
    Design: '#5B21B6', Development: '#1D4ED8', Marketing: '#9D174D',
    Writing: '#92400E', Consulting: '#065F46', Default: '#475569'
  };

  const q = search.toLowerCase();
  const filteredServices = services.filter(s =>
    !q || s.Title?.toLowerCase().includes(q) || s.Category?.toLowerCase().includes(q) || s.CompanyName?.toLowerCase().includes(q)
  );
  const filteredProducts = products.filter(p =>
    !q || p.ProductName?.toLowerCase().includes(q) || p.CompanyName?.toLowerCase().includes(q)
  );

  const current = tab === 'services' ? filteredServices : filteredProducts;

  return (
    <div className="sm-root">
      {/* Header */}
      <div className="sm-header">
        <div>
          <h2>Service Marketplace</h2>
          <p>Discover services and products offered by companies on Hirely</p>
        </div>
      </div>

      {/* Search */}
      <div className="sm-search-bar">
        <span>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab === 'services' ? 'services' : 'products'}…`}
        />
        {search && <button className="sm-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Tabs */}
      <div className="sm-tabs">
        <button
          className={`sm-tab ${tab === 'services' ? 'active' : ''}`}
          onClick={() => setTab('services')}
        >
          Services
          <span className="sm-tab-count">{services.length}</span>
        </button>
        <button
          className={`sm-tab ${tab === 'products' ? 'active' : ''}`}
          onClick={() => setTab('products')}
        >
           Products
          <span className="sm-tab-count">{products.length}</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="sm-loading">
          {[1,2,3,4].map(i => <div key={i} className="sm-skeleton" />)}
        </div>
      ) : current.length === 0 ? (
        <div className="sm-empty">
          <span>{tab === 'services' ? '🛠️' : '📦'}</span>
          <p>{search ? 'No results found for your search.' : `No ${tab} available yet.`}</p>
        </div>
      ) : (
        <div className="sm-grid">
          {tab === 'services' ? (
            filteredServices.map(s => {
              const catKey = Object.keys(catColors).find(k => s.Category?.includes(k)) || 'Default';
              return (
                <div key={s.ServiceID} className="sm-card">
                  <div className="sm-card-top">
                    <div className="sm-company-logo">
                      {(s.CompanyName || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="sm-card-info">
                      <h4 className="sm-card-title">{s.Title}</h4>
                      <span className="sm-company-name">{s.CompanyName}</span>
                    </div>
                    {s.Category && (
                      <span
                        className="sm-cat-badge"
                        style={{ background: catColors[catKey], color: catText[catKey] }}
                      >
                        {s.Category}
                      </span>
                    )}
                  </div>

                  {s.Description && (
                    <p className="sm-desc">
                      {s.Description.length > 100 ? s.Description.slice(0, 100) + '…' : s.Description}
                    </p>
                  )}

                  <div className="sm-card-footer">
                    <span className="sm-price">
                      {s.Price != null ? `$${parseFloat(s.Price).toLocaleString()}` : 'Contact for pricing'}
                    </span>
                    <div className="sm-actions">
                      {msg.id === s.ServiceID && msg.text ? (
                        <span className={`sm-inline-msg ${msg.type}`}>{msg.text}</span>
                      ) : (
                        <button
                          className="sm-request-btn"
                          onClick={() => handleRequest(s.ServiceID)}
                          disabled={requesting === s.ServiceID}
                        >
                          {requesting === s.ServiceID ? '⏳' : ' Request'}
                        </button>
                      )}
                      {s.ContactEmail && (
                        <a
                          className="sm-contact-btn"
                          href={`mailto:${s.ContactEmail}?subject=Inquiry: ${s.Title}`}
                        >
                           Contact
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            filteredProducts.map(p => (
              <div key={p.ProductID} className="sm-card">
                <div className="sm-card-top">
                  <div className="sm-company-logo">
                    {(p.CompanyName || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="sm-card-info">
                    <h4 className="sm-card-title">{p.ProductName}</h4>
                    <span className="sm-company-name">{p.CompanyName}</span>
                  </div>
                  {p.StockQuantity !== undefined && (
                    <span className={`sm-stock-badge ${p.StockQuantity > 0 ? 'in' : 'out'}`}>
                      {p.StockQuantity > 0 ? `${p.StockQuantity} in stock` : 'Out of stock'}
                    </span>
                  )}
                </div>

                {p.Description && (
                  <p className="sm-desc">
                    {p.Description.length > 100 ? p.Description.slice(0, 100) + '…' : p.Description}
                  </p>
                )}

                <div className="sm-card-footer">
                  <span className="sm-price">
                    {p.Price != null ? `$${parseFloat(p.Price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Price on request'}
                  </span>
                  <button className="sm-request-btn" disabled>
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        .sm-root { display: flex; flex-direction: column; gap: 16px; }
        .sm-header h2 { font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .sm-header p  { color: #64748B; margin: 0; font-size: 14px; }

        /* Search */
        .sm-search-bar {
          display: flex; align-items: center; gap: 10px;
          background: #fff; border: 1.5px solid #E2E8F0;
          border-radius: 10px; padding: 0 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          transition: border-color 0.15s;
        }
        .sm-search-bar:focus-within { border-color: #667eea; }
        .sm-search-bar span  { font-size: 16px; color: #94A3B8; }
        .sm-search-bar input {
          flex: 1; padding: 11px 0; border: none; background: transparent;
          font-size: 14px; color: #1E293B; font-family: inherit;
        }
        .sm-search-bar input:focus { outline: none; }
        .sm-clear {
          background: none; border: none; cursor: pointer;
          color: #94A3B8; font-size: 14px; padding: 4px; transition: color 0.15s;
        }
        .sm-clear:hover { color: #475569; }

        /* Tabs */
        .sm-tabs { display: flex; gap: 8px; }
        .sm-tab {
          padding: 9px 20px; border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          background: #F8FAFC; color: #475569;
          font-size: 14px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; display: flex; align-items: center; gap: 8px;
        }
        .sm-tab:hover  { border-color: #667eea; color: #4338CA; }
        .sm-tab.active { background: #EEF2FF; color: #4338CA; border-color: #C7D2FE; font-weight: 600; }
        .sm-tab-count {
          background: #C7D2FE; color: #4338CA;
          border-radius: 10px; padding: 1px 7px; font-size: 11px; font-weight: 700;
        }
        .sm-tab.active .sm-tab-count { background: #4338CA; color: #fff; }

        /* Loading / Empty */
        .sm-loading { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .sm-skeleton {
          height: 160px; border-radius: 14px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .sm-empty { text-align: center; padding: 60px 0; color: #94A3B8; }
        .sm-empty span { font-size: 48px; display: block; margin-bottom: 12px; }
        .sm-empty p    { font-size: 15px; margin: 0; }

        /* Grid & Cards */
        .sm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .sm-card {
          background: #fff; border-radius: 14px;
          padding: 20px 22px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          display: flex; flex-direction: column; gap: 12px;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .sm-card:hover { border-color: #C7D2FE; box-shadow: 0 6px 20px rgba(102,126,234,0.1); transform: translateY(-1px); }

        .sm-card-top { display: flex; align-items: center; gap: 12px; }
        .sm-company-logo {
          width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, #667eea);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 17px;
        }
        .sm-card-info { flex: 1; min-width: 0; }
        .sm-card-title   { font-size: 15px; font-weight: 600; color: #1E293B; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sm-company-name { font-size: 12px; color: #64748B; }
        .sm-cat-badge {
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
        }
        .sm-stock-badge {
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
        }
        .sm-stock-badge.in  { background: #DCFCE7; color: #166534; }
        .sm-stock-badge.out { background: #FEE2E2; color: #991B1B; }

        .sm-desc { font-size: 13px; color: #475569; line-height: 1.5; margin: 0; flex: 1; }

        .sm-card-footer {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
          padding-top: 12px; border-top: 1px solid #F1F5F9;
          margin-top: auto;
        }
        .sm-price { font-size: 16px; font-weight: 700; color: #0F172A; }
        .sm-actions { display: flex; gap: 8px; }

        .sm-request-btn {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea );
          color: #fff; border: none; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s;
        }
        .sm-request-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sm-request-btn:not(:disabled):hover { opacity: 0.88; }

        .sm-contact-btn {
          padding: 8px 14px;
          background: #F1F5F9; color: #475569;
          border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none;
          transition: all 0.15s;
        }
        .sm-contact-btn:hover { background: #E2E8F0; }

        .sm-inline-msg {
          font-size: 13px; font-weight: 500; padding: 6px 12px; border-radius: 8px;
        }
        .sm-inline-msg.success { background: #DCFCE7; color: #166534; }
        .sm-inline-msg.error   { background: #FEE2E2; color: #991B1B; }

        @media (max-width: 768px) { .sm-grid { grid-template-columns: 1fr; } .sm-loading { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default ServiceMarketplace;