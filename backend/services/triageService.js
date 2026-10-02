import Ticket from "../models/ticket.js";
import User from "../models/user.js";
import { analyzeTicket, generateEmbedding, cosineSimilarity } from "../utils/ai.js";
import { sendMail } from "../utils/mailer.js";

/**
 * Background worker function to triage a newly created ticket.
 * Runs asynchronously without blocking the Express response.
 *
 * Steps:
 * 1. AI Analysis with In-Context Team Skills Grounding
 * 2. Vector Embedding & Semantic Similarity Matching (Cosine distance)
 * 3. Keyword-overlap fallback matching if embedding service is offline
 * 4. Assign ticket to best matched moderator (or fallback to admin)
 * 5. Dispatch notification email to moderator
 */
export const triageTicket = async (ticketId) => {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      console.warn(`[TriageWorker] Ticket not found: ${ticketId}`);
      return;
    }

    console.log(`[TriageWorker] Starting AI triage for ticket "${ticket.title}" (${ticketId})...`);

    // Fetch unique moderator skills to ground the AI's tag extraction
    const availableSkills = await User.distinct("skills", { role: "moderator" });

    // 1. Run AI analysis
    const aiResponse = await analyzeTicket(ticket, availableSkills);
    let skills = [];

    if (aiResponse) {
      skills = Array.isArray(aiResponse.relatedSkills) ? aiResponse.relatedSkills : [];
      const priority = ["low", "medium", "high"].includes(aiResponse.priority?.toLowerCase())
        ? aiResponse.priority.toLowerCase()
        : "medium";

      await Ticket.findByIdAndUpdate(ticketId, {
        priority,
        helpfulNotes: aiResponse.helpfulNotes || "",
        status: "IN_PROGRESS",
        relatedSkills: skills,
      });
      console.log(`[TriageWorker] AI classified priority: ${priority}, skills: [${skills.join(", ")}]`);
    } else {
      // AI analysis unavailable or failed: set clean defaults
      await Ticket.findByIdAndUpdate(ticketId, {
        priority: ticket.priority || "medium",
        helpfulNotes: "",
        status: "IN_PROGRESS",
        relatedSkills: [],
      });
      console.log(`[TriageWorker] AI triage skipped or failed. Proceeding with standard moderator assignment.`);
    }

    // 2. Vector Embedding & Semantic Search Moderator Matching
    let moderator = null;
    const moderators = await User.find({ role: "moderator" });

    if (moderators.length > 0) {
      try {
        const ticketText = `${ticket.title}\n${ticket.description}`;
        const ticketEmbedding = await generateEmbedding(ticketText);

        if (ticketEmbedding) {
          let bestModerator = null;
          let highestSimilarity = -1;

          for (const mod of moderators) {
            if (!Array.isArray(mod.skills) || mod.skills.length === 0) continue;

            let modEmbedding = mod.skillsEmbedding;
            // Generate and cache moderator embedding if not already stored
            if (!Array.isArray(modEmbedding) || modEmbedding.length === 0) {
              modEmbedding = await generateEmbedding(mod.skills.join(", "));
              if (modEmbedding) {
                await User.findByIdAndUpdate(mod._id, { skillsEmbedding: modEmbedding });
              }
            }

            if (modEmbedding) {
              const similarity = cosineSimilarity(ticketEmbedding, modEmbedding);
              console.log(`[TriageWorker] Semantic similarity with ${mod.email}: ${similarity.toFixed(4)}`);
              if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestModerator = mod;
              }
            }
          }

          // Use best match if above semantic threshold (0.35)
          if (highestSimilarity >= 0.35 && bestModerator) {
            moderator = bestModerator;
            console.log(
              `[TriageWorker] Semantic Vector match found: ${moderator.email} (Cosine Similarity: ${highestSimilarity.toFixed(4)})`
            );
          }
        }
      } catch (embErr) {
        console.warn(`[TriageWorker] Vector similarity matching failed, falling back to keyword matching:`, embErr.message);
      }

      // Keyword Overlap Fallback if semantic match was inconclusive
      if (!moderator && skills.length > 0) {
        const lowerSkills = skills.map((s) => s.toLowerCase().trim());
        let bestKeywordMod = null;
        let maxMatches = 0;

        for (const mod of moderators) {
          if (!Array.isArray(mod.skills) || mod.skills.length === 0) continue;
          const modSkills = mod.skills.map((s) => s.toLowerCase().trim());

          let matchScore = 0;
          for (const reqSkill of lowerSkills) {
            if (modSkills.some((ms) => ms === reqSkill || ms.includes(reqSkill) || reqSkill.includes(ms))) {
              matchScore += 1;
            }
          }

          if (matchScore > maxMatches) {
            maxMatches = matchScore;
            bestKeywordMod = mod;
          }
        }

        if (maxMatches > 0) {
          moderator = bestKeywordMod;
          console.log(`[TriageWorker] Keyword fallback matched moderator: ${moderator.email} (score: ${maxMatches})`);
        }
      }
    }

    // Fallback: any available moderator, then admin
    if (!moderator) {
      moderator = await User.findOne({ role: "moderator" });
    }
    if (!moderator) {
      moderator = await User.findOne({ role: "admin" });
    }

    if (moderator) {
      await Ticket.findByIdAndUpdate(ticketId, {
        assignedTo: moderator._id,
      });
      console.log(`[TriageWorker] Assigned to moderator: ${moderator.email}`);

      // 3. Send email notification (non-blocking)
      try {
        await sendMail(
          moderator.email,
          "Ticket Assigned",
          `A new ticket has been assigned to you: "${ticket.title}".\n\nPriority: ${aiResponse?.priority || "medium"}\nSkills: ${skills.join(", ")}`
        );
      } catch (mailErr) {
        console.warn(`[TriageWorker] Email notification skipped/failed: ${mailErr.message}`);
      }
    } else {
      console.warn(`[TriageWorker] No moderator or admin available to assign.`);
    }

    console.log(`[TriageWorker] Triage complete for ticket ${ticketId} ✅`);
  } catch (err) {
    console.error(`[TriageWorker] Error triaging ticket ${ticketId}:`, err.message);
  }
};

/**
 * Background worker to dispatch welcome email on signup.
 */
export const sendWelcomeEmail = async (email) => {
  try {
    const subject = "Welcome to AutoResolve AI";
    const message = `Hi,\n\nThanks for signing up to AutoResolve AI. We're glad to have you onboard!\n\nYou can now submit tickets and get automated skill-matched mentoring.`;
    await sendMail(email, subject, message);
  } catch (err) {
    console.warn(`[TriageWorker] Welcome email skipped: ${err.message}`);
  }
};
