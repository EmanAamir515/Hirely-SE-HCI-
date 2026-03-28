import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { 
  verifyToken, 
  register, 
  login, 
  getMe,
  postJob,
  getJobs,
  getCompanyJobs,
  applyForJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
  testRoute
} from './routes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
});

// ============= PUBLIC ROUTES =============
app.get('/api/test', testRoute);
app.post('/api/register', register);
app.post('/api/login', login);

// ============= PROTECTED ROUTES (require token) =============
app.get('/api/me', verifyToken, getMe);

// Job routes
app.post('/api/jobs', verifyToken, postJob);
app.get('/api/jobs', getJobs);  // Public - anyone can view jobs
app.get('/api/jobs/my', verifyToken, getCompanyJobs);
app.get('/api/jobs/:jobId/applicants', verifyToken, getJobApplicants);

// Application routes
app.post('/api/applications', verifyToken, applyForJob);
app.get('/api/applications/my', verifyToken, getMyApplications);
app.put('/api/applications/status', verifyToken, updateApplicationStatus);

// ============= 404 Handler =============
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// ============= Error Handler =============
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// ============= Start Server =============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});