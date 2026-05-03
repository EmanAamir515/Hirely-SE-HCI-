import React, { useState, useEffect } from 'react';

const ServicesProducts = ({ user }) => {
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title: '', description: '', category: '', price: ''
  });
  const [productForm, setProductForm] = useState({
    productName: '', description: '', price: '', stockQuantity: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/company/services-products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setServices(data.services || []);
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addService = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(serviceForm)
      });
      const data = await response.json();
      if (data.success) {
        setShowServiceForm(false);
        setServiceForm({ title: '', description: '', category: '', price: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productForm)
      });
      const data = await response.json();
      if (data.success) {
        setShowProductForm(false);
        setProductForm({ productName: '', description: '', price: '', stockQuantity: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const filteredServices = services.filter(s => 
    !searchTerm || 
    s.Title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.Category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    !searchTerm || 
    p.ProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.Description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="services-products-page">
      <div className="page-header">
        <div>
          <h1>Services & Products</h1>
          <p className="subtitle">Manage your company services and products</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span>🛠️</span>
          <div>
            <span className="stat-value">{services.length}</span>
            <span className="stat-label">Services</span>
          </div>
        </div>
        <div className="stat-card">
          <span>📦</span>
          <div>
            <span className="stat-value">{products.length}</span>
            <span className="stat-label">Products</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeSubTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('services')}
        >
          🛠️ Services ({services.length})
        </button>
        <button 
          className={`tab ${activeSubTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('products')}
        >
          📦 Products ({products.length})
        </button>
      </div>

      {/* Search */}
      <div className="search-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          placeholder={`Search ${activeSubTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button 
          className="add-btn"
          onClick={() => {
            if (activeSubTab === 'services') setShowServiceForm(!showServiceForm);
            else setShowProductForm(!showProductForm);
          }}
        >
          {activeSubTab === 'services' 
            ? (showServiceForm ? '✕ Cancel' : '+ Add Service')
            : (showProductForm ? '✕ Cancel' : '+ Add Product')
          }
        </button>
      </div>

      {/* Service Form */}
      {activeSubTab === 'services' && showServiceForm && (
        <form onSubmit={addService} className="add-form">
          <h3>Add New Service</h3>
          <input
            type="text" placeholder="Service Title" required
            value={serviceForm.title}
            onChange={(e) => setServiceForm({...serviceForm, title: e.target.value})}
          />
          <textarea
            placeholder="Description" rows="3"
            value={serviceForm.description}
            onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
          />
          <div className="form-row">
            <input
              type="text" placeholder="Category"
              value={serviceForm.category}
              onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}
            />
            <input
              type="number" placeholder="Price ($)" step="0.01"
              value={serviceForm.price}
              onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})}
            />
          </div>
          <button type="submit" className="save-btn">Save Service</button>
        </form>
      )}

      {/* Product Form */}
      {activeSubTab === 'products' && showProductForm && (
        <form onSubmit={addProduct} className="add-form">
          <h3>Add New Product</h3>
          <input
            type="text" placeholder="Product Name" required
            value={productForm.productName}
            onChange={(e) => setProductForm({...productForm, productName: e.target.value})}
          />
          <textarea
            placeholder="Description" rows="3"
            value={productForm.description}
            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
          />
          <div className="form-row">
            <input
              type="number" placeholder="Price ($)" step="0.01"
              value={productForm.price}
              onChange={(e) => setProductForm({...productForm, price: e.target.value})}
            />
            <input
              type="number" placeholder="Stock Quantity"
              value={productForm.stockQuantity}
              onChange={(e) => setProductForm({...productForm, stockQuantity: e.target.value})}
            />
          </div>
          <button type="submit" className="save-btn">Save Product</button>
        </form>
      )}

      {/* Services Table */}
      {activeSubTab === 'services' && (
        <div className="table-container">
          <table>
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
                  <td colSpan="4" className="empty-cell">
                    <span>🛠️</span>
                    <p>No services found</p>
                    <small>Click "+ Add Service" to add your first service</small>
                  </td>
                </tr>
              ) : (
                filteredServices.map(service => (
                  <tr key={service.ServiceID}>
                    <td><strong>{service.Title}</strong></td>
                    <td><span className="badge">{service.Category}</span></td>
                    <td><span className="price">${service.Price}</span></td>
                    <td className="desc-cell">{service.Description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Products Table */}
      {activeSubTab === 'products' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-cell">
                    <span>📦</span>
                    <p>No products found</p>
                    <small>Click "+ Add Product" to add your first product</small>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.ProductID}>
                    <td><strong>{product.ProductName}</strong></td>
                    <td><span className="price">${product.Price}</span></td>
                    <td>
                      <span className={`stock ${product.StockQuantity > 0 ? 'in-stock' : 'out'}`}>
                        {product.StockQuantity > 0 ? product.StockQuantity : 'Out'}
                      </span>
                    </td>
                    <td className="desc-cell">{product.Description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .services-products-page { max-width: 1000px; }
        
        .page-header { margin-bottom: 24px; }
        .page-header h1 { font-size: 28px; color: #111827; margin: 0 0 4px 0; }
        .subtitle { color: #6B7280; margin: 0; font-size: 15px; }

        /* Stats */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-card span:first-child { font-size: 32px; }
        .stat-value { display: block; font-size: 24px; font-weight: 700; color: #111827; }
        .stat-label { font-size: 13px; color: #6B7280; }

        /* Tabs */
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          background: white;
          padding: 6px;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .tab {
          flex: 1;
          padding: 12px 20px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
          transition: all 0.2s;
        }

        .tab.active {
          background: #EEF2FF;
          color: #4338CA;
        }

        .tab:hover:not(.active) {
          background: #F3F4F6;
        }

        /* Search */
        .search-box {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
          background: white;
          padding: 8px 16px;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .search-input {
          flex: 1;
          border: none;
          padding: 8px;
          font-size: 14px;
          outline: none;
        }

        .add-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
        }

        .add-btn:hover {
          opacity: 0.9;
        }

        /* Form */
        .add-form {
          background: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .add-form h3 {
          margin: 0 0 16px 0;
          color: #111827;
        }

        .add-form input,
        .add-form textarea {
          width: 100%;
          padding: 10px;
          margin-bottom: 12px;
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
        }

        .add-form input:focus,
        .add-form textarea:focus {
          outline: none;
          border-color: #667EEA;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .save-btn {
          width: 100%;
          padding: 12px;
          background: #667EEA;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
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

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        th {
          padding: 14px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          padding: 14px 20px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 14px;
        }

        tr:hover td {
          background: #F9FAFB;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .badge {
          padding: 4px 10px;
          background: #EEF2FF;
          color: #4338CA;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .price {
          font-weight: 600;
          color: #059669;
        }

        .desc-cell {
          color: #6B7280;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stock {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .stock.in-stock {
          background: #D1FAE5;
          color: #065F46;
        }

        .stock.out {
          background: #FEE2E2;
          color: #991B1B;
        }

        .empty-cell {
          text-align: center;
          padding: 60px 20px !important;
          color: #9CA3AF;
        }

        .empty-cell span {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .empty-cell p {
          font-size: 16px;
          margin: 0 0 4px 0;
          font-weight: 500;
        }

        .empty-cell small {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default ServicesProducts;