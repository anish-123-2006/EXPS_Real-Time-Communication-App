//problem: everytime we save a file, development seerver(tsx watch) restart evrytime,it create a new db connection everytime, which will create  hundresd of connections and neon will crash 

// solution: we create this file ,We create a single, reusable instance of the Prisma Client

import 'dotenv/config';
import pkg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client/index.js';

const { Pool } = pkg;

// 1. Create a connection pool using your Neon database URL from .env
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Initialize the Prisma PostgreSQL adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter into the PrismaClient constructor
const prisma = new PrismaClient({ adapter });

export default prisma;