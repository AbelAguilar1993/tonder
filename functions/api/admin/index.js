import { verifyJWT } from "../../utils/jwt.js";
import { createResponse, addCorsHeaders } from "../../utils/cors.js";
import { handleCompaniesRequest } from "./companies.js";
import { handleJobsRequest } from "./jobs.js";
import { handleContactsRequest } from "./contacts.js";
import { handleChildJobsRequest } from "./child-jobs.js";
import { handleAISnapshotsRequest } from "./ai-snapshots.js";
import { handleChipsRequest } from "./chips.js";
import { handleUsersRequest } from "./users.js";

export async function handleAdminRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);

  // Extract admin resource (companies, jobs, contacts, users)
  const resource = pathParts[2]; // /api/admin/{resource}
  const resourceId = pathParts[3]; // /api/admin/{resource}/{id}

  try {
    // Verify JWT and get user
    const authResult = await verifyJWT(request, env);

    if (!authResult || !authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }
    const user = authResult.payload;

    // Check admin role
    if (!["super_admin", "company_admin"].includes(user.role)) {
      return createResponse({ error: "Admin access required" }, 403);
    }

    let response;
    switch (resource) {
      case "companies":
        response = await handleCompaniesRequest(
          method,
          resourceId,
          request,
          env,
          user,
        );
        break;
      case "jobs":
        response = await handleJobsRequest(
          method,
          resourceId,
          request,
          env,
          user,
        );
        break;
      case "child-jobs":
        response = await handleChildJobsRequest(
          method,
          resourceId,
          request,
          env,
          user,
        );
        break;
      case "ai-snapshots":
        response = await handleAISnapshotsRequest(
          method,
          resourceId,
          request,
          env,
          user,
        );
        break;
      case "chips":
        response = await handleChipsRequest(
          method,
          resourceId,
          request,
          env,
          user,
        );
        break;
      case "contacts":
        response = await handleContactsRequest(
          method,
          resourceId,
          request,
          env,
          user,
        );
        break;
      case "users":
        response = await handleUsersRequest(
          method,
          resourceId,
          request,
          env,
          user,
        );
        break;
      case "stats":
        response = await handleStats(method, request, env, user);
        break;
      default:
        return createResponse({ error: "Resource not found" }, 404);
    }

    // Ensure CORS headers are present on all admin responses
    return addCorsHeaders(response);
  } catch (error) {
    console.error("Admin request error:", error);
    return createResponse({ error: "Internal server error" }, 500);
  }
}

// Stats endpoint
async function handleStats(method, request, env, user) {
  if (method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let companiesCount,
      jobsCount,
      childJobsCount,
      aiSnapshotsCount,
      chipsCount,
      contactsCount,
      usersCount;

    if (user.role === "super_admin") {
      // Super admin sees all stats
      const [companies, jobs, childJobs, aiSnapshots, chips, contacts, users] =
        await Promise.all([
          env.DB.prepare("SELECT COUNT(*) as count FROM companies").first(),
          env.DB.prepare("SELECT COUNT(*) as count FROM jobs").first(),
          env.DB.prepare(
            "SELECT COUNT(*) as count FROM child_jobs WHERE is_active = 1",
          ).first(),
          env.DB.prepare(
            "SELECT COUNT(*) as count FROM ai_snapshots WHERE is_active = 1",
          ).first(),
          env.DB.prepare(
            "SELECT COUNT(*) as count FROM chips WHERE is_active = 1",
          ).first(),
          env.DB.prepare("SELECT COUNT(*) as count FROM contacts").first(),
          env.DB.prepare("SELECT COUNT(*) as count FROM users").first(),
        ]);

      companiesCount = companies.count;
      jobsCount = jobs.count;
      childJobsCount = childJobs.count;
      aiSnapshotsCount = aiSnapshots.count;
      chipsCount = chips.count;
      contactsCount = contacts.count;
      usersCount = users.count;
    } else {
      // Company admin sees only their company stats
      const [jobs, childJobs, contacts] = await Promise.all([
        env.DB.prepare(
          "SELECT COUNT(*) as count FROM jobs WHERE company_id = ?",
        )
          .bind(user.company_id)
          .first(),
        env.DB.prepare(
          `
          SELECT COUNT(*) as count FROM child_jobs cj
          LEFT JOIN jobs j ON cj.parent_job_id = j.id
          WHERE j.company_id = ? AND cj.is_active = 1
        `,
        )
          .bind(user.company_id)
          .first(),
        env.DB.prepare(
          "SELECT COUNT(*) as count FROM contacts WHERE company_id = ?",
        )
          .bind(user.company_id)
          .first(),
      ]);

      // AI snapshots and chips are global, so all admins can see them
      const [aiSnapshots, chips] = await Promise.all([
        env.DB.prepare(
          "SELECT COUNT(*) as count FROM ai_snapshots WHERE is_active = 1",
        ).first(),
        env.DB.prepare(
          "SELECT COUNT(*) as count FROM chips WHERE is_active = 1",
        ).first(),
      ]);

      companiesCount = 1; // Their own company
      jobsCount = jobs.count;
      childJobsCount = childJobs.count;
      aiSnapshotsCount = aiSnapshots.count;
      chipsCount = chips.count;
      contactsCount = contacts.count;
      usersCount = 0; // Company admins can't see user stats
    }

    return createResponse({
      companies: companiesCount,
      jobs: jobsCount,
      childJobs: childJobsCount,
      aiSnapshots: aiSnapshotsCount,
      chips: chipsCount,
      contacts: contactsCount,
      users: usersCount,
    });
  } catch (error) {
    return createResponse({ error: "Failed to fetch stats" }, 500);
  }
}
