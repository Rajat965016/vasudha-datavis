import nodemailer from 'nodemailer';

import env from '../config/env.js';
import logger from './logger.js';

let transporter = null;

/**
 * Email is a bonus feature, so it degrades gracefully: without SMTP settings
 * the message is logged instead of sent and no other feature is blocked.
 */
const getTransporter = () => {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    });
  }
  return transporter;
};

export const isMailEnabled = () => Boolean(env.smtp.host);

export const sendMail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();

  if (!mailer) {
    logger.warn(
      `SMTP not configured — email suppressed. to=${to} subject="${subject}"\n${text}`,
    );
    return { delivered: false, reason: 'smtp-not-configured' };
  }

  try {
    await mailer.sendMail({ from: env.smtp.from, to, subject, text, html });
    logger.info(`Email sent to ${to} — "${subject}"`);
    return { delivered: true };
  } catch (error) {
    // A mail outage must never break account creation or password reset.
    logger.error(`Failed to send email to ${to}:`, error.message);
    return { delivered: false, reason: error.message };
  }
};

const layout = (title, bodyHtml) => `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <h2 style="margin:0 0 16px;font-size:20px;color:#065f46">${title}</h2>
  ${bodyHtml}
  <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />
  <p style="font-size:12px;color:#64748b;margin:0">
    Vasudha Foundation — Climate, Energy &amp; Power Data Platform
  </p>
</div>`;

export const sendAdminWelcomeEmail = ({ name, email, password, loginUrl }) =>
  sendMail({
    to: email,
    subject: 'Your Vasudha data platform admin account',
    text: [
      `Hello ${name},`,
      '',
      'An Admin account has been created for you on the Vasudha Climate, Energy & Power data platform.',
      '',
      `Sign in: ${loginUrl}`,
      `Email:    ${email}`,
      `Password: ${password}`,
      '',
      'Please sign in and change this password right away.',
    ].join('\n'),
    html: layout(
      'Your admin account is ready',
      `<p>Hello ${name},</p>
       <p>An Admin account has been created for you on the Vasudha Climate, Energy &amp; Power data platform.</p>
       <table style="border-collapse:collapse;margin:16px 0">
         <tr><td style="padding:6px 12px 6px 0;color:#64748b">Email</td><td style="padding:6px 0"><b>${email}</b></td></tr>
         <tr><td style="padding:6px 12px 6px 0;color:#64748b">Temporary password</td><td style="padding:6px 0"><b>${password}</b></td></tr>
       </table>
       <p><a href="${loginUrl}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Sign in</a></p>
       <p style="color:#b45309">Please change this password immediately after your first sign-in.</p>`,
    ),
  });

export const sendPasswordResetEmail = ({ name, email, resetUrl, ttlMinutes }) =>
  sendMail({
    to: email,
    subject: 'Reset your Vasudha data platform password',
    text: [
      `Hello ${name},`,
      '',
      'We received a request to reset your password.',
      `Open this link within ${ttlMinutes} minutes to choose a new one:`,
      resetUrl,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: layout(
      'Reset your password',
      `<p>Hello ${name},</p>
       <p>We received a request to reset your password. This link expires in <b>${ttlMinutes} minutes</b>.</p>
       <p><a href="${resetUrl}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Choose a new password</a></p>
       <p style="font-size:12px;color:#64748b;word-break:break-all">${resetUrl}</p>
       <p>If you did not request this, you can safely ignore this email.</p>`,
    ),
  });

export const sendDatasetReviewEmail = ({ name, email, title, status, reason, dashboardUrl }) => {
  const approved = status === 'APPROVED';
  return sendMail({
    to: email,
    subject: `Dataset ${approved ? 'approved' : 'rejected'}: ${title}`,
    text: [
      `Hello ${name},`,
      '',
      `Your dataset "${title}" has been ${approved ? 'approved and published' : 'rejected'} by the Super Admin.`,
      ...(reason ? ['', `Reason: ${reason}`] : []),
      '',
      `Dashboard: ${dashboardUrl}`,
    ].join('\n'),
    html: layout(
      `Dataset ${approved ? 'approved' : 'rejected'}`,
      `<p>Hello ${name},</p>
       <p>Your dataset <b>${title}</b> has been ${approved ? 'approved and is now live on the public site' : 'rejected'}.</p>
       ${reason ? `<p style="color:#b45309"><b>Reason:</b> ${reason}</p>` : ''}
       <p><a href="${dashboardUrl}" style="background:#047857;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open dashboard</a></p>`,
    ),
  });
};
