import React, { useState, useEffect } from 'react';

const ManageServices = ({ user }) => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [formData, setFormData] = useState({
    title: '', description: '', category: '', price: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchTerm, categoryFilter, services]);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/services/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setServices(data.data || []);
        setFilteredServices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const filterServices = () => {
    let filtered = [...services];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.Title.toLowerCase().includes(term) ||
        s.Description.toLowerCase().includes(term) ||
        s.Category.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter(s => s.Category === categoryFilter);
    }

    setFilteredServices(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      setShowForm(false);
      setFormData({ title: '', description: '', category: '', price: '' });
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const categories = ['All', ...new Set(services.map(s => s.Category).filter(Boolean))];

  return (
    <div className="services-page">
      <div className="page-header">
        <div>
          <h1>Services</h1>
          <p className="subtitle">Manage your company services</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Service'}
        </button>
      </div>

      {/* Stats */}
      <div className="service-stats">
        <div className="stat-card">
          <span className="stat-icon"></span>
          <div>
            <span className="stat-value">{services.length}</span>
            <span className="stat-label">Total Services</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon"></span>
          <div>
            <span className="stat-value">{categories.length - 1}</span>
            <span className="stat-label">Categories</span>
          </div>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="controls-bar">
        <div className="search-box">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select 
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="All">All Categories</option>
          {categories.filter(c => c !== 'All').map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="service-form">
          <h3>Add New Service</h3>
          <input
            type="text" placeholder="Service Title"
            value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Description" rows="3"
            value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div className="form-row">
            <input
              type="text" placeholder="Category"
              value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
            />
            <input
              type="number" placeholder="Price ($)" step="0.01"
              value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})}
            />
          </div>
          <button type="submit" className="save-btn">Save Service</button>
        </form>
      )}
      
      {/* Services Table */}
      <div className="table-container">
        <table className="services-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Category</th>
              <th>Price</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-table">
                  <div className="empty-state">
                    <p>No services found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredServices.map(service => (
                <tr key={service.ServiceID} className="service-row">
                  <td>
                    <span className="service-title">{service.Title}</span>
                  </td>
                  <td>
                    <span className="category-tag">{service.Category}</span>
                  </td>
                  <td>
                    <span className="price-tag">${service.Price}</span>
                  </td>
                  <td>
                    <span className="description-text">
                      {service.Description?.length > 80 
                        ? service.Description.substring(0, 80) + '...' 
                        : service.Description}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .services-page { max-width: 1000px; margin: 0 auto; }
        
        .page-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 24px;
        }
        
        .page-header h1 { 
          font-size: 28px; color: #111827; margin: 0 0 4px 0; 
        }
        
        .subtitle { color: #6B7280; margin: 0; font-size: 15px; }
        
        .add-btn {
          background: linear-gradient(135deg, #667eea );
          color: white; border: none; padding: 12px 24px;
          border-radius: 10px; cursor: pointer; font-size: 14px;
          font-weight: 500; transition: all 0.3s;
        }
        
        .add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        /* Stats */
        .service-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          flex: 1;
          background: linear-gradient(135deg, #6777be );
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(192, 121, 121, 0.06);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .stat-label {
          font-size: 13px;
          color: #3963b8;
        }

        /* Controls */
        .controls-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-box {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 2px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #667EEA;
        }

        .filter-select {
          padding: 12px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }
        
        .service-form {
          background: white; padding: 24px;
          border-radius: 12px; margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        
        .service-form h3 {
          margin: 0 0 16px 0; color: #111827;
        }
        
        .service-form input, .service-form textarea {
          width: 100%; padding: 12px; margin-bottom: 12px;
          border: 2px solid #E5E7EB; border-radius: 8px;
          font-size: 14px;
        }

        .service-form input:focus, .service-form textarea:focus {
          outline: none;
          border-color: #667EEA;
        }
        
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        
        .save-btn {
          background: #667eea; color: white; border: none;
          padding: 12px 24px; border-radius: 8px; cursor: pointer;
          width: 100%; font-size: 14px; font-weight: 500;
        }

        .save-btn:hover {
          background: #5a6fd6;
        }

        /* Table */
        .table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .services-table {
          width: 100%;
          border-collapse: collapse;
        }

        .services-table thead {
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        .services-table th {
          padding: 14px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .services-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .service-row:hover {
          background: #F9FAFB;
        }

        .service-row:last-child td {
          border-bottom: none;
        }

        .service-title {
          font-weight: 600;
          color: #111827;
          font-size: 14px;
        }

        .category-tag {
          padding: 4px 12px;
          background: #EEF2FF;
          color: #4338CA;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .price-tag {
          font-weight: 600;
          color: #059669;
          font-size: 14px;
        }

        .description-text {
          color: #6B7280;
          font-size: 13px;
        }

        .empty-table {
          text-align: center;
          padding: 60px 20px !important;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-state span {
          font-size: 48px;
        }

        .empty-state p {
          color: #9CA3AF;
          font-size: 15px;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default ManageServices;