import { createResponse } from "../../utils/cors.js";
import { CloudflareCache } from "../../utils/cloudflare-cache.js";
import { sendEmail, sendRelayEmail } from "../../utils/email.js";
import {
  getOrCreateConversation,
  storeRelayMessage,
  updateMessageStatus,
  getConversationMessages,
} from "../../utils/relay.js";
import { getInitials } from "../../utils/index.js";

export async function handleJobApplicationsRequest(request, env, user) {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const cache = new CloudflareCache(env);

  // Extract resource info
  const resource = pathParts[2]; // /api/job-applications/{resource}

  try {
    let response;
    if (method === "GET") {
      if (resource === "all") {
        response = await getJobApplications(env, user);
      }
    } else if (method === "POST") {
      if (resource === "send-email") {
        response = await sendEmailToContactor(env, request, user);
      } else if (resource === "save-draft") {
        response = await saveDraft(env, request, user);
      }
    } else {
      return createResponse({ error: "Method not allowed" }, 405);
    }
    return response;
  } catch (error) {
    console.error("Job Applications API error:", error);
    return createResponse(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
}

async function getJobApplications(env, user) {
  try {
    // Get full user details for message display
    const fullUser = await env.DB.prepare(
      `SELECT id, email, first_name, last_name FROM users WHERE id = ?`,
    )
      .bind(user.id)
      .first();

    const stmtJobApplications = await env.DB.prepare(
      `SELECT * FROM user_job_applications WHERE user_id = ?`,
    )
      .bind(user.id)
      .all();

    const { results: applications } = stmtJobApplications;

    const jobApplications = await Promise.all(
      applications.map(async (application) => {
        const job = await env.DB.prepare(`SELECT * FROM jobs WHERE id = ?`)
          .bind(application.job_id)
          .first();
        const company = await env.DB.prepare(
          `SELECT * FROM companies WHERE id = ?`,
        )
          .bind(job?.company_id)
          .first();
        let contact = await env.DB.prepare(
          `SELECT * FROM contacts WHERE id = ?`,
        )
          .bind(application.contact_id)
          .first();
        const draft = await env.DB.prepare(
          `SELECT * FROM drafts WHERE job_application_id = ?`,
        )
          .bind(application.id)
          .first();

        if (application.status != "replied") {
          contact = {
            ...contact,
            email: "Unknown",
            phone: "Unknown",
          };
        }

        // Fetch relay messages if status is replied
        let relayMessages = [];
        if (
          application.status === "replied" &&
          application.job_id &&
          application.contact_id
        ) {
          try {
            // Find conversation for this job application
            const conversation = await env.DB.prepare(
              `SELECT * FROM relay_conversations 
               WHERE user_id = ? AND contact_id = ? AND job_id = ?
               LIMIT 1`,
            )
              .bind(user.id, application.contact_id, application.job_id)
              .first();

            if (conversation) {
              // Get messages for this conversation
              const messages = await getConversationMessages(
                env,
                conversation.id,
                50,
                0,
              );

              // Format messages for frontend
              relayMessages = messages.map((msg) => ({
                id: msg.id,
                type: "message",
                senderName:
                  msg.direction === "user_to_contact"
                    ? `${fullUser?.first_name || "You"} ${
                        fullUser?.last_name || ""
                      }`.trim()
                    : contact?.name || "HR Contact",
                senderEmail: msg.from_real_email,
                senderInitial:
                  msg.direction === "user_to_contact"
                    ? getInitials(
                        `${fullUser?.first_name || "U"} ${
                          fullUser?.last_name || ""
                        }`,
                      )
                    : getInitials(contact?.name || "HR"),
                subject: msg.subject,
                content: msg.message_text,
                timestamp: new Date(msg.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/New_York", // Show as EST
                }),
                isUser: msg.direction === "user_to_contact",
                isPending: msg.status === "pending",
                direction: msg.direction,
                status: msg.status,
              }));

              // Sort messages by creation date (oldest first)
              relayMessages.sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
              );
            }
          } catch (error) {
            console.error("Error fetching relay messages:", error);
            // Continue without messages if there's an error
          }
        }

        return {
          ...application,
          job: job || null,
          company: company || null,
          contact: contact || null,
          preset_chips: JSON.parse(application.preset_chips || "[]"),
          draft:
            application.status == "drafted" || application.status == "sent"
              ? draft
              : null,
          messages: relayMessages, // Add relay messages
        };
      }),
    );

    return createResponse({ success: true, data: { jobApplications } });
  } catch (error) {
    return createResponse(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
}

async function sendEmailToContactor(env, request, user) {
  try {
    const { id, contact_id, subject, message } = await request.json();

    // Validate required fields
    if (!subject || !message) {
      return createResponse({ error: "Subject and message are required" }, 400);
    }

    // Get full user details from database (JWT only has id, email, role, company_id)
    const fullUser = await env.DB.prepare(
      `SELECT id, email, first_name, last_name FROM users WHERE id = ?`,
    )
      .bind(user.id)
      .first();

    if (!fullUser) {
      return createResponse({ error: "User not found" }, 404);
    }

    // Get job application
    const job_application = await env.DB.prepare(
      `SELECT * FROM user_job_applications WHERE id = ? AND user_id = ?`,
    )
      .bind(id, user.id)
      .first();

    if (!job_application) {
      return createResponse({ error: "Job application not found" }, 404);
    }

    // Get contact information
    const contact = await env.DB.prepare(`SELECT * FROM contacts WHERE id = ?`)
      .bind(contact_id)
      .first();

    if (!contact) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    // Get job information for context
    const job = await env.DB.prepare(`SELECT * FROM jobs WHERE id = ?`)
      .bind(job_application.job_id)
      .first();

    // Get company information for context
    let company = null;
    if (job?.company_id) {
      company = await env.DB.prepare(`SELECT * FROM companies WHERE id = ?`)
        .bind(job.company_id)
        .first();
    }

    // Create or get conversation using relay system
    const conversation = await getOrCreateConversation(
      env,
      user.id,
      contact_id,
      job_application.job_id,
      subject,
    );

    // Store relay message in database
    const relayMessage = await storeRelayMessage(env, {
      conversationId: conversation.id,
      direction: "user_to_contact",
      fromEntityType: "user",
      fromEntityId: user.id,
      toEntityType: "contact",
      toEntityId: contact_id,
      fromRelayAddress: conversation.user_relay_address,
      toRelayAddress: conversation.contact_relay_address,
      fromRealEmail: fullUser.email,
      toRealEmail: contact.email,
      subject: subject,
      messageText: message,
      messageHtml: message,
      emailMessageId: null,
      inReplyTo: null,
    });

    // Send email using relay system
    const emailResult = await sendRelayEmail(env, {
      toEmail: contact.email,
      fromName: `${fullUser.first_name} ${fullUser.last_name}`,
      fromRelayAddress: conversation.user_relay_address,
      toRelayAddress: conversation.contact_relay_address,
      subject: subject,
      message: message,
      jobTitle: job?.title || null,
      companyName: company?.name || null,
    });

    // Check if email was sent successfully
    if (!emailResult.success) {
      console.error("Failed to send relay email:", emailResult.error);

      // Update message status to failed
      await updateMessageStatus(env, relayMessage.id, "failed");

      return createResponse(
        {
          error: "Failed to send email",
          details: emailResult.error,
        },
        500,
      );
    }

    // Update message status to sent
    await updateMessageStatus(env, relayMessage.id, "sent");

    // Update conversation's last_message_at timestamp
    await env.DB.prepare(
      `UPDATE relay_conversations SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
      .bind(conversation.id)
      .run();

    // Update job application status to 'sent'
    await env.DB.prepare(
      `UPDATE user_job_applications SET status = 'sent', applied_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(new Date().toISOString(), new Date().toISOString(), id)
      .run();

    return createResponse({
      success: true,
      message: "Email sent successfully via relay system",
      emailId: emailResult.messageId,
      conversationId: conversation.id,
      relayMessageId: relayMessage.id,
    });
  } catch (error) {
    console.error("Send email error:", error);
    return createResponse(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
}

async function saveDraft(env, request, user) {
  try {
    const { job_application_id, subject, message } = await request.json();

    // Verify the job application exists and belongs to the user
    const job_application = await env.DB.prepare(
      `SELECT * FROM user_job_applications WHERE id = ? AND user_id = ?`,
    )
      .bind(job_application_id, user.id)
      .first();

    if (!job_application) {
      return createResponse({ error: "Job application not found" }, 404);
    }

    // Check if draft already exists
    const existingDraft = await env.DB.prepare(
      `SELECT * FROM drafts WHERE job_application_id = ?`,
    )
      .bind(job_application_id)
      .first();

    if (existingDraft) {
      // Update existing draft
      await env.DB.prepare(
        `UPDATE drafts SET subject = ?, message = ?, updated_at = ? WHERE job_application_id = ?`,
      )
        .bind(subject, message, new Date().toISOString(), job_application_id)
        .run();
    } else {
      // Insert new draft
      await env.DB.prepare(
        `INSERT INTO drafts (job_application_id, subject, message) VALUES (?, ?, ?)`,
      )
        .bind(job_application_id, subject, message)
        .run();
    }

    // Update job application status to 'drafted'
    await env.DB.prepare(
      `UPDATE user_job_applications SET status = 'drafted', updated_at = ? WHERE id = ?`,
    )
      .bind(new Date().toISOString(), job_application_id)
      .run();

    return createResponse({
      success: true,
      message: "Draft saved successfully",
    });
  } catch (error) {
    return createResponse(
      { error: "Internal server error", details: error.message },
      500,
    );
  }
}
