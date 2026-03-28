import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

let pool = null;

export const connectDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to Hirely Database');
    return pool;
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
    setTimeout(connectDB, 5000);
    throw error;
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return pool;
};

export { sql };