import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import "./config/env.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { UPLOAD_ROOT } from "./middleware/upload.middleware.js";
import "./jobs/balanceExpiration.job.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_ROOT));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "ESROM BirrBalance API is running" });
});

app.use(notFound);
app.use(errorHandler);

export default app;
