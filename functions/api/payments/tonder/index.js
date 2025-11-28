import { createResponse } from "../../../utils/cors.js";
import { handleCreateIntent } from "./create-intent.js";
import { handleCharge } from "./charge.js";
import { handleWebhook } from "./webhook.js";
import { handleStatus } from "./status.js";

export async function handleTonderRequest(request, env, user = null) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  // For /api/payments/tonder/create-intent
  // pathParts = ["api", "payments", "tonder", "create-intent"]
  // So action is at index 3, not 4
  const action = pathParts[3];

  if (method === "POST") {
    if (action === "create-intent") {
      return await handleCreateIntent(request, env, user);
    }
    if (action === "charge") {
      return await handleCharge(request, env, user);
    }
    if (action === "webhook") {
      return await handleWebhook(request, env);
    }
  }

  if (method === "GET") {
    // For /api/payments/tonder/status/PAYMENT_ID
    // pathParts = ["api", "payments", "tonder", "status", "PAYMENT_ID"]
    // So action is at index 3, paymentId is at index 4
    if (action === "status" && pathParts[4]) {
      return await handleStatus(request, env, pathParts[4]);
    }
  }

  return createResponse({ error: "Action not found" }, 404);
}
