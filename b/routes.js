import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, sql } from './db.js';

// Helper function to generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ============= AUTH CONTROLLERS =============

// Register new user
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const pool = getPool();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    // Check if user exists
    const checkUser = await pool.request()
      .input('Email', sql.NVarChar(100), email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.request()
      .input('Name', sql.NVarChar(100), name)
      .input('Email', sql.NVarChar(100), email)
      .input('PassHire', sql.NVarChar(120), hashedPassword)
      .input('Phone', sql.NVarChar(20), phone || null)
      .input('Role', sql.NVarChar(20), role)
      .query(`
        INSERT INTO Users (Name, Email, PassHire, Phone, Role)
        OUTPUT INSERTED.UserID, INSERTED.Name, INSERTED.Email, INSERTED.Role
        VALUES (@Name, @Email, @PassHire, @Phone, @Role)
      `);

    const newUser = result.recordset[0];

    // Create profile based on role
    if (role === 'Candidate') {
      await pool.request()
        .input('CandidateID', sql.Int, newUser.UserID)
        .query('INSERT INTO Candidates (CandidateID, Education, Experience) VALUES (@CandidateID, \'\', \'\')');
    } else if (role === 'Company') {
      await pool.request()
        .input('CompanyID', sql.Int, newUser.UserID)
        .input('CompanyName', sql.NVarChar(150), name)
        .query('INSERT INTO Companies (CompanyID, CompanyName) VALUES (@CompanyID, @CompanyName)');
    }

    const token = generateToken(newUser.UserID, newUser.Email, newUser.Role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser.UserID,
        name: newUser.Name,
        email: newUser.Email,
        role: newUser.Role
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const pool = getPool();

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    // Find user
    const result = await pool.request()
      .input('Email', sql.NVarChar(100), email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check role
    if (user.Role !== role) {
      return res.status(401).json({ 
        success: false, 
        message: `Invalid role. This account is registered as ${user.Role}` 
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.PassHire);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.UserID, user.Email, user.Role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.UserID,
        name: user.Name,
        email: user.Email,
        role: user.Role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .query('SELECT UserID, Name, Email, Phone, Role FROM Users WHERE UserID = @UserID');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, user: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============= JOB CONTROLLERS =============

// Post a new job
export const postJob = async (req, res) => {
  try {
    const { 
      title, description, experienceLevel, location, 
      jobType, workMode, deadline, requiredSkills, salaryRange 
    } = req.body;
    const companyId = req.user.userId;
    const pool = getPool();

    if (!title || !jobType) {
      return res.status(400).json({ success: false, message: 'Title and job type required' });
    }

    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('Title', sql.NVarChar(150), title)
      .input('Description', sql.NVarChar(sql.MAX), description || '')
      .input('ExperienceLevel', sql.NVarChar(100), experienceLevel || '')
      .input('Location', sql.NVarChar(100), location || '')
      .input('JobType', sql.NVarChar(50), jobType)
      .input('WorkMode', sql.NVarChar(50), workMode || 'Onsite')
      .input('Deadline', sql.Date, deadline || null)
      .input('RequiredSkills', sql.NVarChar(sql.MAX), requiredSkills || '')
      .input('SalaryRange', sql.NVarChar(100), salaryRange || '')
      .query(`
        INSERT INTO Jobs (CompanyID, Title, Description, ExperienceLevel, Location, 
                         JobType, WorkMode, Deadline, RequiredSkills, SalaryRange)
        OUTPUT INSERTED.JobID
        VALUES (@CompanyID, @Title, @Description, @ExperienceLevel, @Location,
                @JobType, @WorkMode, @Deadline, @RequiredSkills, @SalaryRange)
      `);

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      jobId: result.recordset[0].JobID
    });

  } catch (error) {
    console.error('Post job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all jobs
export const getJobs = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .query(`
        SELECT j.*, c.CompanyName 
        FROM Jobs j
        JOIN Companies c ON j.CompanyID = c.CompanyID
        WHERE j.Status = 'Open'
        ORDER BY j.JobID DESC
      `);

    res.json({ success: true, jobs: result.recordset });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get jobs by company
export const getCompanyJobs = async (req, res) => {
  try {
    const companyId = req.user.userId;
    const pool = getPool();
    
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .query(`
        SELECT * FROM Jobs 
        WHERE CompanyID = @CompanyID
        ORDER BY CreatedAt DESC
      `);

    res.json({ success: true, jobs: result.recordset });
  } catch (error) {
    console.error('Get company jobs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============= APPLICATION CONTROLLERS =============

// Apply for a job
export const applyForJob = async (req, res) => {
  try {
    const { jobId, coverNote } = req.body;
    const candidateId = req.user.userId;
    const pool = getPool();

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID required' });
    }

    // Check if already applied
    const checkApplication = await pool.request()
      .input('CandidateID', sql.Int, candidateId)
      .input('JobID', sql.Int, jobId)
      .query('SELECT * FROM Applications WHERE CandidateID = @CandidateID AND JobID = @JobID');

    if (checkApplication.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Already applied for this job' });
    }

    const result = await pool.request()
      .input('CandidateID', sql.Int, candidateId)
      .input('JobID', sql.Int, jobId)
      .input('CoverNote', sql.NVarChar(100), coverNote || '')
      .query(`
        INSERT INTO Applications (CandidateID, JobID, CoverNote)
        OUTPUT INSERTED.ApplicationID
        VALUES (@CandidateID, @JobID, @CoverNote)
      `);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: result.recordset[0].ApplicationID
    });

  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get applications for a candidate
export const getMyApplications = async (req, res) => {
  try {
    const candidateId = req.user.userId;
    const pool = getPool();
    
    const result = await pool.request()
      .input('CandidateID', sql.Int, candidateId)
      .query(`
        SELECT a.*, j.Title, j.JobType, c.CompanyName 
        FROM Applications a
        JOIN Jobs j ON a.JobID = j.JobID
        JOIN Companies c ON j.CompanyID = c.CompanyID
        WHERE a.CandidateID = @CandidateID
        ORDER BY a.AppliedDate DESC
      `);

    res.json({ success: true, applications: result.recordset });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get applicants for a company's job
export const getJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyId = req.user.userId;
    const pool = getPool();
    
    const result = await pool.request()
      .input('JobID', sql.Int, jobId)
      .input('CompanyID', sql.Int, companyId)
      .query(`
        SELECT a.*, u.Name, u.Email, u.Phone, c.Education, c.Experience, c.CVPath
        FROM Applications a
        JOIN Candidates c ON a.CandidateID = c.CandidateID
        JOIN Users u ON c.CandidateID = u.UserID
        JOIN Jobs j ON a.JobID = j.JobID
        WHERE a.JobID = @JobID AND j.CompanyID = @CompanyID
        ORDER BY a.AppliedDate DESC
      `);

    res.json({ success: true, applicants: result.recordset });
  } catch (error) {
    console.error('Get applicants error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId, status } = req.body;
    const companyId = req.user.userId;
    const pool = getPool();
    
    const result = await pool.request()
      .input('ApplicationID', sql.Int, applicationId)
      .input('Status', sql.NVarChar(50), status)
      .query(`
        UPDATE Applications 
        SET Status = @Status
        WHERE ApplicationID = @ApplicationID
      `);

    res.json({
      success: true,
      message: 'Application status updated'
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============= TEST ROUTE =============
export const testRoute = (req, res) => {
  res.json({ message: 'Hirely API is running!' });
};