import CryptoJS from "crypto-js";
import env from "../config/env.js";

export const generateQRToken = (employeeId) => {
  const payload = JSON.stringify({
    employee_id: employeeId,
    issued_at: new Date().toISOString(),
  });

  return CryptoJS.AES.encrypt(payload, env.AES_SECRET).toString();
};

export const decryptQRToken = (token) => {
  try {
    const bytes = CryptoJS.AES.decrypt(token, env.AES_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      return null;
    }

    return JSON.parse(decrypted);
  } catch (error) {
    return null;
  }
};
