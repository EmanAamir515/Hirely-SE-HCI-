CREATE DATABASE HirelyDB;
GO

USE HirelyDB;
GO

CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    PassHire NVARCHAR(120) NOT NULL,
    Phone NVARCHAR(20),
    Role NVARCHAR(20) CHECK (Role IN ('Candidate','Company')),
    CreatedAt DATETIME DEFAULT GETDATE()
);

select * from Candidates

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
