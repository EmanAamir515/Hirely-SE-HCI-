CREATE DATABASE HirelyDB;
GO

USE HirelyDB;
GO

select * from users
select * from Companies
select * from Candidates
select * from Applications
select * from Jobs
select * from Services
select * from Products

select * from Skills
select * from CandidateSkills
select * from JobSkills

select * from ServiceRequests
select * from Notifications

select * from Interviews
select * from HirelyScreenings
select * from ApplicationStatusHistory
select * from AwarenessQuestions
select * from CandidateQuestionResponses


CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    PassHire NVARCHAR(120) NOT NULL,
    Phone NVARCHAR(20),
    Role NVARCHAR(20) CHECK (Role IN ('Candidate','Company')),
    CreatedAt DATETIME DEFAULT GETDATE()
);


CREATE TABLE Candidates (
    CandidateID INT PRIMARY KEY,
    Education NVARCHAR(255),
    Experience NVARCHAR(255),
    ProfileSummary NVARCHAR(MAX),
    CVPath NVARCHAR(255),
	--ProfileCompleted BIT DEFAULT 0

    FOREIGN KEY (CandidateID) REFERENCES Users(UserID)
    ON DELETE CASCADE
);

CREATE TABLE Companies (
    CompanyID INT PRIMARY KEY,
    CompanyName NVARCHAR(150),
    Description NVARCHAR(MAX),
    Logo NVARCHAR(255),
    Banner NVARCHAR(255),
    ContactDetails NVARCHAR(255),
    Portfolio NVARCHAR(MAX),

    FOREIGN KEY (CompanyID) REFERENCES Users(UserID)
    ON DELETE CASCADE
);

CREATE TABLE Jobs (
    JobID INT PRIMARY KEY IDENTITY(1,1),
    CompanyID INT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    Description NVARCHAR(MAX),
    ExperienceLevel NVARCHAR(100),
    Location NVARCHAR(100),
    JobType NVARCHAR(50) NOT NULL,
    WorkMode NVARCHAR(50) CHECK (WorkMode IN ('Remote','Onsite','Hybrid')),
    Deadline DATE,
	RequiredSkills NVARCHAR(MAX),
	SalaryRange NVARCHAR(100),
    Status NVARCHAR(50) DEFAULT 'Open',

	--CHECK (JobType IN ('Job','Internship','Parttime'))

    FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID)
    ON DELETE CASCADE
);


CREATE TABLE Applications (
    ApplicationID INT PRIMARY KEY IDENTITY(1,1),
    CandidateID INT,
    JobID INT,
    AppliedDate DATETIME DEFAULT GETDATE(),
	CoverNote NVARCHAR(100), ---since candidates might submit notes,
    Status NVARCHAR(50) DEFAULT 'Pending',  ---CHECK (Status IN ('Pending','Shortlisted','Interview','Accepted','Rejected')) 

    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID),
    FOREIGN KEY (JobID) REFERENCES Jobs(JobID)
    ON DELETE NO ACTION
);

CREATE TABLE Skills (
    SkillID INT PRIMARY KEY IDENTITY(1,1),
    SkillName NVARCHAR(100) UNIQUE
);

CREATE TABLE CandidateSkills (
    CandidateID INT,
    SkillID INT,

    PRIMARY KEY (CandidateID, SkillID),

    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID)
    ON DELETE CASCADE,

    FOREIGN KEY (SkillID) REFERENCES Skills(SkillID)
    ON DELETE CASCADE
);


CREATE TABLE JobSkills (
	JobID INT,
	SkillID INT,
	---IsRequired BIT DEFAULT 1,
	PRIMARY KEY (JobID, SkillID),
	FOREIGN KEY (JobID)   REFERENCES Jobs(JobID)   ON DELETE CASCADE,
    FOREIGN KEY (SkillID) REFERENCES Skills(SkillID) ON DELETE CASCADE
);


CREATE TABLE Services (
    ServiceID INT PRIMARY KEY IDENTITY(1,1),
    CompanyID INT,
    Title NVARCHAR(150),
    Description NVARCHAR(MAX),
    Category NVARCHAR(100),
    Price DECIMAL(10,2),

    FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID)
    ON DELETE CASCADE
);

CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY(1,1),
    CompanyID INT,
    ProductName NVARCHAR(150),
    Description NVARCHAR(MAX),
    Price DECIMAL(10,2),
    StockQuantity INT,

    FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID)
    ON DELETE CASCADE
);

CREATE TABLE ServiceRequests (
    RequestID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT,
    ServiceID INT,
    RequestDate DATETIME DEFAULT GETDATE(),
	Message NVARCHAR(100),--- to capture the inquiry text.
    Status NVARCHAR(50) DEFAULT 'Pending',

	--- CHECK (Status IN ('Pending','InProgress','Completed','Cancelled')).

    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (ServiceID) REFERENCES Services(ServiceID)
    ON DELETE CASCADE
);

CREATE TABLE Notifications (
    NotificationID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT,
    Message NVARCHAR(MAX),
    Type NVARCHAR(50),
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsRead BIT DEFAULT 0,

    FOREIGN KEY (UserID) REFERENCES Users(UserID)
    ON DELETE CASCADE
);


CREATE TABLE Interviews (
    InterviewID INT PRIMARY KEY IDENTITY(1,1),
    ApplicationID INT UNIQUE,
    InterviewDate DATETIME,
    InterviewType NVARCHAR(50),
    MeetingLink NVARCHAR(255),
    Notes NVARCHAR(MAX),

    FOREIGN KEY (ApplicationID) REFERENCES Applications(ApplicationID)
    ON DELETE CASCADE
);

CREATE TABLE HirelyScreenings (
    ScreeningID INT PRIMARY KEY IDENTITY(1,1),
    CandidateID INT,
    JobID INT UNIQUE,
    MatchPercentage FLOAT,
    MissingSkills NVARCHAR(MAX),
    EligibilityStatus NVARCHAR(50),

    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID),
    FOREIGN KEY (JobID) REFERENCES Jobs(JobID)
);

CREATE TABLE ApplicationStatusHistory  (
	HistoryID       INT              PRIMARY KEY IDENTITY(1,1),
    ApplicationID   INT              NOT NULL,
    OldStatus       NVARCHAR(50)     NULL,        -- NULL on first entry (initial insert)
    NewStatus       NVARCHAR(50)     NOT NULL,
    ChangedBy       INT              NOT NULL,    -- UserID of who made the change
    ChangedAt       DATETIME         DEFAULT GETDATE(),
    Remarks         NVARCHAR(100)    NULL,        -- optional note from employer
    FOREIGN KEY (ApplicationID) REFERENCES Applications(ApplicationID) ON DELETE CASCADE,
    FOREIGN KEY (ChangedBy)     REFERENCES Users(UserID) ON DELETE NO ACTION
);

-- Stores awareness/knowledge questions set by employer per job
-- Part of pre-application eligibility check (Phase 1 proposal feature)
CREATE TABLE AwarenessQuestions (
    QuestionID      INT  PRIMARY KEY IDENTITY(1,1),
    JobID           INT NOT NULL,
    QuestionText    NVARCHAR(100) NOT NULL,
    CorrectAnswer   NVARCHAR(100) NOT NULL,
    QuestionOrder   INT              DEFAULT 1,   -- for ordering questions in the UI
    CreatedAt       DATETIME         DEFAULT GETDATE(),
    FOREIGN KEY (JobID) REFERENCES Jobs(JobID) ON DELETE CASCADE
);

-- Records how each candidate answered awareness questions
-- Used to calculate eligibility and block unqualified applications
CREATE TABLE CandidateQuestionResponses (
    ResponseID      INT              PRIMARY KEY IDENTITY(1,1),
    CandidateID     INT              NOT NULL,
    QuestionID      INT              NOT NULL,
    ResponseText    NVARCHAR(MAX)    NOT NULL,
    IsCorrect       BIT              DEFAULT 0,
    AttemptedAt     DATETIME         DEFAULT GETDATE(),
    UNIQUE (CandidateID, QuestionID),   -- one response per question per candidate
    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID) ON DELETE NO ACTION,
    FOREIGN KEY (QuestionID)  REFERENCES AwarenessQuestions(QuestionID) ON DELETE CASCADE
);




INSERT INTO Jobs (CompanyID, Title, Description, ExperienceLevel, Location, JobType, WorkMode, Deadline, RequiredSkills, SalaryRange) VALUES
(2, 'UI/UX Designer', 'Looking for a creative designer for web and mobile apps.', 'Entry Level', 'Karachi', 'Job', 'Onsite', '2026-05-15', 'Figma, Adobe XD, Sketch, CSS', '$40,000 - $55,000'),
(2, 'Backend Developer Intern', 'Great opportunity for fresh graduates to learn Node.js development.', 'Entry Level', 'Islamabad', 'Internship', 'Remote', '2026-07-01', 'Node.js, SQL, JavaScript', 'Paid Internship');

-- 5. Insert Applications
INSERT INTO Applications (CandidateID, JobID, CoverNote, Status) VALUES
(1, 1, 'I have 3 years of React experience', 'Pending'),
(1, 2, 'Passionate about user-centered design', 'Shortlisted');


-- 6. Insert Services
INSERT INTO Services (CompanyID, Title, Description, Category, Price) VALUES
(2, 'Logo Design', 'Professional logo design package', 'Design', 500.00),
(2, 'SEO Optimization', 'Complete SEO audit and optimization', 'Marketing', 1200.00);

-- 7. Insert Products
INSERT INTO Products (CompanyID, ProductName, Description, Price, StockQuantity) VALUES
(2, 'UI Kit Pro', 'Complete UI component library', 149.99, 100),
(2, 'Startup Launch Guide', 'Complete guide to launching your startup', 29.99, 200);

-- 8. Insert Skills
INSERT INTO Skills (SkillName) VALUES
('React'), ('TypeScript'), ('JavaScript'), ('Node.js'), ('SQL'),
('CSS'), ('Tailwind'), ('Figma'), ('Adobe XD'), ('Python');

-- 9. Insert Candidate Skills
INSERT INTO CandidateSkills (CandidateID, SkillID) VALUES
(1, 1), (1, 3), (1, 4), (1, 5);

-- 10. Insert Job Skills
INSERT INTO JobSkills (JobID, SkillID) VALUES
(1, 1), (1, 2), (1, 6), (1, 7),
(2, 6), (2, 8), (2, 9);

-- 11. Insert Notifications
INSERT INTO Notifications (UserID, Message, Type) VALUES
(1, 'New application received for Frontend Developer', 'application'),
(2, 'Sarah Designer applied for UI/UX Designer', 'application');


