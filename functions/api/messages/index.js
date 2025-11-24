/**
 * Messages API Handler
 * Handles message relay system between users and HR contacts
 *
 * Features:
 * - Send messages from user to HR contact
 * - Receive incoming replies via webhook
 * - Get conversation history
 * - Privacy-preserving email relay (like Craigslist/Airbnb)
 */

import { createResponse } from "../../utils/cors.js";
import { verifyToken } from "../../utils/jwt.js";
import { executeQuery, executeQueryFirst } from "../../utils/database.js";
import {
  generateRelayAddress,
  getEntityFromRelayAddress,
  getOrCreateConversation,
  storeRelayMessage,
  updateMessageStatus,
  parseIncomingEmail,
  detectSpam,
  getConversationMessages,
  getUserConversations,
  getContactConversations,
  findConversationByRelayAddresses,
} from "../../utils/relay.js";
import { sendRelayEmail } from "../../utils/email.js";

/**
 * Main handler for message requests
 */
export async function handleMessagesRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/messages/send - Send a message
  if (path === "/api/messages/send" && request.method === "POST") {
    return await sendMessage(request, env);
  }

  // POST /api/messages/incoming - Handle incoming email webhook from Mailgun
  if (path === "/api/messages/incoming" && request.method === "POST") {
    return await handleIncomingMessage(request, env);
  }

  // GET /api/messages - Get user's conversations
  if (path === "/api/messages" && request.method === "GET") {
    return await getConversations(request, env);
  }

  // GET /api/messages/:conversationId - Get specific conversation messages
  if (path.match(/^\/api\/messages\/\d+$/) && request.method === "GET") {
    const conversationId = parseInt(path.split("/").pop());
    return await getConversationHistory(request, env, conversationId);
  }

  // PUT /api/messages/:messageId/status - Update message status (for delivery tracking)
  if (
    path.match(/^\/api\/messages\/\d+\/status$/) &&
    request.method === "PUT"
  ) {
    const messageId = parseInt(path.split("/")[3]);
    return await updateMessageStatusEndpoint(request, env, messageId);
  }

  return createResponse({ error: "Messages endpoint not found" }, 404);
}

/**
 * Send a message from user to HR contact
 * POST /api/messages/send
 *
 * Body:
 * {
 *   "to_contact_id": 123,
 *   "job_id": 456,  // optional
 *   "subject": "Interested in the position",
 *   "message": "Hello, I'd like to apply..."
 * }
 */
async function sendMessage(request, env) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request, env);
    if (!authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = authResult.payload.userId;
    const data = await request.json();

    // Validate required fields
    if (!data.to_contact_id || !data.subject || !data.message) {
      return createResponse(
        {
          error: "Missing required fields: to_contact_id, subject, message",
        },
        400,
      );
    }

    // Get user details
    const user = await executeQueryFirst(
      env,
      "SELECT id, email, first_name, last_name FROM users WHERE id = ?",
      [userId],
    );

    if (!user) {
      return createResponse({ error: "User not found" }, 404);
    }

    // Get contact details
    const contact = await executeQueryFirst(
      env,
      `SELECT c.*, comp.name as company_name 
       FROM contacts c
       LEFT JOIN companies comp ON c.company_id = comp.id
       WHERE c.id = ?`,
      [data.to_contact_id],
    );

    if (!contact) {
      return createResponse({ error: "Contact not found" }, 404);
    }

    if (!contact.email) {
      return createResponse(
        { error: "Contact does not have an email address" },
        400,
      );
    }

    // Get job details if job_id is provided
    let job = null;
    if (data.job_id) {
      job = await executeQueryFirst(
        env,
        "SELECT id, title FROM jobs WHERE id = ?",
        [data.job_id],
      );
    }

    // Check if user has unlocked this contact
    const hasUnlocked = await executeQueryFirst(
      env,
      "SELECT id FROM user_unlocked_contacts WHERE user_id = ? AND contact_id = ?",
      [userId, data.to_contact_id],
    );

    if (!hasUnlocked) {
      return createResponse(
        {
          error:
            "You must unlock this contact before sending a message. This requires 1 credit.",
        },
        403,
      );
    }

    // Spam detection
    const spamCheck = detectSpam(data.subject, data.message);
    if (spamCheck.isSpam) {
      return createResponse(
        {
          error:
            "Your message was flagged as potential spam. Please review the content and try again.",
        },
        400,
      );
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(
      env,
      userId,
      data.to_contact_id,
      data.job_id || null,
      data.subject,
    );

    // Generate relay addresses
    const userRelayAddress = conversation.user_relay_address;
    const contactRelayAddress = conversation.contact_relay_address;

    // Store message in database
    const message = await storeRelayMessage(env, {
      conversationId: conversation.id,
      direction: "user_to_contact",
      fromEntityType: "user",
      fromEntityId: userId,
      toEntityType: "contact",
      toEntityId: data.to_contact_id,
      fromRelayAddress: userRelayAddress,
      toRelayAddress: contactRelayAddress,
      fromRealEmail: user.email,
      toRealEmail: contact.email,
      subject: data.subject,
      messageText: data.message,
      messageHtml: null,
      emailMessageId: null,
      inReplyTo: null,
    });

    // Send email via relay system
    const emailResult = await sendRelayEmail(env, {
      toEmail: contact.email,
      fromName: `${user.first_name} ${user.last_name}`,
      fromRelayAddress: userRelayAddress,
      toRelayAddress: contactRelayAddress,
      subject: data.subject,
      message: data.message,
      jobTitle: job ? job.title : null,
      companyName: contact.company_name,
    });

    if (!emailResult.success) {
      // Update message status to failed
      await updateMessageStatus(env, message.id, "failed");

      return createResponse(
        {
          error: "Failed to send message",
          details: emailResult.error,
        },
        500,
      );
    }

    // Update message status to sent
    await updateMessageStatus(env, message.id, "sent");

    return createResponse({
      success: true,
      message: "Message sent successfully",
      conversation_id: conversation.id,
      message_id: message.id,
      relay: {
        from: userRelayAddress,
        to: contactRelayAddress,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return createResponse(
      {
        error: "Failed to send message",
        details: error.message,
      },
      500,
    );
  }
}

/**
 * Handle incoming email from Mailgun webhook
 * POST /api/messages/incoming
 *
 * This endpoint receives replies from HR contacts when they reply to relay emails
 */
async function handleIncomingMessage(request, env) {
  try {
    // Verify webhook signature (Mailgun authentication)
    const signature = request.headers.get("X-Mailgun-Signature");
    const timestamp = request.headers.get("X-Mailgun-Timestamp");
    const token = request.headers.get("X-Mailgun-Token");

    console.log("Signature:", signature);
    console.log("Timestamp:", timestamp);
    console.log("Token:", token);

    // Verify Mailgun webhook signature for security
    // const isValidSignature = await verifyMailgunSignature(
    //   signature,
    //   timestamp,
    //   token,
    //   env.MAILGUN_API_KEY
    // );

    // if (!isValidSignature) {
    //   console.error("Invalid Mailgun webhook signature");
    //   return createResponse({ error: "Unauthorized - Invalid signature" }, 401);
    // }

    // Parse form data from Mailgun
    const formData = await request.formData();
    const emailData = {};
    for (const [key, value] of formData.entries()) {
      emailData[key] = value;
    }

    // Parse the incoming email
    const parsedEmail = parseIncomingEmail(emailData);

    console.log("Incoming email:", {
      from: parsedEmail.from,
      to: parsedEmail.to,
      subject: parsedEmail.subject,
    });

    // Extract relay addresses from the email
    // Mailgun sends: from = "hr@prosegur.com", to = "user123@relay.empleosafari.com"
    const toRelayAddress = parsedEmail.to.toLowerCase();
    const fromRealEmail = parsedEmail.from.toLowerCase();

    // Get the entity who should receive this message
    const recipientEntity = await getEntityFromRelayAddress(
      env,
      toRelayAddress,
    );

    if (!recipientEntity) {
      console.error("Recipient not found for relay address:", toRelayAddress);
      return createResponse({ error: "Recipient not found" }, 404);
    }

    // Find the conversation based on the relay address
    // We need to find which contact sent this (by matching their real email)
    let conversation = null;
    let senderEntity = null;

    if (recipientEntity.type === "user") {
      // This is a reply from HR to user
      // Find the contact by email
      const contact = await executeQueryFirst(
        env,
        "SELECT id FROM contacts WHERE LOWER(email) = ?",
        [fromRealEmail],
      );

      if (!contact) {
        console.error("Sender contact not found:", fromRealEmail);
        return createResponse({ error: "Sender not found" }, 404);
      }

      senderEntity = await getEntityFromRelayAddress(
        env,
        await generateRelayAddress(env, "contact", contact.id),
      );

      // Find conversation between this user and contact
      conversation = await executeQueryFirst(
        env,
        `SELECT * FROM relay_conversations 
         WHERE user_id = ? AND contact_id = ? AND status = 'active'
         ORDER BY last_message_at DESC
         LIMIT 1`,
        [recipientEntity.id, contact.id],
      );
    } else {
      // This is a message from user to HR (shouldn't happen via this webhook)
      // But we'll handle it anyway
      const user = await executeQueryFirst(
        env,
        "SELECT id FROM users WHERE LOWER(email) = ?",
        [fromRealEmail],
      );

      if (!user) {
        console.error("Sender user not found:", fromRealEmail);
        return createResponse({ error: "Sender not found" }, 404);
      }

      senderEntity = await getEntityFromRelayAddress(
        env,
        await generateRelayAddress(env, "user", user.id),
      );

      conversation = await executeQueryFirst(
        env,
        `SELECT * FROM relay_conversations 
         WHERE user_id = ? AND contact_id = ? AND status = 'active'
         ORDER BY last_message_at DESC
         LIMIT 1`,
        [user.id, recipientEntity.id],
      );
    }

    if (!conversation) {
      console.error("Conversation not found");
      return createResponse({ error: "Conversation not found" }, 404);
    }

    // Spam detection
    const spamCheck = detectSpam(parsedEmail.subject, parsedEmail.text);

    // Determine direction
    const direction =
      recipientEntity.type === "user" ? "contact_to_user" : "user_to_contact";

    // Store the incoming message
    const message = await storeRelayMessage(env, {
      conversationId: conversation.id,
      direction: direction,
      fromEntityType: senderEntity.type,
      fromEntityId: senderEntity.id,
      toEntityType: recipientEntity.type,
      toEntityId: recipientEntity.id,
      fromRelayAddress:
        senderEntity.type === "user"
          ? conversation.user_relay_address
          : conversation.contact_relay_address,
      toRelayAddress: toRelayAddress,
      fromRealEmail: fromRealEmail,
      toRealEmail: recipientEntity.email,
      subject: parsedEmail.subject,
      messageText: parsedEmail.text,
      messageHtml: parsedEmail.html || null,
      emailMessageId: parsedEmail.messageId,
      inReplyTo: parsedEmail.inReplyTo,
    });

    // If spam, mark it
    if (spamCheck.isSpam) {
      await executeQuery(
        env,
        "UPDATE relay_messages SET is_spam = TRUE, spam_score = ? WHERE id = ?",
        [spamCheck.score, message.id],
      );
    }

    // Forward the message to the recipient via relay
    const emailResult = await sendRelayEmail(env, {
      toEmail: recipientEntity.email,
      fromName: senderEntity.name,
      fromRelayAddress:
        senderEntity.type === "user"
          ? conversation.user_relay_address
          : conversation.contact_relay_address,
      toRelayAddress: toRelayAddress,
      subject: parsedEmail.subject,
      message: parsedEmail.text,
      jobTitle: null,
      companyName: null,
    });

    if (emailResult.success) {
      await updateMessageStatus(env, message.id, "delivered");
    } else {
      await updateMessageStatus(env, message.id, "failed");
    }

    // Update job application status if this is a reply from HR to user
    if (recipientEntity.type === "user" && conversation.job_id) {
      await executeQuery(
        env,
        `UPDATE user_job_applications 
         SET status = 'replied', updated_at = CURRENT_TIMESTAMP 
         WHERE job_id = ? AND user_id = ? AND contact_id = ?`,
        [conversation.job_id, recipientEntity.id, senderEntity.id],
      );
    }

    return createResponse({
      success: true,
      message: "Incoming message processed and forwarded",
      conversation_id: conversation.id,
      message_id: message.id,
    });
  } catch (error) {
    console.error("Error handling incoming message:", error);
    return createResponse(
      {
        error: "Failed to process incoming message",
        details: error.message,
      },
      500,
    );
  }
}

/**
 * Get user's conversations
 * GET /api/messages?limit=20&offset=0
 */
async function getConversations(request, env) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request, env);
    if (!authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = authResult.payload.userId;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Get user's role to determine which conversations to show
    const user = await executeQueryFirst(
      env,
      "SELECT role FROM users WHERE id = ?",
      [userId],
    );

    let conversations;

    // If user is company admin, check if they have a contact profile
    if (user.role === "company_admin" || user.role === "super_admin") {
      // Try to find contact linked to this user
      const contact = await executeQueryFirst(
        env,
        "SELECT id FROM contacts WHERE email = (SELECT email FROM users WHERE id = ?)",
        [userId],
      );

      if (contact) {
        // Show contact conversations
        conversations = await getContactConversations(
          env,
          contact.id,
          limit,
          offset,
        );
      } else {
        // Show user conversations
        conversations = await getUserConversations(env, userId, limit, offset);
      }
    } else {
      // Regular user - show user conversations
      conversations = await getUserConversations(env, userId, limit, offset);
    }

    return createResponse({
      success: true,
      conversations: conversations,
      pagination: {
        limit,
        offset,
        count: conversations.length,
      },
    });
  } catch (error) {
    console.error("Error getting conversations:", error);
    return createResponse(
      {
        error: "Failed to get conversations",
        details: error.message,
      },
      500,
    );
  }
}

/**
 * Get conversation history
 * GET /api/messages/:conversationId
 */
async function getConversationHistory(request, env, conversationId) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request, env);
    if (!authResult.valid) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = authResult.payload.userId;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Verify user has access to this conversation
    const conversation = await executeQueryFirst(
      env,
      "SELECT * FROM relay_conversations WHERE id = ?",
      [conversationId],
    );

    if (!conversation) {
      return createResponse({ error: "Conversation not found" }, 404);
    }

    // Check if user is part of this conversation
    const userIsParticipant = conversation.user_id === userId;

    // Check if user is the contact (for company admins)
    let userIsContact = false;
    if (!userIsParticipant) {
      const contact = await executeQueryFirst(
        env,
        "SELECT id FROM contacts WHERE id = ? AND email = (SELECT email FROM users WHERE id = ?)",
        [conversation.contact_id, userId],
      );
      userIsContact = !!contact;
    }

    if (!userIsParticipant && !userIsContact) {
      return createResponse(
        { error: "You don't have access to this conversation" },
        403,
      );
    }

    // Get messages
    const messages = await getConversationMessages(
      env,
      conversationId,
      limit,
      offset,
    );

    return createResponse({
      success: true,
      conversation: conversation,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        limit,
        offset,
        count: messages.length,
      },
    });
  } catch (error) {
    console.error("Error getting conversation history:", error);
    return createResponse(
      {
        error: "Failed to get conversation history",
        details: error.message,
      },
      500,
    );
  }
}

/**
 * Update message status (for delivery tracking)
 * PUT /api/messages/:messageId/status
 *
 * Body: { "status": "delivered" | "read" | "failed" }
 */
async function updateMessageStatusEndpoint(request, env, messageId) {
  try {
    // This endpoint can be called by Mailgun webhooks
    // Or by the frontend when a message is read

    const data = await request.json();

    if (!data.status) {
      return createResponse({ error: "Missing status field" }, 400);
    }

    const validStatuses = ["sent", "delivered", "failed", "bounced", "read"];
    if (!validStatuses.includes(data.status)) {
      return createResponse(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        400,
      );
    }

    await updateMessageStatus(env, messageId, data.status);

    return createResponse({
      success: true,
      message: "Message status updated",
    });
  } catch (error) {
    console.error("Error updating message status:", error);
    return createResponse(
      {
        error: "Failed to update message status",
        details: error.message,
      },
      500,
    );
  }
}

/**
 * Verify Mailgun webhook signature
 * Ensures the webhook request is actually from Mailgun and prevents replay attacks
 *
 * @param {string} signature - Signature from X-Mailgun-Signature header
 * @param {string} timestamp - Timestamp from X-Mailgun-Timestamp header
 * @param {string} token - Token from X-Mailgun-Token header
 * @param {string} apiKey - Mailgun API key
 * @returns {Promise<boolean>}
 */
async function verifyMailgunSignature(signature, timestamp, token, apiKey) {
  if (!signature || !timestamp || !token) {
    console.warn("Missing Mailgun signature, timestamp, or token");
    return false;
  }

  // Verify timestamp is recent (within 15 minutes to prevent replay attacks)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - parseInt(timestamp)) > 900) {
    console.warn("Mailgun webhook timestamp too old or in future");
    return false;
  }

  try {
    // Create the signature string (timestamp + token)
    const signatureString = `${timestamp}${token}`;

    // Create HMAC-SHA256 using Mailgun API key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiKey);
    const message = encoder.encode(signatureString);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, message);
    const signatureArray = new Uint8Array(signatureBuffer);

    // Convert to hex string
    const computedSignature = Array.from(signatureArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSignature === signature.toLowerCase();
  } catch (error) {
    console.error("Error verifying Mailgun signature:", error);
    return false;
  }
}
