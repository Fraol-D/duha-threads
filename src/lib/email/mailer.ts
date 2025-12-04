import nodemailer from "nodemailer";
import { env } from "@/config/env";

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_SERVER_HOST,
      port: env.EMAIL_SERVER_PORT,
      secure: env.EMAIL_SERVER_PORT === 465,
      auth: {
        user: env.EMAIL_SERVER_USER,
        pass: env.EMAIL_SERVER_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMail(payload: MailPayload) {
  const tx = getTransporter();
  await tx.sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}
