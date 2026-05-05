import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';
import {
  verifyToken,
  upload,                        // multer instance
  register, login, getMe,
  getCompanyProfile, updateCompanyProfile, uploadCompanyLogo,
  postJob, getJobs, getCompanyJobs, updateJobStatus, editJob,
  getCompanyServicesAndProducts,
  addService, getCompanyServices,
  addProduct, getCompanyProducts,
  applyForJob, getMyApplications,
  getJobApplicants, updateApplicationStatus, getAllCompanyApplicants,
  testRoute,
  // Candidate 
  getCandidateProfile, updateCandidateProfile,
  addCandidateSkill, removeCandidateSkill, getCandidateStats,
  getJobsWithMatch, checkEligibility,
  getMarketplace, requestService,
  getNotifications, markAllNotificationsRead,
} from './routes.js';



dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ─── Middleware ───
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ─── DB ───
connectDB().catch(err => console.error('DB connection failed:', err));

// ════════════════════════════════════════
//  PUBLIC ROUTES
// ════════════════════════════════════════
app.get('/api/test', testRoute);
app.post('/api/register', register);
app.post('/api/login', login);
app.get('/api/jobs', getJobs);              // public job listing
app.get('/api/marketplace', getMarketplace); // public marketplace

// ════════════════════════════════════════
//  PROTECTED ROUTES
// ════════════════════════════════════════
app.get('/api/me', verifyToken, getMe);

// ── Company profile ──
app.get('/api/company/profile',        verifyToken, getCompanyProfile);
app.put('/api/company/update-profile', verifyToken, updateCompanyProfile);
app.post('/api/company/upload-logo',   verifyToken, upload.single('logo'), uploadCompanyLogo);

// ── Jobs (employer) ──
app.post('/api/jobs',              verifyToken, postJob);
app.get('/api/jobs/my',            verifyToken, getCompanyJobs);
app.put('/api/jobs/:jobId/status', verifyToken, updateJobStatus);
app.put('/api/jobs/:jobId',        verifyToken, editJob);
app.get('/api/jobs/:jobId/applicants', verifyToken, getJobApplicants);

// ── Jobs (candidate – with match %) ──
app.get('/api/jobs/search', verifyToken, getJobsWithMatch);

// ── Services & Products (employer) ──
app.get('/api/company/services-products', verifyToken, getCompanyServicesAndProducts);
app.post('/api/services',   verifyToken, addService);
app.get('/api/services/my', verifyToken, getCompanyServices);
app.post('/api/products',   verifyToken, addProduct);
app.get('/api/products/my', verifyToken, getCompanyProducts);

// ── Applications ──
app.post('/api/applications',        verifyToken, applyForJob);
app.get('/api/applications/my',      verifyToken, getMyApplications);
app.put('/api/applications/status',  verifyToken, updateApplicationStatus);
app.get('/api/applicants/all',       verifyToken, getAllCompanyApplicants);

// ── Candidate profile ──
app.get('/api/candidate/profile',          verifyToken, getCandidateProfile);
app.put('/api/candidate/profile',          verifyToken, updateCandidateProfile);
app.get('/api/candidate/stats',            verifyToken, getCandidateStats);
app.post('/api/candidate/skills',          verifyToken, addCandidateSkill);
app.delete('/api/candidate/skills/:skillId', verifyToken, removeCandidateSkill);

// ── Eligibility check ──
app.post('/api/eligibility/check', verifyToken, checkEligibility);

// ── Service marketplace ──
app.post('/api/service-requests', verifyToken, requestService);

// ── Notifications ──
app.get('/api/notifications',          verifyToken, getNotifications);
app.put('/api/notifications/read-all', verifyToken, markAllNotificationsRead);

// ════════════════════════════════════════
//  ERROR HANDLERS
// ════════════════════════════════════════
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// ════════════════════════════════════════
//  START
// ════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Logo uploads served at /uploads/logos/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});