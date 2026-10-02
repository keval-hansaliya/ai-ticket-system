import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import User from "../models/user.js";
import Ticket from "../models/ticket.js";
import userRoutes from "../routes/user.js";
import ticketRoutes from "../routes/ticket.js";
// Benchmark uses native non-blocking triage worker

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { mean: 0, p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0 };

  const getP = (p) => {
    const idx = Math.min(n - 1, Math.max(0, Math.floor((p / 100) * n)));
    return sorted[idx];
  };

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  return {
    mean: parseFloat(mean.toFixed(2)),
    p50: parseFloat(getP(50).toFixed(2)),
    p90: parseFloat(getP(90).toFixed(2)),
    p95: parseFloat(getP(95).toFixed(2)),
    p99: parseFloat(getP(99).toFixed(2)),
    min: parseFloat(sorted[0].toFixed(2)),
    max: parseFloat(sorted[n - 1].toFixed(2)),
    count: n
  };
}

async function makeRequest(url, options = {}) {
  const start = performance.now();
  const res = await fetch(url, options);
  const duration = performance.now() - start;
  const data = await res.json().catch(() => ({}));
  return { status: res.status, duration, data };
}

export async function runApiLatencyBenchmark(iterations = 40) {
  console.log("\n============================================================");
  console.log("  API LATENCY & RESPONSE TIME PROFILING");
  console.log("============================================================\n");

  const TEST_PORT = 3099;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  // 1. Connect MongoDB
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB for latency profiling.");

  // 2. Setup benchmark user
  const benchmarkEmail = "bench_tester@example.com";
  const benchmarkPassword = "Password123!";
  let testUser = await User.findOne({ email: benchmarkEmail });
  if (!testUser) {
    const hashedPassword = await bcrypt.hash(benchmarkPassword, 10);
    testUser = await User.create({
      email: benchmarkEmail,
      password: hashedPassword,
      role: "user",
      skills: ["javascript"]
    });
  }

  const authToken = jwt.sign(
    { _id: testUser._id, role: testUser.role },
    process.env.JWT_SECRET || "supersecretkey12345"
  );

  // 3. Start dedicated Express server
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/", (req, res) => res.json({ activeStatus: true }));
  app.use("/api/auth", userRoutes);
  app.use("/api/ticket", ticketRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Ephemeral benchmark server listening at ${BASE_URL}`);

  // Create a seed ticket for GET /:id benchmark
  const seedTicket = await Ticket.create({
    title: "Benchmark Seed Ticket",
    description: "Ticket created for single-ticket lookup latency evaluation",
    createdBy: testUser._id,
    priority: "medium",
    status: "TODO"
  });

  const createdTicketIds = [seedTicket._id];
  const endpoints = [
    {
      name: "GET / (Health Check Baseline)",
      url: `${BASE_URL}/`,
      method: "GET",
      headers: {}
    },
    {
      name: "POST /api/auth/login (Auth Pipeline)",
      url: `${BASE_URL}/api/auth/login`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: benchmarkEmail, password: benchmarkPassword })
    },
    {
      name: "POST /api/ticket (Ticket Submission)",
      url: `${BASE_URL}/api/ticket`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      bodyFactory: (i) =>
        JSON.stringify({
          title: `Latency Test Ticket #${i}`,
          description: "Measuring ticket submission latency under normal operational load."
        })
    },
    {
      name: "GET /api/ticket (Ticket Feed Query)",
      url: `${BASE_URL}/api/ticket`,
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` }
    },
    {
      name: "GET /api/ticket/:id (Single Ticket Detail)",
      url: `${BASE_URL}/api/ticket/${seedTicket._id}`,
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` }
    }
  ];

  const profileResults = [];

  for (const ep of endpoints) {
    process.stdout.write(`Benchmarking ${ep.name} (${iterations} reqs)... `);
    const latencies = [];

    // Warm-up request
    await makeRequest(ep.url, {
      method: ep.method,
      headers: ep.headers,
      body: ep.bodyFactory ? ep.bodyFactory(0) : ep.body
    });

    for (let i = 1; i <= iterations; i++) {
      const body = ep.bodyFactory ? ep.bodyFactory(i) : ep.body;
      const res = await makeRequest(ep.url, {
        method: ep.method,
        headers: ep.headers,
        body
      });
      latencies.push(res.duration);
      if (res.data?.ticket?._id) {
        createdTicketIds.push(res.data.ticket._id);
      }
    }

    const stats = calculatePercentiles(latencies);
    profileResults.push({
      Endpoint: ep.name,
      Requests: iterations,
      "Mean (ms)": stats.mean,
      "p50 (ms)": stats.p50,
      "p90 (ms)": stats.p90,
      "p95 (ms)": stats.p95,
      "p99 (ms)": stats.p99,
      "Min-Max (ms)": `${stats.min} - ${stats.max}`,
      raw: stats
    });
    console.log(`done (p50: ${stats.p50}ms, p95: ${stats.p95}ms)`);
  }

  // Cleanup created tickets
  await Ticket.deleteMany({ _id: { $in: createdTicketIds } });
  await User.deleteOne({ email: benchmarkEmail });

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log("\n--- API LATENCY BENCHMARK RESULTS ---");
  console.table(
    profileResults.map((p) => ({
      Endpoint: p.Endpoint,
      Requests: p.Requests,
      "Mean (ms)": p["Mean (ms)"],
      "p50 (ms)": p["p50 (ms)"],
      "p95 (ms)": p["p95 (ms)"],
      "p99 (ms)": p["p99 (ms)"],
      "Range (ms)": p["Min-Max (ms)"]
    }))
  );

  return profileResults;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runApiLatencyBenchmark(40)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("API Latency Benchmark error:", err);
      process.exit(1);
    });
}
