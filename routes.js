import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getPool, sql } from './db.js';

// ─── File path helpers (needed for ES modules) ───
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Multer: save logos to  b/public/uploads/logos/ ───
const logoDir = path.join(__dirname, 'public', 'uploads', 'logos');
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `company_${req.user.userId}_${Date.now()}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },          // 2 MB
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPG / PNG / WEBP allowed'), ok);
  }
});

// ─── JWT helpers ───
const generateToken = (userId, email, role) =>
  jwt.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const pool = getPool();

    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const existing = await pool.request()
      .input('Email', sql.NVarChar(100), email)
      .query('SELECT 1 FROM Users WHERE Email = @Email');
    if (existing.recordset.length)
      return res.status(400).json({ success: false, message: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.request()
      .input('Name',     sql.NVarChar(100), name)
      .input('Email',    sql.NVarChar(100), email)
      .input('PassHire', sql.NVarChar(120), hash)
      .input('Phone',    sql.NVarChar(20),  phone || null)
      .input('Role',     sql.NVarChar(20),  role)
      .query(`INSERT INTO Users (Name,Email,PassHire,Phone,Role)
              OUTPUT INSERTED.UserID, INSERTED.Name, INSERTED.Email, INSERTED.Role
              VALUES (@Name,@Email,@PassHire,@Phone,@Role)`);

    const u = result.recordset[0];
    if (role === 'Candidate')
      await pool.request().input('ID', sql.Int, u.UserID)
        .query(`INSERT INTO Candidates (CandidateID,Education,Experience) VALUES(@ID,'','')`);
    else if (role === 'Company')
      await pool.request().input('ID', sql.Int, u.UserID).input('N', sql.NVarChar(150), name)
        .query(`INSERT INTO Companies (CompanyID,CompanyName) VALUES(@ID,@N)`);

    const token = generateToken(u.UserID, u.Email, u.Role);
    res.status(201).json({ success: true, message: 'Registration successful', token,
      user: { id: u.UserID, name: u.Name, email: u.Email, role: u.Role } });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const pool = getPool();
    if (!email || !password || !role)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const result = await pool.request()
      .input('Email', sql.NVarChar(100), email)
      .query('SELECT * FROM Users WHERE Email = @Email');
    const user = result.recordset[0];
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.Role !== role) return res.status(401).json({ success: false,
      message: `This account is registered as ${user.Role}` });

    const ok = await bcrypt.compare(password, user.PassHire);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user.UserID, user.Email, user.Role);
    res.json({ success: true, message: 'Login successful', token,
      user: { id: user.UserID, name: user.Name, email: user.Email, role: user.Role } });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('UID', sql.Int, req.user.userId)
      .query('SELECT UserID,Name,Email,Phone,Role FROM Users WHERE UserID=@UID');
    if (!r.recordset.length) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success: true, user: r.recordset[0] });
  } catch { res.status(500).json({ success:false, message:'Server error' }); }
};

// ════════════════════════════════════════
//  COMPANY PROFILE
// ════════════════════════════════════════
export const getCompanyProfile = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('uid', sql.Int, req.user.userId).query(`
      SELECT c.*, u.Name, u.Email, u.Phone,
        (SELECT COUNT(*) FROM Jobs        WHERE CompanyID=c.CompanyID AND Status='Open') AS activeJobs,
        (SELECT COUNT(*) FROM Applications a JOIN Jobs j ON a.JobID=j.JobID
                             WHERE j.CompanyID=c.CompanyID)                             AS totalApplicants,
        (SELECT COUNT(*) FROM Services   WHERE CompanyID=c.CompanyID)                   AS servicesCount,
        (SELECT COUNT(*) FROM Products   WHERE CompanyID=c.CompanyID)                   AS productsCount
      FROM Companies c JOIN Users u ON c.CompanyID=u.UserID
      WHERE c.CompanyID=@uid`);
    res.json({ success: true, data: r.recordset[0] || null });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ── Logo upload: saves file to disk, stores path in DB ──
export const uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });

    // URL path the frontend can use  e.g.  /uploads/logos/company_2_123.jpg
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    const pool = getPool();
    await pool.request()
      .input('uid',  sql.Int,          req.user.userId)
      .input('logo', sql.NVarChar(255), logoUrl)
      .query('UPDATE Companies SET Logo=@logo WHERE CompanyID=@uid');

    res.json({ success: true, logoUrl });
  } catch (err) {
    console.error('uploadLogo:', err);
    res.status(500).json({ success:false, message:err.message });
  }
};

// ── Update profile — COALESCE keeps old value when new value is blank ──
export const updateCompanyProfile = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const { companyName, description, contactDetails, portfolio } = req.body;

    await pool.request()
      .input('uid',            sql.Int,           uid)
      .input('companyName',    sql.NVarChar(150),  companyName    || null)
      .input('description',    sql.NVarChar(sql.MAX), description || null)
      .input('contactDetails', sql.NVarChar(255),  contactDetails || null)
      .input('portfolio',      sql.NVarChar(sql.MAX), portfolio   || null)
      .query(`
        IF EXISTS (SELECT 1 FROM Companies WHERE CompanyID=@uid)
          UPDATE Companies SET
            CompanyName    = COALESCE(NULLIF(@companyName,''),    CompanyName),
            Description    = COALESCE(NULLIF(@description,''),   Description),
            ContactDetails = COALESCE(NULLIF(@contactDetails,''), ContactDetails),
            Portfolio      = COALESCE(NULLIF(@portfolio,''),      Portfolio)
          WHERE CompanyID=@uid
        ELSE
          INSERT INTO Companies (CompanyID,CompanyName,Description,ContactDetails,Portfolio)
          VALUES (@uid,@companyName,@description,@contactDetails,@portfolio)
      `);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('updateProfile:', err);
    res.status(500).json({ success:false, message:err.message });
  }
};

// ════════════════════════════════════════
//  JOBS
// ════════════════════════════════════════
export const updateJobStatus = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('jobId',  sql.Int,        req.params.jobId)
      .input('status', sql.NVarChar(50), req.body.status)
      .query('UPDATE Jobs SET Status=@status WHERE JobID=@jobId');
    res.json({ success:true, message:'Status updated' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

export const postJob = async (req, res) => {
  try {
    const { title, description, experienceLevel, location,
            jobType, workMode, deadline, requiredSkills, salaryRange } = req.body;
    const pool = getPool();
    if (!title || !jobType)
      return res.status(400).json({ success:false, message:'Title and job type required' });

    const r = await pool.request()
      .input('CompanyID',      sql.Int,           req.user.userId)
      .input('Title',          sql.NVarChar(150),  title)
      .input('Description',    sql.NVarChar(sql.MAX), description||'')
      .input('ExperienceLevel',sql.NVarChar(100),  experienceLevel||'')
      .input('Location',       sql.NVarChar(100),  location||'')
      .input('JobType',        sql.NVarChar(50),   jobType)
      .input('WorkMode',       sql.NVarChar(50),   workMode||'Onsite')
      .input('Deadline',       sql.Date,           deadline||null)
      .input('RequiredSkills', sql.NVarChar(sql.MAX), requiredSkills||'')
      .input('SalaryRange',    sql.NVarChar(100),  salaryRange||'')
      .query(`INSERT INTO Jobs (CompanyID,Title,Description,ExperienceLevel,Location,
                                JobType,WorkMode,Deadline,RequiredSkills,SalaryRange)
              OUTPUT INSERTED.JobID
              VALUES (@CompanyID,@Title,@Description,@ExperienceLevel,@Location,
                      @JobType,@WorkMode,@Deadline,@RequiredSkills,@SalaryRange)`);
    res.status(201).json({ success:true, message:'Job posted', jobId:r.recordset[0].JobID });
  } catch (err) {
    console.error('postJob:', err);
    res.status(500).json({ success:false, message:'Server error' });
  }
};

export const getJobs = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().query(`
      SELECT j.*, c.CompanyName FROM Jobs j
      JOIN Companies c ON j.CompanyID=c.CompanyID
      WHERE j.Status='Open' ORDER BY j.JobID DESC`);
    res.json({ success:true, jobs:r.recordset });
  } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
};

export const getCompanyJobs = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('CID', sql.Int, req.user.userId).query(`
      SELECT j.*, (SELECT COUNT(*) FROM Applications WHERE JobID=j.JobID) AS applicantCount
      FROM Jobs j WHERE j.CompanyID=@CID ORDER BY j.JobID DESC`);
    res.json({ success:true, jobs:r.recordset });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

export const getCompanyServicesAndProducts = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const [svc, prd] = await Promise.all([
      pool.request().input('cid', sql.Int, uid)
          .query('SELECT * FROM Services WHERE CompanyID=@cid ORDER BY ServiceID DESC'),
      pool.request().input('cid', sql.Int, uid)
          .query('SELECT * FROM Products WHERE CompanyID=@cid ORDER BY ProductID DESC')
    ]);
    res.json({ success:true, services:svc.recordset, products:prd.recordset });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ════════════════════════════════════════
//  SERVICES
// ════════════════════════════════════════
export const addService = async (req, res) => {
  try {
    const pool = getPool();
    const { title, description, category, price } = req.body;
    await pool.request()
      .input('cid',   sql.Int,           req.user.userId)
      .input('title', sql.NVarChar(150),  title)
      .input('desc',  sql.NVarChar(sql.MAX), description||'')
      .input('cat',   sql.NVarChar(100),  category||'')
      .input('price', sql.Decimal(10,2),  parseFloat(price)||0)
      .query(`INSERT INTO Services(CompanyID,Title,Description,Category,Price)
              VALUES(@cid,@title,@desc,@cat,@price)`);
    res.json({ success:true, message:'Service added' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

export const getCompanyServices = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('cid', sql.Int, req.user.userId)
      .query('SELECT * FROM Services WHERE CompanyID=@cid ORDER BY ServiceID DESC');
    res.json({ success:true, data:r.recordset });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ════════════════════════════════════════
//  PRODUCTS
// ════════════════════════════════════════
export const addProduct = async (req, res) => {
  try {
    const pool = getPool();
    const { productName, description, price, stockQuantity } = req.body;
    await pool.request()
      .input('cid',   sql.Int,           req.user.userId)
      .input('name',  sql.NVarChar(150),  productName)
      .input('desc',  sql.NVarChar(sql.MAX), description||'')
      .input('price', sql.Decimal(10,2),  parseFloat(price)||0)
      .input('stock', sql.Int,            parseInt(stockQuantity)||0)
      .query(`INSERT INTO Products(CompanyID,ProductName,Description,Price,StockQuantity)
              VALUES(@cid,@name,@desc,@price,@stock)`);
    res.json({ success:true, message:'Product added' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

export const getCompanyProducts = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('cid', sql.Int, req.user.userId)
      .query('SELECT * FROM Products WHERE CompanyID=@cid ORDER BY ProductID DESC');
    res.json({ success:true, data:r.recordset });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ════════════════════════════════════════
//  APPLICATIONS
// ════════════════════════════════════════
export const applyForJob = async (req, res) => {
  try {
    const { jobId, coverNote } = req.body;
    const pool = getPool();
    if (!jobId) return res.status(400).json({ success:false, message:'Job ID required' });

    const dup = await pool.request()
      .input('CID', sql.Int, req.user.userId).input('JID', sql.Int, jobId)
      .query('SELECT 1 FROM Applications WHERE CandidateID=@CID AND JobID=@JID');
    if (dup.recordset.length)
      return res.status(400).json({ success:false, message:'Already applied' });

    const r = await pool.request()
      .input('CID',  sql.Int,        req.user.userId)
      .input('JID',  sql.Int,        jobId)
      .input('note', sql.NVarChar(100), coverNote||'')
      .query(`INSERT INTO Applications(CandidateID,JobID,CoverNote)
              OUTPUT INSERTED.ApplicationID VALUES(@CID,@JID,@note)`);
    res.status(201).json({ success:true, message:'Applied', applicationId:r.recordset[0].ApplicationID });
  } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
};

export const getMyApplications = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('CID', sql.Int, req.user.userId).query(`
      SELECT a.*, j.Title, j.JobType, c.CompanyName FROM Applications a
      JOIN Jobs j ON a.JobID=j.JobID JOIN Companies c ON j.CompanyID=c.CompanyID
      WHERE a.CandidateID=@CID ORDER BY a.AppliedDate DESC`);
    res.json({ success:true, applications:r.recordset });
  } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
};

export const getJobApplicants = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request()
      .input('JID', sql.Int, req.params.jobId)
      .input('CID', sql.Int, req.user.userId)
      .query(`SELECT a.*, u.Name, u.Email, u.Phone, c.Education, c.Experience, c.CVPath
              FROM Applications a
              JOIN Candidates c ON a.CandidateID=c.CandidateID
              JOIN Users u ON c.CandidateID=u.UserID
              JOIN Jobs j ON a.JobID=j.JobID
              WHERE a.JobID=@JID AND j.CompanyID=@CID ORDER BY a.AppliedDate DESC`);
    res.json({ success:true, applicants:r.recordset });
  } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('AID',    sql.Int,        req.body.applicationId)
      .input('Status', sql.NVarChar(50), req.body.status)
      .query('UPDATE Applications SET Status=@Status WHERE ApplicationID=@AID');
    res.json({ success:true, message:'Status updated' });
  } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
};

export const getAllCompanyApplicants = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('CID', sql.Int, req.user.userId).query(`
      SELECT a.ApplicationID, a.Status, a.AppliedDate, a.CoverNote,
             u.Name AS CandidateName, u.Email, u.Phone,
             c.Education, c.Experience, c.CVPath,
             j.Title AS JobTitle, j.JobID, j.RequiredSkills
      FROM Applications a
      JOIN Candidates c ON a.CandidateID=c.CandidateID
      JOIN Users u ON c.CandidateID=u.UserID
      JOIN Jobs j ON a.JobID=j.JobID
      WHERE j.CompanyID=@CID ORDER BY a.AppliedDate DESC`);
    res.json({ success:true, applicants:r.recordset });
  } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
};

export const testRoute = (_req, res) => res.json({ message:'Hirely API is running!' });