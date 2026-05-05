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
      .input('CID',  sql.Int,           req.user.userId)
      .input('JID',  sql.Int,           jobId)
      .input('note', sql.NVarChar(100), coverNote || '')
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
      .input('AID',    sql.Int,          req.body.applicationId)
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


// ════════════════════════════════════════
//  EDIT JOB
// ════════════════════════════════════════
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
export const getMarketplace = async (req, res) => {
  try {
    const pool = getPool();
    const [svc, prd] = await Promise.all([
      pool.request().query(`SELECT s.*, c.CompanyName, u.Email AS ContactEmail
        FROM Services s JOIN Companies c ON s.CompanyID=c.CompanyID
        JOIN Users u ON c.CompanyID=u.UserID ORDER BY s.ServiceID DESC`),
      pool.request().query(`SELECT p.*, c.CompanyName FROM Products p
        JOIN Companies c ON p.CompanyID=c.CompanyID ORDER BY p.ProductID DESC`)
    ]);
    res.json({ success: true, services: svc.recordset, products: prd.recordset });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const requestService = async (req, res) => {
  try {
    const pool = getPool();
    const { serviceId, message } = req.body;
    await pool.request()
      .input('uid', sql.Int,           req.user.userId)
      .input('sid', sql.Int,           serviceId)
      .input('msg', sql.NVarChar(100), message || '')
      .query('INSERT INTO ServiceRequests(UserID,ServiceID,Message) VALUES(@uid,@sid,@msg)');
    res.json({ success: true, message: 'Service request sent' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
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

export const markAllNotificationsRead = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request().input('uid', sql.Int, req.user.userId)
      .query('UPDATE Notifications SET IsRead=1 WHERE UserID=@uid');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};