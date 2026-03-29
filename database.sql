-- ============================================================
-- LoanIQ — MySQL Database Schema
-- Run once: mysql -u root -p < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS loaniq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE loaniq;

-- Users table: stores all registered normal users
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  username   VARCHAR(80)   NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,
  created_at DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- Predictions table: stores every loan evaluation for every user
CREATE TABLE IF NOT EXISTS predictions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT             NOT NULL,
  applicant_income    DECIMAL(12,2)   NOT NULL,
  co_applicant_income DECIMAL(12,2)   DEFAULT 0,
  employment_type     VARCHAR(50)     NOT NULL,
  age                 INT             NOT NULL,
  dependents          INT             NOT NULL,
  marital_status      VARCHAR(30)     NOT NULL,
  education           VARCHAR(50)     NOT NULL,
  gender              VARCHAR(20)     NOT NULL,
  employer_type       VARCHAR(50)     NOT NULL,
  property_area       VARCHAR(30)     NOT NULL,
  savings             DECIMAL(14,2)   NOT NULL,
  existing_loans      INT             NOT NULL,
  credit_score        INT             NOT NULL,
  dti_ratio           DECIMAL(5,2)    NOT NULL,
  loan_amount         DECIMAL(14,2)   NOT NULL,
  loan_term           INT             NOT NULL,
  loan_purpose        VARCHAR(80)     NOT NULL,
  result              ENUM('Approved','Rejected') NOT NULL,
  score               INT             NOT NULL,
  percentage          INT             NOT NULL,
  reasons             JSON            NOT NULL,
  created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_result  (result),
  INDEX idx_created (created_at)
);
