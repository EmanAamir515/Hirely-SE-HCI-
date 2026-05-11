import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getPool, sql } from './db.js';

// ─── File path helpers ───
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Multer: save logos to public/uploads/logos/ ───
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
  limits: { fileSize: 2 * 1024 * 1024 },
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalise: support both old tokens (payload.id) and current tokens (payload.userId)
    const rawId = decoded.userId ?? decoded.id;
    const numericId = parseInt(rawId, 10);
    if (isNaN(numericId)) throw new Error('Invalid userId in token');
    req.user = { ...decoded, userId: numericId };
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
        (SELECT COUNT(*) FROM Jobs WHERE CompanyID=c.CompanyID AND Status='Open') AS activeJobs,
        (SELECT COUNT(*) FROM Applications a JOIN Jobs j ON a.JobID=j.JobID
                             WHERE j.CompanyID=c.CompanyID) AS totalApplicants,
        (SELECT COUNT(*) FROM Services WHERE CompanyID=c.CompanyID) AS servicesCount,
        (SELECT COUNT(*) FROM Products WHERE CompanyID=c.CompanyID) AS productsCount
      FROM Companies c JOIN Users u ON c.CompanyID=u.UserID
      WHERE c.CompanyID=@uid`);
    res.json({ success: true, data: r.recordset[0] || null });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

export const uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });
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

export const updateCompanyProfile = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const { companyName, description, contactDetails, portfolio } = req.body;
    await pool.request()
      .input('uid',            sql.Int,              uid)
      .input('companyName',    sql.NVarChar(150),     companyName    || null)
      .input('description',    sql.NVarChar(sql.MAX), description    || null)
      .input('contactDetails', sql.NVarChar(255),     contactDetails || null)
      .input('portfolio',      sql.NVarChar(sql.MAX), portfolio      || null)
      .query(`
        IF EXISTS (SELECT 1 FROM Companies WHERE CompanyID=@uid)
          UPDATE Companies SET
            CompanyName    = COALESCE(NULLIF(@companyName,''),    CompanyName),
            Description    = COALESCE(NULLIF(@description,''),    Description),
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
      .input('jobId',  sql.Int,          req.params.jobId)
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
      .input('CompanyID',       sql.Int,              req.user.userId)
      .input('Title',           sql.NVarChar(150),     title)
      .input('Description',     sql.NVarChar(sql.MAX), description     || '')
      .input('ExperienceLevel', sql.NVarChar(100),     experienceLevel || '')
      .input('Location',        sql.NVarChar(100),     location        || '')
      .input('JobType',         sql.NVarChar(50),      jobType)
      .input('WorkMode',        sql.NVarChar(50),      workMode        || 'Onsite')
      .input('Deadline',        sql.Date,              deadline        || null)
      .input('RequiredSkills',  sql.NVarChar(sql.MAX), requiredSkills  || '')
      .input('SalaryRange',     sql.NVarChar(100),     salaryRange     || '')
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
      WHERE j.Status='Open' AND (j.Deadline IS NULL OR j.Deadline >= CAST(GETDATE() AS DATE)) ORDER BY j.JobID DESC`);
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
      .input('cid',   sql.Int,              req.user.userId)
      .input('title', sql.NVarChar(150),     title)
      .input('desc',  sql.NVarChar(sql.MAX), description || '')
      .input('cat',   sql.NVarChar(100),     category    || '')
      .input('price', sql.Decimal(10,2),     parseFloat(price) || 0)
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
      .input('cid',   sql.Int,              req.user.userId)
      .input('name',  sql.NVarChar(150),     productName)
      .input('desc',  sql.NVarChar(sql.MAX), description    || '')
      .input('price', sql.Decimal(10,2),     parseFloat(price) || 0)
      .input('stock', sql.Int,               parseInt(stockQuantity) || 0)
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
// export const applyForJob = async (req, res) => {
//   try {
//     const { jobId, coverNote } = req.body;
//     const pool = getPool();
//     if (!jobId) return res.status(400).json({ success:false, message:'Job ID required' });
//     const dup = await pool.request()
//       .input('CID', sql.Int, req.user.userId).input('JID', sql.Int, jobId)
//       .query('SELECT 1 FROM Applications WHERE CandidateID=@CID AND JobID=@JID');
//     if (dup.recordset.length)
//       return res.status(400).json({ success:false, message:'Already applied' });
//     const r = await pool.request()
//       .input('CID',  sql.Int,           req.user.userId)
//       .input('JID',  sql.Int,           jobId)
//       .input('note', sql.NVarChar(100), coverNote || '')
//       .query(`INSERT INTO Applications(CandidateID,JobID,CoverNote)
//               OUTPUT INSERTED.ApplicationID VALUES(@CID,@JID,@note)`);
//     res.status(201).json({ success:true, message:'Applied', applicationId:r.recordset[0].ApplicationID });
//   } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
// };

export const applyForJob = async (req, res) => {
  try {
    const { jobId, coverNote } = req.body;
    const pool = getPool();
    if (!jobId) return res.status(400).json({ success:false, message:'Job ID required' });
    
    // Check for duplicate
    const dup = await pool.request()
      .input('CID', sql.Int, req.user.userId)
      .input('JID', sql.Int, jobId)
      .query('SELECT 1 FROM Applications WHERE CandidateID=@CID AND JobID=@JID');
    if (dup.recordset.length)
      return res.status(400).json({ success:false, message:'Already applied' });
    
    // Insert application
    const r = await pool.request()
      .input('CID',  sql.Int,           req.user.userId)
      .input('JID',  sql.Int,           jobId)
      .input('note', sql.NVarChar(100), coverNote || '')
      .query(`INSERT INTO Applications(CandidateID,JobID,CoverNote)
              OUTPUT INSERTED.ApplicationID VALUES(@CID,@JID,@note)`);
    
    const applicationId = r.recordset[0].ApplicationID;

    // Get candidate and job info for notification
    const candidateInfo = await pool.request()
      .input('uid', sql.Int, req.user.userId)
      .query('SELECT Name FROM Users WHERE UserID = @uid');
    
    const jobInfo = await pool.request()
      .input('jid', sql.Int, jobId)
      .query('SELECT j.CompanyID, j.Title FROM Jobs j WHERE j.JobID = @jid');
    
    const candidateName = candidateInfo.recordset[0]?.Name || 'Someone';
    const companyId = jobInfo.recordset[0]?.CompanyID;
    const jobTitle = jobInfo.recordset[0]?.Title || 'a position';
    
    // Notify employer
    if (companyId) {
      await pool.request()
        .input('userId', sql.Int, companyId)
        .input('message', sql.NVarChar(sql.MAX), 
          `${candidateName} has applied for the position: "${jobTitle}"`)
        .input('type', sql.NVarChar(50), 'new_application')
        .query(`INSERT INTO Notifications (UserID, Message, Type) 
                VALUES (@userId, @message, @type)`);
      
      console.log(`✅ Notification sent to employer ${companyId}: ${candidateName} applied for ${jobTitle}`);
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Applied successfully!', 
      applicationId 
    });
  } catch (err) { 
    console.error('applyForJob error:', err);
    res.status(500).json({ success:false, message:'Server error' }); 
  }
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

// export const updateApplicationStatus = async (req, res) => {
//   try {
//     const pool = getPool();
//     await pool.request()
//       .input('AID',    sql.Int,          req.body.applicationId)
//       .input('Status', sql.NVarChar(50), req.body.status)
//       .query('UPDATE Applications SET Status=@Status WHERE ApplicationID=@AID');
//     res.json({ success:true, message:'Status updated' });
//   } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
// };

export const updateApplicationStatus = async (req, res) => {
  try {
    const pool = getPool();
    const { applicationId, status } = req.body;
    
    // Update the status
    await pool.request()
      .input('AID',    sql.Int,          applicationId)
      .input('Status', sql.NVarChar(50), status)
      .query('UPDATE Applications SET Status=@Status WHERE ApplicationID=@AID');
    
    // ── Send notification to candidate ──────────────────────────
    try {
      const appInfo = await pool.request()
        .input('aid', sql.Int, applicationId)
        .query(`
          SELECT a.CandidateID, j.Title, u.Name as CandidateName,
                 c.CompanyName, j.CompanyID
          FROM Applications a
          JOIN Jobs j ON a.JobID = j.JobID
          JOIN Companies c ON j.CompanyID = c.CompanyID
          JOIN Users u ON a.CandidateID = u.UserID
          WHERE a.ApplicationID = @aid
        `);
      
      if (appInfo.recordset.length > 0) {
        const info = appInfo.recordset[0];
        const candidateUserId = info.CandidateID;
        const jobTitle = info.Title;
        
        // Map status to user-friendly message
        const statusMessages = {
          Shortlisted: `🌟 Great news! Your application for "${jobTitle}" has been shortlisted.`,
          Interview: `🎙️ You've been selected for an AI Interview for "${jobTitle}". Log in to take it now!`,
          Accepted: `🎉 Congratulations! Your application for "${jobTitle}" has been accepted!`,
          Rejected: `Thank you for applying to "${jobTitle}". Unfortunately, you were not selected this time.`,
          Pending: `Your application for "${jobTitle}" status has been updated to Pending.`,
        };
        
        const msg = statusMessages[status] || `Your application status changed to: ${status}`;
        
        // Notify candidate
        await pool.request()
          .input('userId', sql.Int, candidateUserId)
          .input('message', sql.NVarChar(sql.MAX), msg)
          .input('type', sql.NVarChar(50), 'status_update')
          .query(`INSERT INTO Notifications (UserID, Message, Type) 
                  VALUES (@userId, @message, @type)`);
      }
    } catch (notifErr) {
      console.warn('Failed to create candidate notification:', notifErr);
    }
    // ─────────────────────────────────────────────────────────────

    res.json({ success:true, message:'Status updated' });
  } catch (err) { 
    console.error('updateApplicationStatus:', err);
    res.status(500).json({ success:false, message:'Server error' }); 
  }
};


// export const getAllCompanyApplicants = async (req, res) => {
//   try {
//     const pool = getPool();
//     const r = await pool.request().input('CID', sql.Int, req.user.userId).query(`
//       SELECT a.ApplicationID, a.Status, a.AppliedDate, a.CoverNote,
//              u.Name AS CandidateName, u.Email, u.Phone,
//              c.Education, c.Experience, c.CVPath,
//              j.Title AS JobTitle, j.JobID, j.RequiredSkills
//       FROM Applications a
//       JOIN Candidates c ON a.CandidateID=c.CandidateID
//       JOIN Users u ON c.CandidateID=u.UserID
//       JOIN Jobs j ON a.JobID=j.JobID
//       WHERE j.CompanyID=@CID ORDER BY a.AppliedDate DESC`);
//     res.json({ success:true, applicants:r.recordset });
//   } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
// };


// ════════════════════════════════════════
//  EDIT JOB
// ════════════════════════════════════════


export const getAllCompanyApplicants = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('CID', sql.Int, req.user.userId).query(`
      SELECT a.ApplicationID, a.Status, a.AppliedDate, a.CoverNote,
             u.Name AS CandidateName, u.Email, u.Phone,
             u.UserID AS CandidateUserID,
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
export const editJob = async (req, res) => {
  try {
    const pool = getPool();
    const jobId = parseInt(req.params.jobId);
    const companyId = req.user.userId;
    const { title, description, experienceLevel, location,
            jobType, workMode, deadline, requiredSkills, salaryRange } = req.body;

    const check = await pool.request()
      .input('jid', sql.Int, jobId)
      .input('cid', sql.Int, companyId)
      .query('SELECT 1 FROM Jobs WHERE JobID=@jid AND CompanyID=@cid');
    if (!check.recordset.length)
      return res.status(403).json({ success: false, message: 'Not authorized to edit this job' });

    await pool.request()
      .input('jid',            sql.Int,              jobId)
      .input('Title',          sql.NVarChar(150),     title || '')
      .input('Description',    sql.NVarChar(sql.MAX), description || '')
      .input('ExperienceLevel',sql.NVarChar(100),     experienceLevel || '')
      .input('Location',       sql.NVarChar(100),     location || '')
      .input('JobType',        sql.NVarChar(50),      jobType || 'Job')
      .input('WorkMode',       sql.NVarChar(50),      workMode || 'Onsite')
      .input('Deadline',       sql.Date,              deadline || null)
      .input('RequiredSkills', sql.NVarChar(sql.MAX), requiredSkills || '')
      .input('SalaryRange',    sql.NVarChar(100),     salaryRange || '')
      .query(`UPDATE Jobs SET
        Title=@Title, Description=@Description, ExperienceLevel=@ExperienceLevel,
        Location=@Location, JobType=@JobType, WorkMode=@WorkMode, Deadline=@Deadline,
        RequiredSkills=@RequiredSkills, SalaryRange=@SalaryRange
        WHERE JobID=@jid`);

    res.json({ success: true, message: 'Job updated successfully' });
  } catch (err) {
    console.error('editJob:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const testRoute = (_req, res) => res.json({ message:'Hirely API is running!' });

// ════════════════════════════════════════
//  CANDIDATE PROFILE
// ════════════════════════════════════════
export const getCandidateProfile = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const [profileResult, skillsResult] = await Promise.all([
      pool.request().input('uid', sql.Int, uid).query(`
        SELECT c.*, u.Name, u.Email, u.Phone
        FROM Candidates c JOIN Users u ON c.CandidateID = u.UserID
        WHERE c.CandidateID = @uid
      `),
      pool.request().input('uid', sql.Int, uid).query(`
        SELECT s.SkillID, s.SkillName FROM CandidateSkills cs
        JOIN Skills s ON cs.SkillID = s.SkillID
        WHERE cs.CandidateID = @uid
      `)
    ]);
    res.json({ success: true, profile: profileResult.recordset[0] || null, skills: skillsResult.recordset });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const updateCandidateProfile = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const { name, phone, education, experience, profileSummary } = req.body;
    await pool.request()
      .input('uid',   sql.Int,          uid)
      .input('name',  sql.NVarChar(100), name  || null)
      .input('phone', sql.NVarChar(20),  phone || null)
      .query(`UPDATE Users SET
        Name  = COALESCE(NULLIF(@name,''),  Name),
        Phone = COALESCE(NULLIF(@phone,''), Phone)
        WHERE UserID = @uid`);
    await pool.request()
      .input('uid',            sql.Int,              uid)
      .input('education',      sql.NVarChar(255),     education      || null)
      .input('experience',     sql.NVarChar(255),     experience     || null)
      .input('profileSummary', sql.NVarChar(sql.MAX), profileSummary || null)
      .query(`UPDATE Candidates SET
        Education      = COALESCE(NULLIF(@education,''),      Education),
        Experience     = COALESCE(NULLIF(@experience,''),     Experience),
        ProfileSummary = COALESCE(NULLIF(@profileSummary,''), ProfileSummary)
        WHERE CandidateID = @uid`);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const addCandidateSkill = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const { skillName } = req.body;
    if (!skillName) return res.status(400).json({ success: false, message: 'Skill name required' });

    let sid;
    const existing = await pool.request()
      .input('name', sql.NVarChar(100), skillName.trim())
      .query('SELECT SkillID FROM Skills WHERE SkillName = @name');
    if (existing.recordset.length) {
      sid = existing.recordset[0].SkillID;
    } else {
      const ins = await pool.request()
        .input('name', sql.NVarChar(100), skillName.trim())
        .query('INSERT INTO Skills(SkillName) OUTPUT INSERTED.SkillID VALUES(@name)');
      sid = ins.recordset[0].SkillID;
    }

    const dup = await pool.request()
      .input('cid', sql.Int, uid).input('sid', sql.Int, sid)
      .query('SELECT 1 FROM CandidateSkills WHERE CandidateID=@cid AND SkillID=@sid');
    if (dup.recordset.length)
      return res.status(400).json({ success: false, message: 'Skill already added' });

    await pool.request()
      .input('cid', sql.Int, uid).input('sid', sql.Int, sid)
      .query('INSERT INTO CandidateSkills(CandidateID,SkillID) VALUES(@cid,@sid)');
    res.json({ success: true, message: 'Skill added', skillId: sid, skillName: skillName.trim() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const removeCandidateSkill = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('cid', sql.Int, req.user.userId)
      .input('sid', sql.Int, req.params.skillId)
      .query('DELETE FROM CandidateSkills WHERE CandidateID=@cid AND SkillID=@sid');
    res.json({ success: true, message: 'Skill removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getCandidateStats = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const [appR, interR, skillR, profileR] = await Promise.all([
      pool.request().input('uid', sql.Int, uid)
        .query('SELECT COUNT(*) AS cnt FROM Applications WHERE CandidateID=@uid'),
      pool.request().input('uid', sql.Int, uid)
        .query("SELECT COUNT(*) AS cnt FROM Applications WHERE CandidateID=@uid AND Status='Interview'"),
      pool.request().input('uid', sql.Int, uid)
        .query('SELECT SkillID FROM CandidateSkills WHERE CandidateID=@uid'),
      pool.request().input('uid', sql.Int, uid)
        .query(`SELECT c.Education,c.Experience,c.ProfileSummary,c.CVPath,u.Phone,u.Name
                FROM Candidates c JOIN Users u ON c.CandidateID=u.UserID WHERE c.CandidateID=@uid`)
    ]);

    const p  = profileR.recordset[0] || {};
    const sk = skillR.recordset.length;
    let completion = 20;
    if (p.Name)           completion += 10;
    if (p.Phone)          completion += 10;
    if (p.Education)      completion += 15;
    if (p.Experience)     completion += 15;
    if (p.ProfileSummary) completion += 15;
    if (p.CVPath)         completion += 15;
    if (sk > 0) completion = Math.min(100, completion + Math.min(sk * 5, 20));

    const openJobs = await pool.request().query("SELECT RequiredSkills FROM Jobs WHERE Status='Open'");
    let candSkillNames = [];
    if (sk > 0) {
      const r = await pool.request().input('uid', sql.Int, uid).query(
        'SELECT s.SkillName FROM CandidateSkills cs JOIN Skills s ON cs.SkillID=s.SkillID WHERE cs.CandidateID=@uid'
      );
      candSkillNames = r.recordset.map(x => x.SkillName.toLowerCase());
    }

    const matchCount = openJobs.recordset.filter(j => {
      if (!j.RequiredSkills) return true;
      const reqS = j.RequiredSkills.split(',').map(s => s.trim().toLowerCase());
      return reqS.some(r => candSkillNames.some(c => c.includes(r) || r.includes(c)));
    }).length;

    res.json({
      success: true,
      stats: {
        applicationsSent:    appR.recordset[0].cnt,
        interviewsScheduled: interR.recordset[0].cnt,
        jobMatches:          matchCount,
        profileViews:        Math.max(0, appR.recordset[0].cnt * 3 + sk * 8),
        profileCompletion:   Math.min(100, completion)
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ════════════════════════════════════════
//  JOBS WITH MATCH % FOR CANDIDATE
// ════════════════════════════════════════
export const getJobsWithMatch = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const { search, jobType, workMode } = req.query;

    const skillsR = await pool.request().input('uid', sql.Int, uid).query(`
      SELECT s.SkillName FROM CandidateSkills cs
      JOIN Skills s ON cs.SkillID=s.SkillID WHERE cs.CandidateID=@uid
    `);
    const candSkills = skillsR.recordset.map(r => r.SkillName.toLowerCase());

    let q = `SELECT j.*, c.CompanyName,
      (SELECT COUNT(*) FROM Applications WHERE JobID=j.JobID AND CandidateID=@uid) AS hasApplied
      FROM Jobs j JOIN Companies c ON j.CompanyID=c.CompanyID WHERE j.Status='Open' AND (j.Deadline IS NULL OR j.Deadline >= CAST(GETDATE() AS DATE))`;

    const request = pool.request().input('uid', sql.Int, uid);
    if (search) {
      q += ' AND (j.Title LIKE @s OR j.Description LIKE @s OR j.RequiredSkills LIKE @s OR c.CompanyName LIKE @s)';
      request.input('s', sql.NVarChar(200), `%${search}%`);
    }
    if (jobType && jobType !== 'All Types') { q += ' AND j.JobType=@jt'; request.input('jt', sql.NVarChar(50), jobType); }
    if (workMode && workMode !== 'All')     { q += ' AND j.WorkMode=@wm'; request.input('wm', sql.NVarChar(50), workMode); }
    q += ' ORDER BY j.JobID DESC';

    const jobsR = await request.query(q);
    const jobs = jobsR.recordset.map(job => {
      const reqSkills = (job.RequiredSkills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      let matchPercent = 0;
      if (reqSkills.length > 0 && candSkills.length > 0) {
        const matched = reqSkills.filter(s => candSkills.some(cs => cs.includes(s) || s.includes(cs)));
        matchPercent = Math.round((matched.length / reqSkills.length) * 100);
      }
      return { ...job, matchPercent, hasApplied: (job.hasApplied || 0) > 0 };
    });

    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ════════════════════════════════════════
//  ELIGIBILITY CHECK
// ════════════════════════════════════════
export const checkEligibility = async (req, res) => {
  try {
    const pool = getPool();
    const uid = req.user.userId;
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ success: false, message: 'Job ID required' });

    const [jobR, skillsR] = await Promise.all([
      pool.request().input('jid', sql.Int, jobId).query('SELECT * FROM Jobs WHERE JobID=@jid'),
      pool.request().input('uid', sql.Int, uid).query(`
        SELECT s.SkillName FROM CandidateSkills cs
        JOIN Skills s ON cs.SkillID=s.SkillID WHERE cs.CandidateID=@uid
      `)
    ]);
    if (!jobR.recordset.length) return res.status(404).json({ success: false, message: 'Job not found' });

    const job = jobR.recordset[0];
    const candSkills   = skillsR.recordset.map(r => r.SkillName.toLowerCase());
    const reqSkills    = (job.RequiredSkills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const matchedLower = reqSkills.filter(s => candSkills.some(cs => cs.includes(s) || s.includes(cs)));
    const missingLower = reqSkills.filter(s => !candSkills.some(cs => cs.includes(s) || s.includes(cs)));
    const matchPct     = reqSkills.length > 0 ? Math.round((matchedLower.length / reqSkills.length) * 100) : 100;
    const capitalize   = s => s.charAt(0).toUpperCase() + s.slice(1);

    try {
      await pool.request()
        .input('cid',    sql.Int,              uid)
        .input('jid',    sql.Int,              jobId)
        .input('match',  sql.Float,            matchPct)
        .input('miss',   sql.NVarChar(sql.MAX), missingLower.join(', '))
        .input('status', sql.NVarChar(50),      matchPct >= 60 ? 'Eligible' : 'NotEligible')
        .query(`
          IF EXISTS (SELECT 1 FROM HirelyScreenings WHERE CandidateID=@cid AND JobID=@jid)
            UPDATE HirelyScreenings SET MatchPercentage=@match,MissingSkills=@miss,EligibilityStatus=@status
            WHERE CandidateID=@cid AND JobID=@jid
          ELSE
            INSERT INTO HirelyScreenings(CandidateID,JobID,MatchPercentage,MissingSkills,EligibilityStatus)
            VALUES(@cid,@jid,@match,@miss,@status)
        `);
    } catch (_) { /* swallow UNIQUE constraint conflicts */ }

    res.json({
      success: true,
      result: {
        matchPercent:   matchPct,
        eligible:       matchPct >= 60,
        matchedSkills:  matchedLower.map(capitalize),
        missingSkills:  missingLower.map(capitalize),
        requiredSkills: reqSkills.map(capitalize),
        jobTitle:       job.Title
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ════════════════════════════════════════
//  MARKETPLACE
// ════════════════════════════════════════
// In routes.js, replace the getMarketplace function
export const getMarketplace = async (req, res) => {
  try {
    const pool = getPool();
    const [svc, prd] = await Promise.all([
      pool.request().query(`
        SELECT s.*, c.CompanyName, c.Description as CompanyDescription,
               u.Email AS ContactEmail, u.Phone AS ContactPhone
        FROM Services s 
        JOIN Companies c ON s.CompanyID = c.CompanyID
        JOIN Users u ON c.CompanyID = u.UserID 
        ORDER BY s.ServiceID DESC
      `),
      pool.request().query(`
        SELECT p.*, c.CompanyName, c.Description as CompanyDescription,
               u.Email AS ContactEmail, u.Phone AS ContactPhone
        FROM Products p
        JOIN Companies c ON p.CompanyID = c.CompanyID
        JOIN Users u ON c.CompanyID = u.UserID 
        ORDER BY p.ProductID DESC
      `)
    ]);
    res.json({ success: true, services: svc.recordset, products: prd.recordset });
  } catch (err) { 
    console.error('getMarketplace:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};



// ════════════════════════════════════════
//  SERVICE REQUESTS (FOR BOTH SERVICES & PRODUCTS)
// ════════════════════════════════════════

// POST /api/service-requests - Create a new service/product request
export const createServiceRequest = async (req, res) => {
  try {
    const pool = getPool();
    const { serviceId, productId, message } = req.body;

    const userId = parseInt(req.user.userId, 10);
    if (isNaN(userId)) {
      return res.status(401).json({ success: false, message: 'Invalid session. Please log out and log back in.' });
    }

    let requestType    = '';
    let itemTitle      = '';
    let employerId     = null;
    let serviceIdToUse = null;
    let messageToStore = '';

    // ── Service request ─────────────────────────────────────────────
    if (serviceId) {
      const sid = parseInt(serviceId, 10);
      if (isNaN(sid)) return res.status(400).json({ success: false, message: 'Invalid service ID' });

      // ✅ No JOIN, no duplicate column names — CompanyID comes from Services only
      const svcRes = await pool.request()
        .input('sid', sql.Int, sid)
        .query('SELECT ServiceID, Title, CompanyID FROM Services WHERE ServiceID = @sid');

      if (!svcRes.recordset.length)
        return res.status(404).json({ success: false, message: 'Service not found' });

      const svc      = svcRes.recordset[0];
      employerId     = parseInt(svc.CompanyID, 10);
      itemTitle      = svc.Title;
      requestType    = 'service';
      serviceIdToUse = sid;
      messageToStore = message || `Interested in your service: ${itemTitle}`;
    }

    // ── Product request ──────────────────────────────────────────────
    else if (productId) {
      const pid = parseInt(productId, 10);
      if (isNaN(pid)) return res.status(400).json({ success: false, message: 'Invalid product ID' });

      // ✅ No JOIN, no duplicate column names
      const prdRes = await pool.request()
        .input('pid', sql.Int, pid)
        .query('SELECT ProductID, ProductName, CompanyID FROM Products WHERE ProductID = @pid');

      if (!prdRes.recordset.length)
        return res.status(404).json({ success: false, message: 'Product not found' });

      const prd      = prdRes.recordset[0];
      employerId     = parseInt(prd.CompanyID, 10);
      itemTitle      = prd.ProductName;
      requestType    = 'product';
      serviceIdToUse = null;   // ServiceRequests.ServiceID is nullable — no DB change needed
      // Store as JSON so accept/reject/complete can later recover the product name
      messageToStore = JSON.stringify({
        productId: pid,
        title:     itemTitle,
        text:      message || `Interested in your product: ${itemTitle}`
      });
    }
    else {
      return res.status(400).json({ success: false, message: 'Service ID or Product ID required' });
    }

    if (isNaN(employerId)) {
      return res.status(500).json({ success: false, message: 'Could not resolve employer. Contact admin.' });
    }

    // ── Insert into ServiceRequests ──────────────────────────────────
    const insertResult = await pool.request()
      .input('userId',    sql.Int,           userId)
      .input('serviceId', sql.Int,           serviceIdToUse)   // null for products → SQL NULL
      .input('message',   sql.NVarChar(500), messageToStore)
      .input('status',    sql.NVarChar(50),  'Pending')
      .query(`
        INSERT INTO ServiceRequests (UserID, ServiceID, Message, Status)
        OUTPUT INSERTED.RequestID
        VALUES (@userId, @serviceId, @message, @status)
      `);

    const requestId = insertResult.recordset[0].RequestID;

    // ── Notify the employer ──────────────────────────────────────────
    const reqNameRes = await pool.request()
      .input('uid', sql.Int, userId)
      .query('SELECT Name FROM Users WHERE UserID = @uid');
    const requesterName = reqNameRes.recordset[0]?.Name || 'Someone';

    await pool.request()
      .input('empId',   sql.Int,           employerId)
      .input('msg',     sql.NVarChar(500),
        `${requesterName} has requested your ${requestType}: "${itemTitle}". ${message ? 'Message: ' + message : ''}`.trim())
      .input('type',    sql.NVarChar(50),  `${requestType}_request`)
      .query('INSERT INTO Notifications (UserID, Message, Type) VALUES (@empId, @msg, @type)');

    res.json({
      success: true,
      requestId,
      message: `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} request sent successfully`
    });
  } catch (error) {
    console.error('createServiceRequest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/service-requests/my - Get requests for employer (both services and products)
export const getServiceRequests = async (req, res) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.user.userId, 10);

    // ── 1. Service requests for this company ─────────────────────────
    const svcResult = await pool.request()
      .input('companyId', sql.Int, userId)
      .query(`
        SELECT sr.RequestID, sr.UserID, sr.ServiceID, sr.RequestDate, sr.Message, sr.Status,
               s.Title        AS ServiceTitle,
               'service'      AS RequestType,
               u.Name         AS RequesterName,
               u.Email        AS RequesterEmail,
               u.Phone        AS RequesterPhone
        FROM ServiceRequests sr
        JOIN Services s ON sr.ServiceID = s.ServiceID
        JOIN Users    u ON sr.UserID    = u.UserID
        WHERE s.CompanyID = @companyId
        ORDER BY sr.RequestDate DESC
      `);

    // ── 2. Product requests (ServiceID IS NULL) ──────────────────────
    //    Message column was stored as JSON: { productId, text }
    const rawProd = await pool.request()
      .query(`
        SELECT sr.RequestID, sr.UserID, sr.ServiceID, sr.RequestDate, sr.Message, sr.Status,
               u.Name  AS RequesterName,
               u.Email AS RequesterEmail,
               u.Phone AS RequesterPhone
        FROM ServiceRequests sr
        JOIN Users u ON sr.UserID = u.UserID
        WHERE sr.ServiceID IS NULL
        ORDER BY sr.RequestDate DESC
      `);

    const productRequests = [];
    for (const pr of rawProd.recordset) {
      try {
        const parsed = JSON.parse(pr.Message);
        if (!parsed.productId) continue;

        const prodRes = await pool.request()
          .input('pid', sql.Int, parsed.productId)
          .input('cid', sql.Int, userId)
          .query('SELECT ProductName FROM Products WHERE ProductID = @pid AND CompanyID = @cid');

        if (!prodRes.recordset.length) continue;  // belongs to a different company

        productRequests.push({
          ...pr,
          ServiceTitle: prodRes.recordset[0].ProductName,
          RequestType:  'product',
          Message:      parsed.text || pr.Message,   // show human-readable text
        });
      } catch (_) { /* skip rows whose Message isn't JSON */ }
    }

    // Merge & sort newest-first
    const all = [...svcResult.recordset, ...productRequests]
      .sort((a, b) => new Date(b.RequestDate) - new Date(a.RequestDate));

    res.json({ success: true, requests: all });
  } catch (error) {
    console.error('getServiceRequests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/service-requests/:id/accept
export const acceptServiceRequest = async (req, res) => {
  try {
    const pool = getPool();
    const requestId = parseInt(req.params.id, 10);

    // ✅ Status stored as 'Accepted' so the UI check req.Status.toLowerCase()==='accepted' works
    await pool.request()
      .input('requestId', sql.Int,          requestId)
      .input('status',    sql.NVarChar(50), 'Accepted')
      .query('UPDATE ServiceRequests SET Status = @status WHERE RequestID = @requestId');

    // ✅ LEFT JOIN so product rows (ServiceID = NULL) are still returned
    const rr = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query(`
        SELECT sr.UserID, sr.Message, sr.ServiceID,
               s.Title   AS ServiceTitle,
               u.Name    AS RequesterName
        FROM ServiceRequests sr
        LEFT JOIN Services s ON sr.ServiceID = s.ServiceID
        JOIN  Users u        ON sr.UserID     = u.UserID
        WHERE sr.RequestID = @requestId
      `);

    if (rr.recordset.length) {
      const row = rr.recordset[0];

      // ── Decrement stock if this is a product request ─────────────
      // Product requests have ServiceID = NULL and Message stored as JSON
      if (row.ServiceID === null && row.Message) {
        try {
          const parsed = JSON.parse(row.Message);
          if (parsed.productId) {
            await pool.request()
              .input('pid', sql.Int, parsed.productId)
              .query(`
                UPDATE Products
                SET StockQuantity = CASE
                  WHEN StockQuantity > 0 THEN StockQuantity - 1
                  ELSE 0
                END
                WHERE ProductID = @pid
              `);
          }
        } catch (_) {} // non-JSON message means it's not a product request
      }

      // Resolve item title for notification
      let itemTitle = row.ServiceTitle;
      if (!itemTitle && row.Message) {
        try { itemTitle = JSON.parse(row.Message).title; } catch (_) {}
      }
      itemTitle = itemTitle || 'your request';

      await pool.request()
        .input('uid', sql.Int,           row.UserID)
        .input('msg', sql.NVarChar(500), `Your request for "${itemTitle}" has been accepted! The employer will contact you soon.`)
        .input('typ', sql.NVarChar(50),  'request_accepted')
        .query('INSERT INTO Notifications (UserID, Message, Type) VALUES (@uid, @msg, @typ)');
    }

    res.json({ success: true, message: 'Request accepted' });
  } catch (error) {
    console.error('acceptServiceRequest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/service-requests/:id/reject
export const rejectServiceRequest = async (req, res) => {
  try {
    const pool = getPool();
    const requestId = parseInt(req.params.id, 10);

    // ✅ 'Rejected' matches UI's toLowerCase() === 'rejected' check
    await pool.request()
      .input('requestId', sql.Int,          requestId)
      .input('status',    sql.NVarChar(50), 'Rejected')
      .query('UPDATE ServiceRequests SET Status = @status WHERE RequestID = @requestId');

    // ✅ LEFT JOIN so product rows work too
    const rr = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query(`
        SELECT sr.UserID, sr.Message, s.Title AS ServiceTitle
        FROM ServiceRequests sr
        LEFT JOIN Services s ON sr.ServiceID = s.ServiceID
        WHERE sr.RequestID = @requestId
      `);

    if (rr.recordset.length) {
      const row = rr.recordset[0];
      let itemTitle = row.ServiceTitle;
      if (!itemTitle && row.Message) {
        try { itemTitle = JSON.parse(row.Message).title; } catch (_) {}
      }
      itemTitle = itemTitle || 'your request';

      await pool.request()
        .input('uid', sql.Int,           row.UserID)
        .input('msg', sql.NVarChar(500), `Your request for "${itemTitle}" has been declined.`)
        .input('typ', sql.NVarChar(50),  'request_rejected')
        .query('INSERT INTO Notifications (UserID, Message, Type) VALUES (@uid, @msg, @typ)');
    }

    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('rejectServiceRequest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/service-requests/:id/complete
export const completeServiceRequest = async (req, res) => {
  try {
    const pool = getPool();
    const requestId = parseInt(req.params.id, 10);

    await pool.request()
      .input('requestId', sql.Int,          requestId)
      .input('status',    sql.NVarChar(50), 'Completed')
      .query('UPDATE ServiceRequests SET Status = @status WHERE RequestID = @requestId');

    // ✅ LEFT JOIN so product rows work too
    const rr = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query(`
        SELECT sr.UserID, sr.Message, s.Title AS ServiceTitle
        FROM ServiceRequests sr
        LEFT JOIN Services s ON sr.ServiceID = s.ServiceID
        WHERE sr.RequestID = @requestId
      `);

    if (rr.recordset.length) {
      const row = rr.recordset[0];
      let itemTitle = row.ServiceTitle;
      if (!itemTitle && row.Message) {
        try { itemTitle = JSON.parse(row.Message).title; } catch (_) {}
      }
      itemTitle = itemTitle || 'your request';

      await pool.request()
        .input('uid', sql.Int,           row.UserID)
        .input('msg', sql.NVarChar(500), `Your request for "${itemTitle}" has been completed! 🎉`)
        .input('typ', sql.NVarChar(50),  'request_completed')
        .query('INSERT INTO Notifications (UserID, Message, Type) VALUES (@uid, @msg, @typ)');
    }

    res.json({ success: true, message: 'Marked as completed' });
  } catch (error) {
    console.error('completeServiceRequest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ─── INTERVIEW ──────────────────────────────────────────────────────
export const getInterviewStatus = async (req, res) => {
  try {
    const pool = getPool();
    const applicationId = parseInt(req.params.applicationId);
    
    const result = await pool.request()
      .input('aid', sql.Int, applicationId)
      .query('SELECT * FROM Interviews WHERE ApplicationID = @aid');
    
    const completed = result.recordset.length > 0;
    res.json({ success: true, completed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInterviewResult = async (req, res) => {
  try {
    const pool = getPool();
    const applicationId = parseInt(req.params.applicationId);
    
    const result = await pool.request()
      .input('aid', sql.Int, applicationId)
      .query(`
        SELECT i.*, u.Name as CandidateName, u.Email as CandidateEmail,
               a.Status as ApplicationStatus
        FROM Interviews i
        JOIN Applications a ON i.ApplicationID = a.ApplicationID
        JOIN Candidates c ON a.CandidateID = c.CandidateID
        JOIN Users u ON c.CandidateID = u.UserID
        WHERE i.ApplicationID = @aid
      `);
    
    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Interview result not found' });
    }
    
    const interview = result.recordset[0];
    
    // Parse the Notes field which contains Q&A and scoring data
    let qa = [];
    let summary = {};
    
    try {
      const notesData = JSON.parse(interview.Notes || '{}');
      qa = notesData.qa || [];
      summary = notesData.summary || {};
    } catch (e) {
      console.error('Failed to parse interview notes:', e);
    }
    
    res.json({
      success: true,
      result: {
        summary: {
          ...summary,
          CandidateName: interview.CandidateName,
          CandidateEmail: interview.CandidateEmail,
          CompletedAt: interview.InterviewDate
        },
        qa: qa
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const saveInterviewResult = async (req, res) => {
  try {
    const pool = getPool();
    const pyData = req.body;
    
    // Extract data from Python API response format
    const application_id = pyData.applicationId;
    const candidate_id = pyData.candidateId;
    const qaResults = pyData.qaResults || [];
    
    // Build scores array from qaResults for compatibility
    const scores = {
      quality: qaResults.map(q => q.qualityScore || 0),
      skill: qaResults.map(q => q.skillScore || 0),
      personality: qaResults.map(q => q.personalityScore || 0),
      feedback: qaResults.map(q => q.feedback || 'No feedback')
    };
    
    // Build summary object
    const summary = {
      Hired: pyData.hired ? 1 : 0,
      Confidence: pyData.confidence || 0,
      AvgInterviewScore: pyData.avgInterviewScore || 0,
      AvgSkillScore: pyData.avgSkillScore || 0,
      AvgPersonalityScore: pyData.avgPersonalityScore || 0,
      HiringProbability: pyData.hiringProbability || 0,
      NotHiringProbability: pyData.notHiringProbability || 0,
    };
    
    // Store Q&A and scores in Notes field as JSON
    const notesData = {
      qa: qaResults,
      summary: summary,
      profile: {
        applicationId: application_id,
        candidateId: candidate_id
      }
    };
    
    // Insert interview record
    await pool.request()
      .input('aid', sql.Int, application_id)
      .input('date', sql.DateTime, new Date())
      .input('type', sql.NVarChar(50), 'AI Interview')
      .input('notes', sql.NVarChar(sql.MAX), JSON.stringify(notesData))
      .query(`
        INSERT INTO Interviews (ApplicationID, InterviewDate, InterviewType, Notes)
        VALUES (@aid, @date, @type, @notes)
      `);
    
    // Update application status to 'Interviewed'
    await pool.request()
      .input('aid', sql.Int, application_id)
      .input('status', sql.NVarChar(50), 'Interviewed')
      .query('UPDATE Applications SET Status = @status WHERE ApplicationID = @aid');
    
    // Get employer info for notification
    const appInfo = await pool.request()
      .input('aid', sql.Int, application_id)
      .query(`
        SELECT j.CompanyID, j.Title, u.Name as CandidateName
        FROM Applications a
        JOIN Jobs j ON a.JobID = j.JobID
        JOIN Users u ON a.CandidateID = u.UserID
        WHERE a.ApplicationID = @aid
      `);
    
    let employerUserId = null;
    let jobTitle = '';
    
    if (appInfo.recordset.length > 0) {
      employerUserId = appInfo.recordset[0].CompanyID;
      jobTitle = appInfo.recordset[0].Title;
    }
    
    res.json({
      success: true,
      message: 'Interview result saved successfully',
      employerUserId,
      jobTitle
    });
  } catch (err) {
    console.error('saveInterviewResult:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// ════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════
export const getNotifications = async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.request().input('uid', sql.Int, req.user.userId)
      .query('SELECT * FROM Notifications WHERE UserID=@uid ORDER BY CreatedAt DESC');
    res.json({ success: true, notifications: r.recordset });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createNotification = async (req, res) => {
  try {
    const pool = getPool();
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and message are required' 
      });
    }
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('message', sql.NVarChar(sql.MAX), message)
      .input('type', sql.NVarChar(50), 'status_update')
      .query(`INSERT INTO Notifications (UserID, Message, Type) 
              VALUES (@userId, @message, @type)`);
    
    console.log(`✅ Notification created for user ${userId}: ${message}`);
    res.json({ success: true, message: 'Notification sent' });
  } catch (err) {
    console.error('createNotification error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request().input('uid', sql.Int, req.user.userId)
      .query('UPDATE Notifications SET IsRead=1 WHERE UserID=@uid');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};