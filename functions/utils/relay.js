/**
 * Message Relay System Utilities
 * Handles secure message relay between users and HR contacts
 *
 * Features:
 * - Generate unique relay addresses
 * - Map relay addresses to real entities
 * - Parse incoming emails
 * - Track conversation threads
 * - Spam detection
 *
 * @author Empleo Safari Platform
 * @version 1.0.0
 */

import { executeQuery, executeQueryFirst, executeUpdate } from "./database.js";

/**
 * Generate a unique relay address for a user or contact
 * Format: user{id}@relay.empleosafari.com or hr{id}@relay.empleosafari.com
 *
 * @param {Object} env - Environment variables
 * @param {string} entityType - 'user' or 'contact'
 * @param {number} entityId - User ID or Contact ID
 * @returns {Promise<string>} The relay address
 */
export async function generateRelayAddress(env, entityType, entityId) {
  try {
    // Check if relay address already exists
    const existing = await executeQueryFirst(
      env,
      "SELECT relay_address FROM relay_addresses WHERE entity_type = ? AND entity_id = ? AND is_active = TRUE",
      [entityType, entityId],
    );

    if (existing) {
      return existing.relay_address;
    }

    // Generate new relay address
    const prefix = entityType === "user" ? "user" : "hr";
    const relayDomain = env.RELAY_DOMAIN || "relay.empleosafari.com";
    const relayAddress = `${prefix}${entityId}@${relayDomain}`;

    // Store in database
    await executeUpdate(
      env,
      `INSERT INTO relay_addresses (relay_address, entity_type, entity_id, is_active)
       VALUES (?, ?, ?, TRUE)`,
      [relayAddress, entityType, entityId],
    );

    return relayAddress;
  } catch (error) {
    console.error("Error generating relay address:", error);
    throw new Error("Failed to generate relay address");
  }
}

/**
 * Get the real entity (user or contact) from a relay address
 *
 * @param {Object} env - Environment variables
 * @param {string} relayAddress - The relay address to lookup
 * @returns {Promise<Object>} Entity info: { type, id, email, name }
 */
export async function getEntityFromRelayAddress(env, relayAddress) {
  try {
    // Get relay address mapping
    const mapping = await executeQueryFirst(
      env,
      `SELECT entity_type, entity_id FROM relay_addresses 
       WHERE relay_address = ? AND is_active = TRUE`,
      [relayAddress.toLowerCase()],
    );

    if (!mapping) {
      return null;
    }

    // Get actual entity details
    if (mapping.entity_type === "user") {
      const user = await executeQueryFirst(
        env,
        "SELECT id, email, first_name, last_name FROM users WHERE id = ?",
        [mapping.entity_id],
      );

      if (!user) return null;

      return {
        type: "user",
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        first_name: user.first_name,
        last_name: user.last_name,
      };
    } else {
      const contact = await executeQueryFirst(
        env,
        "SELECT id, email, name, position, company_id FROM contacts WHERE id = ?",
        [mapping.entity_id],
      );

      if (!contact) return null;

      return {
        type: "contact",
        id: contact.id,
        email: contact.email,
        name: contact.name,
        position: contact.position,
        company_id: contact.company_id,
      };
    }
  } catch (error) {
    console.error("Error getting entity from relay address:", error);
    return null;
  }
}

/**
 * Get or create a conversation between a user and contact
 *
 * @param {Object} env - Environment variables
 * @param {number} userId - User ID
 * @param {number} contactId - Contact ID
 * @param {number} jobId - Job ID (optional)
 * @param {string} subject - Initial subject line
 * @returns {Promise<Object>} Conversation object
 */
export async function getOrCreateConversation(
  env,
  userId,
  contactId,
  jobId,
  subject,
) {
  try {
    // Try to find existing conversation
    const existing = await executeQueryFirst(
      env,
      `SELECT * FROM relay_conversations 
       WHERE user_id = ? AND contact_id = ? AND (job_id = ? OR (job_id IS NULL AND ? IS NULL))
       AND status != 'blocked'`,
      [userId, contactId, jobId, jobId],
    );

    if (existing) {
      return existing;
    }

    // Generate relay addresses if they don't exist
    const userRelayAddress = await generateRelayAddress(env, "user", userId);
    const contactRelayAddress = await generateRelayAddress(
      env,
      "contact",
      contactId,
    );

    // Create new conversation
    const result = await executeUpdate(
      env,
      `INSERT INTO relay_conversations 
       (user_id, contact_id, job_id, subject, user_relay_address, contact_relay_address, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [
        userId,
        contactId,
        jobId,
        subject,
        userRelayAddress,
        contactRelayAddress,
      ],
    );

    // Fetch the created conversation
    const conversation = await executeQueryFirst(
      env,
      "SELECT * FROM relay_conversations WHERE id = ?",
      [result.meta.last_row_id],
    );

    return conversation;
  } catch (error) {
    console.error("Error getting/creating conversation:", error);
    throw new Error("Failed to get or create conversation");
  }
}

/**
 * Store a relay message in the database
 *
 * @param {Object} env - Environment variables
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Created message object
 */
export async function storeRelayMessage(env, messageData) {
  const {
    conversationId,
    direction,
    fromEntityType,
    fromEntityId,
    toEntityType,
    toEntityId,
    fromRelayAddress,
    toRelayAddress,
    fromRealEmail,
    toRealEmail,
    subject,
    messageText,
    messageHtml,
    emailMessageId,
    inReplyTo,
  } = messageData;

  try {
    const result = await executeUpdate(
      env,
      `INSERT INTO relay_messages 
       (conversation_id, direction, from_entity_type, from_entity_id, to_entity_type, to_entity_id,
        from_relay_address, to_relay_address, from_real_email, to_real_email,
        subject, message_text, message_html, email_message_id, in_reply_to, status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [
        conversationId,
        direction,
        fromEntityType,
        fromEntityId,
        toEntityType,
        toEntityId,
        fromRelayAddress,
        toRelayAddress,
        fromRealEmail,
        toRealEmail,
        subject,
        messageText,
        messageHtml,
        emailMessageId,
        inReplyTo,
      ],
    );

    const message = await executeQueryFirst(
      env,
      "SELECT * FROM relay_messages WHERE id = ?",
      [result.meta.last_row_id],
    );

    return message;
  } catch (error) {
    console.error("Error storing relay message:", error);
    throw new Error("Failed to store relay message");
  }
}

/**
 * Update message status
 *
 * @param {Object} env - Environment variables
 * @param {number} messageId - Message ID
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
export async function updateMessageStatus(env, messageId, status) {
  try {
    const timestampField =
      status === "sent"
        ? "sent_at"
        : status === "delivered"
        ? "delivered_at"
        : null;

    if (timestampField) {
      await executeUpdate(
        env,
        `UPDATE relay_messages SET status = ?, ${timestampField} = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, messageId],
      );
    } else {
      await executeUpdate(
        env,
        "UPDATE relay_messages SET status = ? WHERE id = ?",
        [status, messageId],
      );
    }
  } catch (error) {
    console.error("Error updating message status:", error);
    throw new Error("Failed to update message status");
  }
}

/**
 * Extract only the new reply content from an email, removing quoted text
 * Handles common email reply patterns from Gmail, Outlook, etc.
 *
 * @param {string} emailBody - Full email body text
 * @returns {string} Cleaned email body with only new content
 */
export function extractReplyContent(emailBody) {
  if (!emailBody) return "";

  // Common patterns that indicate quoted/previous email content
  const quotePatterns = [
    // Gmail with line break: "On Mon, Oct 20, 2025 at 12:51 PM Marco Maigua <\nmarco@gmail.com> wrote:"
    /On\s+\w+,\s+\w+\s+\d+,\s+\d{4}\s+at\s+[\s\S]+?wrote:/i,
    // Gmail English: "On Mon, Oct 20, 2025 at 12:50 PM [name] <email> wrote:"
    /On\s+\w+,\s+\w+\s+\d+,\s+\d{4}\s+at\s+.+?wrote:/is,
    // Gmail Spanish: "El lun, 20 oct 2025 a las 12:50, [name] <email> escribió:"
    /El\s+\w+,\s+\d+\s+\w+\s+\d{4}\s+a\s+las\s+.+?escribió:/is,
    // Generic "On [date]...wrote:" (multiline, matches email addresses with line breaks)
    /On\s+.+?wrote:/is,
    /El\s+.+?escribió:/is,
    // Outlook: "From: [name]" or "De: [name]" at the start of a line
    /^From:\s+.+$/im,
    /^De:\s+.+$/im,
    // Emoji indicators from relay emails: "💬 Nuevo Mensaje" or "💬 New Message"
    /💬\s*(Nuevo Mensaje|New Message)/i,
    // Reply format with asterisks: "*De:*" or "*From:*"
    /\*De:\*\s+.+$/im,
    /\*From:\*\s+.+$/im,
    // Generic reply separator
    /^[-_]{3,}\s*$/m,
    // Original message separator
    /^-+\s*Original Message\s*-+$/im,
    /^-+\s*Mensaje Original\s*-+$/im,
    // Reply prefix with >
    /^>\s+.+$/m,
  ];

  let cleanedBody = emailBody.trim();

  // Find the earliest quote pattern
  let earliestIndex = -1;
  let matchedPattern = null;

  for (const pattern of quotePatterns) {
    const match = cleanedBody.match(pattern);
    if (match && match.index !== undefined) {
      if (earliestIndex === -1 || match.index < earliestIndex) {
        earliestIndex = match.index;
        matchedPattern = pattern.toString();
      }
    }
  }

  // If we found a quote pattern, cut everything after it
  if (earliestIndex > 0) {
    console.log(
      `Detected quote pattern at index ${earliestIndex}: ${matchedPattern}`,
    );
    cleanedBody = cleanedBody.substring(0, earliestIndex).trim();
  }

  // Remove lines that start with > (quoted text)
  cleanedBody = cleanedBody
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n")
    .trim();

  // Remove excessive newlines (more than 2 consecutive)
  cleanedBody = cleanedBody.replace(/\n{3,}/g, "\n\n");

  return cleanedBody || emailBody; // Return original if cleaning resulted in empty string
}

/**
 * Parse incoming email to extract sender, recipient, and content
 * This works with Mailgun's incoming email format
 *
 * @param {Object} emailData - Email data from Mailgun webhook
 * @returns {Object} Parsed email data
 */
export function parseIncomingEmail(emailData) {
  const rawText = emailData["body-plain"] || emailData.text || "";
  const rawHtml = emailData["body-html"] || emailData.html || "";

  // Extract only the reply content, removing quoted previous messages
  const cleanedText = extractReplyContent(rawText);

  // Log for debugging
  console.log("📧 Original email length:", rawText.length);
  console.log("✂️ Cleaned email length:", cleanedText.length);
  if (rawText.length !== cleanedText.length) {
    console.log(
      "✅ Email cleaned - removed",
      rawText.length - cleanedText.length,
      "characters",
    );
    console.log("📝 Original preview:", rawText.substring(0, 150) + "...");
    console.log("✨ Cleaned preview:", cleanedText.substring(0, 150) + "...");
  } else {
    console.log("ℹ️ No quote patterns detected - email unchanged");
  }

  return {
    from: emailData.sender || emailData.from,
    to: emailData.recipient || emailData.to,
    subject: emailData.subject || "",
    text: cleanedText,
    html: rawHtml, // Keep full HTML for now (can be cleaned separately if needed)
    messageId: emailData["Message-Id"] || emailData.messageId,
    inReplyTo: emailData["In-Reply-To"] || emailData.inReplyTo,
    timestamp: emailData.timestamp
      ? new Date(parseInt(emailData.timestamp) * 1000)
      : new Date(),
  };
}

/**
 * Simple spam detection based on content
 *
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @returns {Object} { isSpam: boolean, score: number }
 */
export function detectSpam(subject, message) {
  const spamKeywords = [
    "viagra",
    "casino",
    "lottery",
    "winner",
    "prize",
    "free money",
    "click here",
    "act now",
    "limited time",
    "nigerian prince",
  ];

  const content = `${subject} ${message}`.toLowerCase();
  let spamScore = 0;

  // Check for spam keywords
  spamKeywords.forEach((keyword) => {
    if (content.includes(keyword)) {
      spamScore += 0.3;
    }
  });

  // Check for excessive URLs
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  if (urlCount > 5) {
    spamScore += 0.2;
  }

  // Check for excessive capital letters
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.3) {
    spamScore += 0.2;
  }

  // Check for suspicious patterns
  if (content.includes("$$$") || content.includes("!!!")) {
    spamScore += 0.15;
  }

  return {
    isSpam: spamScore >= 0.5,
    score: Math.min(spamScore, 1.0),
  };
}

/**
 * Get conversation history
 *
 * @param {Object} env - Environment variables
 * @param {number} conversationId - Conversation ID
 * @param {number} limit - Number of messages to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of messages
 */
export async function getConversationMessages(
  env,
  conversationId,
  limit = 50,
  offset = 0,
) {
  try {
    const result = await executeQuery(
      env,
      `SELECT * FROM relay_messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [conversationId, limit, offset],
    );

    return result.results || [];
  } catch (error) {
    console.error("Error getting conversation messages:", error);
    throw new Error("Failed to get conversation messages");
  }
}

/**
 * Get all conversations for a user
 *
 * @param {Object} env - Environment variables
 * @param {number} userId - User ID
 * @param {number} limit - Number of conversations to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of conversations
 */
export async function getUserConversations(
  env,
  userId,
  limit = 20,
  offset = 0,
) {
  try {
    const result = await executeQuery(
      env,
      `SELECT 
        rc.*,
        c.name as contact_name,
        c.position as contact_position,
        c.email as contact_email,
        j.title as job_title,
        comp.name as company_name
       FROM relay_conversations rc
       LEFT JOIN contacts c ON rc.contact_id = c.id
       LEFT JOIN jobs j ON rc.job_id = j.id
       LEFT JOIN companies comp ON c.company_id = comp.id
       WHERE rc.user_id = ? AND rc.status != 'blocked'
       ORDER BY rc.last_message_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );

    return result.results || [];
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw new Error("Failed to get user conversations");
  }
}

/**
 * Get all conversations for a contact (HR)
 *
 * @param {Object} env - Environment variables
 * @param {number} contactId - Contact ID
 * @param {number} limit - Number of conversations to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of conversations
 */
export async function getContactConversations(
  env,
  contactId,
  limit = 20,
  offset = 0,
) {
  try {
    const result = await executeQuery(
      env,
      `SELECT 
        rc.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        j.title as job_title
       FROM relay_conversations rc
       LEFT JOIN users u ON rc.user_id = u.id
       LEFT JOIN jobs j ON rc.job_id = j.id
       WHERE rc.contact_id = ? AND rc.status != 'blocked'
       ORDER BY rc.last_message_at DESC
       LIMIT ? OFFSET ?`,
      [contactId, limit, offset],
    );

    return result.results || [];
  } catch (error) {
    console.error("Error getting contact conversations:", error);
    throw new Error("Failed to get contact conversations");
  }
}

/**
 * Find conversation by relay addresses
 *
 * @param {Object} env - Environment variables
 * @param {string} fromRelayAddress - Sender's relay address
 * @param {string} toRelayAddress - Recipient's relay address
 * @returns {Promise<Object|null>} Conversation object or null
 */
export async function findConversationByRelayAddresses(
  env,
  fromRelayAddress,
  toRelayAddress,
) {
  try {
    // Determine direction and search accordingly
    const conversation = await executeQueryFirst(
      env,
      `SELECT * FROM relay_conversations 
       WHERE (user_relay_address = ? AND contact_relay_address = ?)
          OR (user_relay_address = ? AND contact_relay_address = ?)
       AND status != 'blocked'
       LIMIT 1`,
      [fromRelayAddress, toRelayAddress, toRelayAddress, fromRelayAddress],
    );

    return conversation;
  } catch (error) {
    console.error("Error finding conversation by relay addresses:", error);
    return null;
  }
}

/**
 * Mark conversation as read
 *
 * @param {Object} env - Environment variables
 * @param {number} conversationId - Conversation ID
 * @param {number} messageId - Last read message ID
 * @returns {Promise<void>}
 */
export async function markConversationAsRead(env, conversationId, messageId) {
  try {
    await executeUpdate(
      env,
      "UPDATE relay_messages SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND read_at IS NULL",
      [messageId],
    );
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    throw new Error("Failed to mark conversation as read");
  }
}
