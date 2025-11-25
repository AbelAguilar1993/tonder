import { createResponse } from "../../../utils/cors.js";
import { handleCreateIntent } from "./create-intent.js";
import { handleCharge } from "./charge.js";
import { handleWebhook } from "./webhook.js";
import { handleStatus } from "./status.js";

export async function handleTonderRequest(request, env, user = null) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[4];

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
    if (action === "status" && pathParts[5]) {
      return await handleStatus(request, env, pathParts[5]);
    }
  }

  return createResponse({ error: "Action not found" }, 404);
}
