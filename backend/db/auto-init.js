import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const ADMIN_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS \`admin\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`email\` varchar(255) NOT NULL,
  \`password_hash\` varchar(255) NOT NULL,
  \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

const SYSTEM_SETTINGS_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`system_settings\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`setting_key\` varchar(100) NOT NULL,
  \`setting_value\` text,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`setting_key\` (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

const SYSTEM_SETTINGS_INSERT_SQL = `
INSERT IGNORE INTO \`system_settings\` (\`setting_key\`, \`setting_value\`) VALUES
('system_name', 'GT Electricals'),
('system_logo_url', NULL);
`;

/**
 * Checks if database exists and has tables
 */
async function checkDatabaseExists() {
  const connection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
  });

  try {
    // Check if database exists
    const [databases] = await connection.query(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
      [DB_CONFIG.database],
    );

    if (databases.length === 0) {
      return false;
    }

    // Check if database has tables
    await connection.query(`USE \`${DB_CONFIG.database}\``);
    const [tables] = await connection.query(
      "SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [DB_CONFIG.database],
    );

    return tables[0].count > 0;
  } finally {
    await connection.end();
  }
}

async function ensureAdminTable(connection) {
  const [tables] = await connection.query(
    "SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin'",
    [DB_CONFIG.database],
  );

  if (tables[0].count === 0) {
    await connection.query(ADMIN_TABLE_SQL);
    console.log("✓ Admin auth table created\n");
  }

  const [stTables] = await connection.query(
    "SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'system_settings'",
    [DB_CONFIG.database],
  );

  if (stTables[0].count === 0) {
    await connection.query(SYSTEM_SETTINGS_CREATE_SQL);
    // run inserts separately so we don't rely on multipleStatements being enabled
    await connection.query(SYSTEM_SETTINGS_INSERT_SQL);
    console.log("✓ System settings table created\n");
  }

  const [purchaseStatusColumn] = await connection.query(
    "SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchases' AND COLUMN_NAME = 'status'",
    [DB_CONFIG.database],
  );

  if (purchaseStatusColumn[0].count === 0) {
    await connection.query(
      "ALTER TABLE purchases ADD COLUMN status enum('active','canceled') NOT NULL DEFAULT 'active' AFTER created_at",
    );
    console.log("✓ Purchases status column added\n");
  }

  const [serializedColumn] = await connection.query(
    "SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_serialized'",
    [DB_CONFIG.database],
  );

  if (serializedColumn[0].count === 0) {
    await connection.query(
      "ALTER TABLE products ADD COLUMN is_serialized tinyint(1) NOT NULL DEFAULT 0 AFTER stock_quantity",
    );
    console.log("✓ Products serialized column added\n");
  }

  const [salesStatusColumn] = await connection.query(
    "SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'status'",
    [DB_CONFIG.database],
  );

  if (salesStatusColumn[0].count === 0) {
    await connection.query(
      "ALTER TABLE sales ADD COLUMN status enum('active','canceled') NOT NULL DEFAULT 'active' AFTER sale_date",
    );
    console.log("✓ Sales status column added\n");
  }
}

/**
 * Auto-initializes database if it doesn't exist
 */
async function autoInitialize() {
  console.log("\n🔍 Checking database status...");

  const exists = await checkDatabaseExists();

  if (exists) {
    const connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
    });

    try {
      await ensureAdminTable(connection);
    } finally {
      await connection.end();
    }

    console.log(`✓ Database '${DB_CONFIG.database}' is ready\n`);
    return;
  }

  console.log(`⚠ Database '${DB_CONFIG.database}' not found or empty`);
  console.log("🚀 Auto-initializing database...\n");

  const connection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    multipleStatements: true,
  });

  try {
    // Create database
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``,
    );
    await connection.query(`USE \`${DB_CONFIG.database}\``);

    // Load and execute schema
    const schemaPath = path.join(__dirname, "electrical_pos.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf8");
    await connection.query(schemaSql);
    await ensureAdminTable(connection);

    console.log(
      "✓ Database initialized successfully using electrical_pos.sql\n",
    );
  } finally {
    await connection.end();
  }
}

export default autoInitialize;
