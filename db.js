import mysql from "mysql";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  connectionLimit: 10, // up to 10 concurrent connections
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME ,
});

// Test connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error connecting to database:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Connected to MySQL database!");
    connection.release();
  }
});

// Wrap db.query in a promise to use async/await
export const query = (sql, values) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

export default db;
