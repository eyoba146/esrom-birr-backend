import dotenv from "dotenv";
dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  AES_SECRET: process.env.AES_SECRET,
  NODE_ENV: process.env.NODE_ENV || "development",
};

const requiredVars = ["JWT_SECRET", "AES_SECRET"];

for (const key of requiredVars) {
  if (!env[key]) {
    process.exit(1);
  }
}

export default env;
