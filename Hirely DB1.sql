CREATE DATABASE HirelyDB;
GO

USE HirelyDB;
GO

CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
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
    CompanyID INT,
    Title NVARCHAR(150),
    Description NVARCHAR(MAX),
    ExperienceLevel NVARCHAR(100),
    Location NVARCHAR(100),
    JobType NVARCHAR(50),
    WorkMode NVARCHAR(50),
    Deadline DATE,
    Status NVARCHAR(50) DEFAULT 'Open',

    FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID)
    ON DELETE CASCADE
);

CREATE TABLE Applications (
    ApplicationID INT PRIMARY KEY IDENTITY(1,1),
    CandidateID INT,
    JobID INT,
    AppliedDate DATETIME DEFAULT GETDATE(),
    Status NVARCHAR(50) DEFAULT 'Pending',

    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID),
    FOREIGN KEY (JobID) REFERENCES Jobs(JobID)
    ON DELETE CASCADE
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
    Status NVARCHAR(50) DEFAULT 'Pending',

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
    JobID INT,
    MatchPercentage FLOAT,
    MissingSkills NVARCHAR(MAX),
    EligibilityStatus NVARCHAR(50),

    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID),
    FOREIGN KEY (JobID) REFERENCES Jobs(JobID)
);