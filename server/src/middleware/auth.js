import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError(401, "Authentication is required."));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: Number(payload.sub),
      role: payload.role,
      name: payload.name,
      email: payload.email
    };
    next();
  } catch {
    next(new AppError(401, "The authentication token is invalid or expired."));
  }
}
