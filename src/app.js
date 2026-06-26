import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import "./config/env.js";
import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "ESROM BirrBalance API is running" });
});

export default app;
