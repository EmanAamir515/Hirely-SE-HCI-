import React, { useState, useEffect } from 'react';

const ManageProducts = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    productName: '', description: '', price: '', stockQuantity: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/products/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
        setFilteredProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const filterProducts = () => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredProducts(
      products.filter(p => 
        p.ProductName.toLowerCase().includes(term) ||
        p.Description.toLowerCase().includes(term)
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      setShowForm(false);
      setFormData({ productName: '', description: '', price: '', stockQuantity: '' });
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="subtitle">Manage your company products</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Product'}
        </button>
      </div>

      {/* Stats */}
      <div className="product-stats">
        <div className="stat-card">
          <span className="stat-icon"></span>
          <div>
            <span className="stat-value">{products.length}</span>
            <span className="stat-label">Total Products</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon"></span>
          <div>
            <span className="stat-value">
              {products.reduce((sum, p) => sum + (p.StockQuantity || 0), 0)}
            </span>
            <span className="stat-label">Total Stock</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-box">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="product-form">
          <h3>Add New Product</h3>
          <input
            type="text" placeholder="Product Name" required
            value={formData.productName} onChange={(e) => setFormData({...formData, productName: e.target.value})}
          />
          <textarea
            placeholder="Description" rows="3"
            value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div className="form-row">
            <input
              type="number" placeholder="Price ($)" step="0.01"
              value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})}
            />
            <input
              type="number" placeholder="Stock Quantity"
              value={formData.stockQuantity} onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
            />
          </div>
          <button type="submit" className="save-btn">Save Product</button>
        </form>
      )}
      
      {/* Products Table */}
      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Description</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-table">
                  <div className="empty-state">
                    <span></span>
                    <p>No products found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => (
                <tr key={product.ProductID} className="product-row">
                  <td>
                    <span className="product-name">{product.ProductName}</span>
                  </td>
                  <td>
                    <span className="description-text">
                      {product.Description?.length > 60 
                        ? product.Description.substring(0, 60) + '...' 
                        : product.Description}
                    </span>
                  </td>
                  <td>
                    <span className="price-tag">${product.Price}</span>
                  </td>
                  <td>
                    <span className={`stock-badge ${product.StockQuantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {product.StockQuantity > 0 ? product.StockQuantity : 'Out of Stock'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-indicator ${product.StockQuantity > 0 ? 'active' : 'inactive'}`}>
                      {product.StockQuantity > 0 ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .products-page { max-width: 1000px; margin: 0 auto; }
        
        .page-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 24px;
        }
        
        .page-header h1 { 
          font-size: 28px; color: #111827; margin: 0 0 4px 0; 
        }
        
        .subtitle { color: #6B7280; margin: 0; font-size: 15px; }
        
        .add-btn {
          background: linear-gradient(135deg, #713ad8 );
          color: white; border: none; padding: 12px 24px;
          border-radius: 10px; cursor: pointer; font-size: 14px;
          font-weight: 500; transition: all 0.3s;
        }
        
        .add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        /* Stats */
        .product-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          flex: 1;
          background: blue;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon { font-size: 32px; }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .stat-label {
          font-size: 13px;
          color: #2e68dc;
        }

        /* Search */
        .search-box {
          position: relative;
          margin-bottom: 16px;
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
        
        .product-form {
          background: white; padding: 24px;
          border-radius: 12px; margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .product-form h3 {
          margin: 0 0 16px 0; color: #111827;
        }
        
        .product-form input, .product-form textarea {
          width: 100%; padding: 12px; margin-bottom: 12px;
          border: 2px solid #E5E7EB; border-radius: 8px;
          font-size: 14px;
        }

        .product-form input:focus, .product-form textarea:focus {
          outline: none;
          border-color: #667EEA;
        }
        
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        
        .save-btn {
          background: #713ad8; color: white; border: none;
          padding: 12px 24px; border-radius: 8px; cursor: pointer;
          width: 100%; font-size: 14px; font-weight: 500;
        }

        .save-btn:hover { background: #5a6fd6; }

        /* Table */
        .table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
        }

        .products-table thead {
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        .products-table th {
          padding: 14px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .products-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }

        .product-row:hover { background: #F9FAFB; }
        .product-row:last-child td { border-bottom: none; }

        .product-name {
          font-weight: 600;
          color: #111827;
          font-size: 14px;
        }

        .description-text {
          color: #6B7280;
          font-size: 13px;
        }

        .price-tag {
          font-weight: 600;
          color: #1c75a4;
          font-size: 14px;
        }

        .stock-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .stock-badge.in-stock {
          background: #abccdd;
          color: #225e7f;
        }

        .stock-badge.out-of-stock {
          background: #FEE2E2;
          color: #991B1B;
        }

        .status-indicator {
          font-size: 13px;
          font-weight: 500;
        }

        .status-indicator.active { color: #059669; }
        .status-indicator.inactive { color: #DC2626; }

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

        .empty-state span { font-size: 48px; }
        .empty-state p { color: #9CA3AF; font-size: 15px; margin: 0; }
      `}</style>
    </div>
  );
};

export default ManageProducts;