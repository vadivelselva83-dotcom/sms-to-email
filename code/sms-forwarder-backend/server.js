import express from "express";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import twilio from "twilio";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const STORAGE_FILE = path.join(__dirname, "storage.json");

async function readStorage() {
  try {
    if (!(await fs.pathExists(STORAGE_FILE))) {
      const initial = { enabled: true, allowedSenderE164: "", destinationEmail: "" };
      await fs.writeJson(STORAGE_FILE, initial, { spaces: 2 });
      return initial;
    }
    return await fs.readJson(STORAGE_FILE);
  } catch {
    return { enabled: false, allowedSenderE164: "", destinationEmail: "" };
  }
}
async function writeStorage(data) { await fs.writeJson(STORAGE_FILE, data, { spaces: 2 }); }

function normalizeE164(num) {
  if (!num) return "";
  const cleaned = num.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

let emailMode = "sendgrid";
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else if (process.env.SMTP_HOST) {
  emailMode = "smtp";
}
const MAIL_FROM = process.env.MAIL_FROM || "no-reply@example.com";
async function sendEmail({ to, subject, text }) {
  if (emailMode === "sendgrid") {
    await sgMail.send({ to, from: MAIL_FROM, subject, text });
  } else {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({ from: MAIL_FROM, to, subject, text });
  }
}

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/config", async (_req, res) => res.json(await readStorage()));
app.post("/config", async (req, res) => {
  const { enabled, allowedSenderE164, destinationEmail } = req.body || {};
  if (typeof enabled !== "boolean" || !destinationEmail) return res.status(400).json({ error: "Invalid payload" });
  const updated = { enabled, allowedSenderE164: normalizeE164(allowedSenderE164), destinationEmail: String(destinationEmail).trim() };
  await writeStorage(updated);
  res.json({ ok: true, config: updated });
});

app.post("/twilio/sms", twilio.webhook({ validate: true, protocol: "https" }), async (req, res) => {
  try {
    const config = await readStorage();
    if (!config.enabled) return res.type("text/xml").send("<Response></Response>");
    const { From, Body } = req.body || {};
    const sender = normalizeE164(From);
    if (!config.allowedSenderE164 || sender !== config.allowedSenderE164) return res.type("text/xml").send("<Response></Response>");
    await sendEmail({ to: config.destinationEmail, subject: `SMS from ${sender}`, text: `From: ${sender}\n\n${Body || "(no body)"}` });
    res.type("text/xml").send("<Response></Response>");
  } catch {
    res.type("text/xml").send("<Response></Response>");
  }
});

app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
