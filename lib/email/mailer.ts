/**
 * SMTP mailer — SERVER-ONLY module.
 *
 * Builds a Nodemailer SMTP transport entirely from environment variables and
 * exposes a small {@link Mailer} that sends the owner order-notification email.
 * There are NO AWS dependencies anywhere (project constraint; Req 9.2): email is
 * delivered through a generic, provider-agnostic SMTP endpoint whose host, port,
 * credentials, and addresses all come from env vars.
 *
 * This module must never be imported by client components — it reads secrets
 * from `process.env` and talks to an SMTP server. Secret values (SMTP_USER,
 * SMTP_PASS, …) are never logged and never embedded in thrown error messages;
 * configuration errors name only the missing variable, not its value.
 *
 * Requirements:
 *   9.1 — when an order passes backend validation, send a notification email to
 *         the owner address.
 *   9.2 — send via a non-AWS backend (SMTP).
 *   9.3 — read the owner address and all email credentials from env vars.
 *   18.1 — store credentials/secrets in environment variables.
 */

import nodemailer from "nodemailer";

/** The order-notification content to deliver to the owner. */
export interface SendOrderEmailParams {
  /** Email subject line (already formatted by the template builder). */
  subject: string;
  /** HTML body, rendered readably on mobile email clients. */
  html: string;
  /** Plain-text fallback body. */
  text: string;
}

/** Sends the owner order-notification email. */
export interface Mailer {
  /**
   * Sends one order-notification email from the configured `MAIL_FROM` address
   * to the configured `OWNER_EMAIL` address. Rejects if the underlying SMTP
   * send fails (the caller maps this to `EMAIL_FAILED`; Req 20.4).
   */
  sendOrderEmail(params: SendOrderEmailParams): Promise<void>;
}

/** SMTP + address configuration resolved from the environment. */
export interface MailerConfig {
  /** SMTP server hostname (SMTP_HOST). */
  host: string;
  /** SMTP server port (SMTP_PORT, parsed as an integer). */
  port: number;
  /** SMTP auth username (SMTP_USER). */
  user: string;
  /** SMTP auth password/secret (SMTP_PASS). Never logged. */
  pass: string;
  /** Envelope/From address (MAIL_FROM). */
  from: string;
  /** Recipient owner address (OWNER_EMAIL). */
  to: string;
  /** Whether to use an implicit-TLS connection (SMTP_SECURE === "true"). */
  secure: boolean;
}

/** Minimal transport contract we depend on — satisfied by a Nodemailer transport. */
export interface TransportLike {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<unknown>;
}

/** Env var names for the required string settings (used for clear error messages). */
const REQUIRED_STRING_VARS = [
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
  "OWNER_EMAIL",
] as const;

/** Returns the trimmed value of `name`, or `undefined` if unset/blank. */
function readVar(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Resolves the SMTP configuration from environment variables.
 *
 * Reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, OWNER_EMAIL, and
 * the optional SMTP_SECURE ("true" ⇒ implicit TLS). Throws a clear `Error` that
 * names every MISSING or invalid required variable — the error text contains
 * only variable names, never any secret value (Req 9.3, 18.1).
 *
 * @throws Error when any required variable is missing or SMTP_PORT is not a
 *         positive integer.
 */
export function getMailerConfigFromEnv(): MailerConfig {
  const missing: string[] = [];

  const host = readVar("SMTP_HOST");
  if (host === undefined) missing.push("SMTP_HOST");

  const user = readVar("SMTP_USER");
  if (user === undefined) missing.push("SMTP_USER");

  const pass = readVar("SMTP_PASS");
  if (pass === undefined) missing.push("SMTP_PASS");

  const from = readVar("MAIL_FROM");
  if (from === undefined) missing.push("MAIL_FROM");

  const to = readVar("OWNER_EMAIL");
  if (to === undefined) missing.push("OWNER_EMAIL");

  // SMTP_PORT is required and must parse to a positive integer.
  const rawPort = readVar("SMTP_PORT");
  let port = Number.NaN;
  if (rawPort === undefined) {
    missing.push("SMTP_PORT");
  } else {
    port = Number.parseInt(rawPort, 10);
    if (!Number.isInteger(port) || port <= 0) {
      // Report by name only; never echo the (possibly sensitive) raw value.
      missing.push("SMTP_PORT (must be a positive integer)");
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing or invalid SMTP configuration environment variable(s): ${missing.join(
        ", ",
      )}.`,
    );
  }

  // SMTP_SECURE is optional; implicit TLS only when explicitly "true".
  const secure = (readVar("SMTP_SECURE") ?? "").toLowerCase() === "true";

  return {
    host: host as string,
    port,
    user: user as string,
    pass: pass as string,
    from: from as string,
    to: to as string,
    secure,
  };
}

/**
 * Wraps an already-built transport in a {@link Mailer}. Keeping the transport
 * injectable lets tests pass a mock `sendMail` (Task 11.2) without any real SMTP
 * connection. `from`/`to` are captured here so callers cannot accidentally send
 * to an unconfigured address.
 */
export function createMailerWithTransport(
  transport: TransportLike,
  from: string,
  to: string,
): Mailer {
  return {
    async sendOrderEmail({ subject, html, text }: SendOrderEmailParams): Promise<void> {
      await transport.sendMail({ from, to, subject, html, text });
    },
  };
}

/**
 * Builds the default production {@link Mailer} from environment configuration:
 * resolves the config (Req 9.3), creates a Nodemailer SMTP transport, and binds
 * it to the configured From/To addresses. Credentials stay inside the transport
 * and are never logged.
 *
 * @throws Error when required SMTP configuration env vars are missing/invalid.
 */
export function createMailer(): Mailer {
  const { host, port, secure, user, pass, from, to } = getMailerConfigFromEnv();

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return createMailerWithTransport(transport, from, to);
}
