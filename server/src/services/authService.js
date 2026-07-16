import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { AppError } from "../utils/AppError.js";
import { requireEmail, requireText } from "../utils/validation.js";
import { createToken } from "./tokenService.js";

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function registerStudent(payload) {
  const name = requireText(payload.name, "Name", 100);
  const email = requireEmail(payload.email);
  const password = requireText(payload.password, "Password", 200);
  if (password.length < 6) {
    throw new AppError(400, "Password must contain at least 6 characters.");
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'student')
     RETURNING id, name, email, role`,
    [name, email, passwordHash]
  );
  const user = publicUser(result.rows[0]);
  return { user, token: createToken(user) };
}

export async function login(payload) {
  const email = requireEmail(payload.email);
  const password = requireText(payload.password, "Password", 200);
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const row = result.rows[0];

  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw new AppError(401, "Email or password is incorrect.");
  }

  const user = publicUser(row);
  return { user, token: createToken(user) };
}

export async function getCurrentUser(userId) {
  const result = await pool.query(
    "SELECT id, name, email, role FROM users WHERE id = $1",
    [userId]
  );
  if (!result.rowCount) throw new AppError(404, "User was not found.");
  return publicUser(result.rows[0]);
}
