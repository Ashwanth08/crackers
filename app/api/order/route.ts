/**
 * POST /api/order — SERVER-ONLY Next.js App Router route handler.
 *
 * This module is intentionally THIN. Next.js App Router route modules may only
 * export recognised route handlers (GET/POST/…) and config (`runtime`,
 * `dynamic`, …); exporting anything else breaks `next build` with a generated
 * route-type error. The full order pipeline therefore lives in the sibling
 * module `./handler` ({@link handleOrder}, {@link OrderDeps}), and this file
 * exports ONLY `runtime` and `POST`.
 *
 * `POST` builds the default production dependencies (file-backed Order ID and
 * idempotency stores + a Nodemailer-based mailer), parses the JSON body, runs
 * {@link handleOrder}, and serialises the result to a JSON `Response`.
 *
 * The route forces the Node.js runtime because the stores and the mailer use
 * `node:fs/promises` and Nodemailer, which are unavailable on the Edge
 * runtime.
 *
 * Secret values are never placed in any response or message; mailer
 * configuration failures are logged server-side only and surfaced as a generic
 * `SERVER_ERROR`.
 *
 * Requirements: 8.9, 8.10, 8.11, 8.12, 9.1, 11.1, 11.4, 12.5, 18.2, 18.3,
 *   18.4, 18.5, 20.3, 20.4.
 */

import { handleOrder, type OrderDeps, type HandleOrderResult } from "./handler";
import { FileOrderIdStore } from "../../../lib/orderId";
import { FileIdempotencyStore } from "../../../lib/idempotency";
import { createMailer } from "../../../lib/email/mailer";

/** The stores and mailer use the Node runtime (fs, Nodemailer). */
export const runtime = "nodejs";

/** Serialize a `HandleOrderResult` into a JSON `Response`. */
function toResponse(result: HandleOrderResult): Response {
  return new Response(JSON.stringify(result.response), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * App Router POST handler. Builds the default production dependencies, parses
 * the JSON body, runs {@link handleOrder}, and returns the JSON response.
 *
 * Mailer construction can throw when SMTP env vars are missing/invalid; that is
 * caught and reported as a generic `SERVER_ERROR` (status 500) with the real
 * cause logged server-side only, so no secret or configuration detail leaks to
 * the client (Req 18.2, 18.3).
 */
export async function POST(request: Request): Promise<Response> {
  // Build dependencies. Mailer construction may throw on missing env config.
  let deps: OrderDeps;
  try {
    deps = {
      orderIdStore: new FileOrderIdStore(),
      idempotencyStore: new FileIdempotencyStore(),
      mailer: createMailer(),
    };
  } catch (err) {
    console.error("Failed to initialise order dependencies", err);
    return toResponse({
      status: 500,
      response: {
        success: false,
        errorCode: "SERVER_ERROR",
        message: "Something went wrong on our end. Please try again later.",
      },
    });
  }

  // Parse the request body as JSON; a parse failure is a malformed request.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toResponse({
      status: 400,
      response: {
        success: false,
        errorCode: "VALIDATION",
        message: "Malformed request.",
      },
    });
  }

  try {
    const result = await handleOrder(body, deps);
    return toResponse(result);
  } catch (err) {
    // Unexpected failure — log server-side, return a generic error.
    console.error("Unexpected error handling order", err);
    return toResponse({
      status: 500,
      response: {
        success: false,
        errorCode: "SERVER_ERROR",
        message: "Something went wrong on our end. Please try again later.",
      },
    });
  }
}
