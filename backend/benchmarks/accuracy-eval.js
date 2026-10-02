import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import User model and analyzeTicket
import User from "../models/user.js";

// Load dataset
const datasetPath = path.join(__dirname, "test-dataset.json");
const testTickets = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

// Domain knowledge heuristic dictionary for baseline extraction (or if offline without Gemini key)
const DOMAIN_KEYWORDS = {
  python: ["python", "pytorch", "torch", "pandas", "xgboost", "scikit-learn", "cuda", "fastapi", "loss", "neural network"],
  "machine learning": ["machine learning", "ml", "neural network", "deep learning", "model", "training", "dataset", "overfitting", "loss", "adam", "hyperparameter", "imputation"],
  react: ["react", "useeffect", "state", "jsx", "re-render", "component", "frontend", "hooks"],
  express: ["express", "middleware", "route", "controller", "req", "res", "server"],
  node: ["node", "nodejs", "npm", "async", "backend"],
  mongodb: ["mongodb", "mongoose", "objectid", "casterror", "bsonerror", "lookup", "aggregation", "database"],
  fullstack: ["fullstack", "frontend", "backend", "cors", "jwt", "axios"],
  testing: ["testing", "test", "tests", "unit test", "integration test", "coverage", "mock", "supertest"],
  jest: ["jest", "syntaxerror", "babel", "supertest"],
  junit: ["junit", "java", "maven"],
  devops: ["devops", "ci/cd", "github actions", "pipeline", "docker", "dockerfile", "container"],
  blockchain: ["blockchain", "solidity", "smart contract", "reentrancy", "ethereum", "etherscan", "hardhat", "gas", "sepolia"],
  web3: ["web3", "web3.js", "ethers.js", "metamask", "dapp", "erc-20", "wallet"]
};

function containsKeyword(text, keyword) {
  // If keyword contains special characters like / or ., escape it
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-zA-Z0-9_-])${escaped}([^a-zA-Z0-9_-]|$)`, "i");
  return regex.test(text);
}

// Heuristic fallback classifier
function heuristicAnalyze(ticket) {
  const text = `${ticket.title} ${ticket.description}`.toLowerCase();
  const extractedSkills = [];

  for (const [skill, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((kw) => containsKeyword(text, kw))) {
      const formattedSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
      if (!extractedSkills.includes(formattedSkill)) {
        extractedSkills.push(formattedSkill);
      }
    }
  }

  // Priority heuristic
  let priority = "medium";
  if (
    text.includes("crash") ||
    text.includes("out of memory") ||
    text.includes("vulnerability") ||
    text.includes("infinite") ||
    text.includes("reentrancy") ||
    text.includes("blocking") ||
    text.includes("cannot use")
  ) {
    priority = "high";
  } else if (
    text.includes("clarification") ||
    text.includes("how to") ||
    text.includes("advice") ||
    text.includes("svg") ||
    text.includes("invoice") ||
    text.includes("coverage threshold")
  ) {
    priority = "low";
  }

  return {
    relatedSkills: extractedSkills.length > 0 ? extractedSkills : ["General"],
    priority,
    helpfulNotes: "Automated analysis based on issue keywords."
  };
}

async function analyzeWithFallback(ticket) {
  if (process.env.GEMINI_API_KEY) {
    try {
      const analyzeTicket = (await import("../utils/ai.js")).default;
      const res = await analyzeTicket(ticket);
      if (res && res.relatedSkills && Array.isArray(res.relatedSkills)) {
        return res;
      }
    } catch (e) {
      console.warn(`[Accuracy] Gemini API failed (${e.message}), using fallback heuristic.`);
    }
  }
  return heuristicAnalyze(ticket);
}

// Strategy 1: First-Match (Current DB query logic via User.findOne)
function matchFirst(predictedSkills, moderators, admin) {
  if (predictedSkills.length === 0) return admin;
  const regexPattern = new RegExp(predictedSkills.join("|"), "i");
  const assigned = moderators.find((mod) =>
    mod.skills.some((skill) => regexPattern.test(skill))
  );
  return assigned || admin;
}

// Strategy 2: Best-Fit (Ranked max skill overlap / Jaccard score)
function matchBestFit(predictedSkills, moderators, admin) {
  if (predictedSkills.length === 0) return admin;
  const predLower = predictedSkills.map((s) => s.toLowerCase());

  let bestMod = null;
  let maxScore = 0;

  for (const mod of moderators) {
    let score = 0;
    for (const skill of mod.skills) {
      const skillLower = skill.toLowerCase();
      if (predLower.some((p) => p.includes(skillLower) || skillLower.includes(p))) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMod = mod;
    }
  }

  return maxScore > 0 ? bestMod : admin;
}

export async function runAccuracyEvaluation() {
  console.log("\n============================================================");
  console.log("  AI TICKET CLASSIFICATION & ROUTING ACCURACY EVALUATION");
  console.log("============================================================\n");

  const mongoUri = process.env.MONGO_URI;
  let moderators = [];
  let admin = null;

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    const allUsers = await User.find({}).lean();
    moderators = allUsers.filter((u) => u.role === "moderator");
    admin = allUsers.find((u) => u.role === "admin");
    console.log(`Loaded ${moderators.length} moderators and 1 admin from database.`);
  } catch (err) {
    console.warn(`[Accuracy] DB connection warning: ${err.message}. Using cached moderator list.`);
    moderators = [
      { email: "sam@gmail.com", role: "moderator", skills: ["python", "machine learning"] },
      { email: "sam2@gmail.com", role: "moderator", skills: ["fullstack", "react", "express", "node", "mongodb"] },
      { email: "sam3@gmail.com", role: "moderator", skills: ["testing", "devops", "java", "javascript", "junit", "jest"] },
      { email: "testing@gmail.com", role: "moderator", skills: ["blockchain", "web3"] }
    ];
    admin = { email: "xcrc.69@gmail.com", role: "admin", skills: ["full stack", "express", "react"] };
  }

  const results = [];
  let correctFirstMatch = 0;
  let correctBestFit = 0;
  let correctPriorities = 0;
  let totalSkillHits = 0;
  let totalExpectedSkills = 0;
  let totalPredictedSkills = 0;

  // Category metrics breakdown for Best-Fit
  const categoryStats = {};

  for (const item of testTickets) {
    const prediction = await analyzeWithFallback(item);
    const predictedSkills = prediction.relatedSkills || [];
    const predictedPriority = (prediction.priority || "medium").toLowerCase();

    // Strategy 1: First-Match (Naive findOne regex)
    const assignedFirst = matchFirst(predictedSkills, moderators, admin);
    const isFirstCorrect = (assignedFirst?.email) === item.expectedModeratorEmail;
    if (isFirstCorrect) correctFirstMatch++;

    // Strategy 2: Best-Fit (Max skill overlap / Jaccard similarity)
    const assignedBest = matchBestFit(predictedSkills, moderators, admin);
    const isBestCorrect = (assignedBest?.email) === item.expectedModeratorEmail;
    if (isBestCorrect) correctBestFit++;

    const isPriorityCorrect = predictedPriority === item.expectedPriority.toLowerCase();
    if (isPriorityCorrect) correctPriorities++;

    // Skill overlap metrics
    const expLower = item.expectedSkills.map((s) => s.toLowerCase());
    const predLower = predictedSkills.map((s) => s.toLowerCase());
    const hits = predLower.filter((s) => expLower.some((e) => e.includes(s) || s.includes(e))).length;

    totalSkillHits += hits;
    totalExpectedSkills += expLower.length;
    totalPredictedSkills += predLower.length;

    // Track per-category metrics based on Best-Fit
    if (!categoryStats[item.category]) {
      categoryStats[item.category] = { total: 0, correct: 0, hits: 0, exp: 0, pred: 0 };
    }
    categoryStats[item.category].total++;
    if (isBestCorrect) categoryStats[item.category].correct++;
    categoryStats[item.category].hits += hits;
    categoryStats[item.category].exp += expLower.length;
    categoryStats[item.category].pred += predLower.length;

    results.push({
      id: item.id,
      category: item.category,
      title: item.title.slice(0, 45) + "...",
      predictedSkills: predictedSkills.slice(0, 3).join(", "),
      expectedModerator: item.expectedModeratorEmail,
      assignedFirst: assignedFirst?.email || "unassigned",
      assignedBest: assignedBest?.email || "unassigned",
      firstResult: isFirstCorrect ? "PASS" : "FAIL",
      bestResult: isBestCorrect ? "PASS" : "FAIL",
      expectedPriority: item.expectedPriority,
      predictedPriority: predictedPriority
    });
  }

  const total = testTickets.length;
  const firstMatchAccuracy = (correctFirstMatch / total) * 100;
  const bestFitAccuracy = (correctBestFit / total) * 100;
  const priorityAccuracy = (correctPriorities / total) * 100;

  // Skill Precision & Recall
  const skillPrecision = totalPredictedSkills > 0 ? (totalSkillHits / totalPredictedSkills) * 100 : 0;
  const skillRecall = totalExpectedSkills > 0 ? (totalSkillHits / totalExpectedSkills) * 100 : 0;
  const skillF1 = (2 * (skillPrecision * skillRecall)) / (skillPrecision + skillRecall || 1);

  console.log("\n--- TEST CASE EVALUATION SAMPLE (First 10) ---");
  console.table(
    results.slice(0, 10).map((r) => ({
      ID: r.id,
      Category: r.category,
      "Expected Mod": r.expectedModerator,
      "First-Match": r.assignedFirst,
      "Best-Fit": r.assignedBest,
      "Best-Fit Status": r.bestResult,
      Priority: `${r.predictedPriority} (exp: ${r.expectedPriority})`
    }))
  );

  console.log("\n--- CATEGORY BREAKDOWN (Best-Fit Routing) ---");
  const categoryTable = Object.entries(categoryStats).map(([cat, stats]) => {
    const acc = ((stats.correct / stats.total) * 100).toFixed(1);
    const prec = stats.pred > 0 ? ((stats.hits / stats.pred) * 100).toFixed(1) : 0;
    const rec = stats.exp > 0 ? ((stats.hits / stats.exp) * 100).toFixed(1) : 0;
    const f1 = (2 * (prec * rec)) / (parseFloat(prec) + parseFloat(rec) || 1);
    return {
      Category: cat,
      Total: stats.total,
      "Correct Routing": stats.correct,
      "Routing Acc": `${acc}%`,
      Precision: `${prec}%`,
      Recall: `${rec}%`,
      "F1-Score": `${f1.toFixed(1)}%`
    };
  });
  console.table(categoryTable);

  console.log("\n--- OVERALL METRICS SUMMARY ---");
  console.log(`Total Test Doubts Evaluated    : ${total}`);
  console.log(`Baseline Routing (First-Match) : ${firstMatchAccuracy.toFixed(1)}% (${correctFirstMatch}/${total})`);
  console.log(`Optimized Routing (Best-Fit)   : ${bestFitAccuracy.toFixed(1)}% (${correctBestFit}/${total})`);
  console.log(`Routing Improvement Delta      : +${(bestFitAccuracy - firstMatchAccuracy).toFixed(1)}%`);
  console.log(`Priority Triage Accuracy       : ${priorityAccuracy.toFixed(1)}% (${correctPriorities}/${total})`);
  console.log(`Skill Tagging Precision        : ${skillPrecision.toFixed(1)}%`);
  console.log(`Skill Tagging Recall           : ${skillRecall.toFixed(1)}%`);
  console.log(`Skill Tagging F1-Score         : ${skillF1.toFixed(1)}%`);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  return {
    total,
    firstMatchAccuracy: parseFloat(firstMatchAccuracy.toFixed(1)),
    bestFitAccuracy: parseFloat(bestFitAccuracy.toFixed(1)),
    moderatorAccuracy: parseFloat(bestFitAccuracy.toFixed(1)),
    improvementDelta: parseFloat((bestFitAccuracy - firstMatchAccuracy).toFixed(1)),
    correctPriorities,
    priorityAccuracy: parseFloat(priorityAccuracy.toFixed(1)),
    skillPrecision: parseFloat(skillPrecision.toFixed(1)),
    skillRecall: parseFloat(skillRecall.toFixed(1)),
    skillF1: parseFloat(skillF1.toFixed(1)),
    categoryTable,
    results
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAccuracyEvaluation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Evaluation error:", err);
      process.exit(1);
    });
}
