import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { authRouter } from "./routes/authRoutes.js";
import { examRouter } from "./routes/examRoutes.js";
import { submissionRouter } from "./routes/submissionRoutes.js";
import { dashboardRouter } from "./routes/dashboardRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "examflow-api" }));
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/exams", examRouter);
app.use("/api/submissions", submissionRouter);

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public");
if (fs.existsSync(publicDirectory)) {
  app.use(express.static(publicDirectory));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && req.accepts("html")) {
      return res.sendFile(path.join(publicDirectory, "index.html"));
    }
    next();
  });
}

app.use(notFound);
app.use(errorHandler);
