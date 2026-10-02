import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import User from "../models/user.js";
import Ticket from "../models/ticket.js";
import ticketRoutes from "../routes/ticket.js";
// Benchmark uses native non-blocking triage worker

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { mean: 0, p50: 0, p95: 0, p99: 0 };
  const getP = (p) => sorted[Math.min(n - 1, Math.max(0, Math.floor((p / 100) * n)))];
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  return {
    mean: parseFloat(mean.toFixed(2)),
    p50: parseFloat(getP(50).toFixed(2)),
    p95: parseFloat(getP(95).toFixed(2)),
    p99: parseFloat(getP(99).toFixed(2)),
  };
}

async function runConcurrencyWorker({ url, options, stopTime, recordResult }) {
  while (performance.now() < stopTime) {
    const t0 = performance.now();
    try {
      const res = await fetch(url, options);
      const duration = performance.now() - t0;
      recordResult(res.status, duration);
    } catch {
      const duration = performance.now() - t0;
      recordResult(500, duration);
    }
  }
}

async function executeLoadStage(name, targetUrl, options, concurrency, durationSec = 4) {
  process.stdout.write(`Executing ${name} [Concurrency: ${concurrency} users, ${durationSec}s]... `);
  const latencies = [];
  let successes = 0;
  let failures = 0;

  const stopTime = performance.now() + durationSec * 1000;
  const startTime = performance.now();

  const recordResult = (status, duration) => {
    latencies.push(duration);
    if (status >= 200 && status < 400) {
      successes++;
    } else {
      failures++;
    }
  };

  // Launch concurrent virtual users
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(runConcurrencyWorker({ url: targetUrl, options, stopTime, recordResult }));
  }

  await Promise.all(workers);
  const totalElapsedSec = (performance.now() - startTime) / 1000;
  const totalRequests = successes + failures;
  const rps = totalRequests / totalElapsedSec;
  const stats = calculatePercentiles(latencies);
  const errorRate = totalRequests > 0 ? (failures / totalRequests) * 100 : 0;

  console.log(`done (${rps.toFixed(1)} req/s, p95: ${stats.p95}ms, errors: ${errorRate.toFixed(1)}%)`);

  return {
    Workload: name,
    Concurrency: concurrency,
    Duration: `${durationSec}s`,
    "Total Reqs": totalRequests,
    "Throughput (RPS)": parseFloat(rps.toFixed(1)),
    "Mean (ms)": stats.mean,
    "p50 (ms)": stats.p50,
    "p95 (ms)": stats.p95,
    "p99 (ms)": stats.p99,
    "Success %": `${(100 - errorRate).toFixed(1)}%`,
    "Error %": `${errorRate.toFixed(1)}%`,
  };
}

export async function runLoadCapacityBenchmark() {
  console.log("\n============================================================");
  console.log("  HIGH-CONCURRENCY LOAD CAPACITY BENCHMARK");
  console.log("============================================================\n");

  const TEST_PORT = 3100;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB for load capacity benchmark.");

  // Prepare auth token
  const adminUser = await User.findOne({ role: "admin" }) || { _id: new mongoose.Types.ObjectId(), role: "admin" };
  const authToken = jwt.sign(
    { _id: adminUser._id, role: adminUser.role },
    process.env.JWT_SECRET || "supersecretkey12345"
  );

  // Setup express server
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/ticket", ticketRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Load benchmark server listening at ${BASE_URL}\n`);

  const results = [];

  // Stage 1: Baseline HTTP Health Throughput
  for (const c of [10, 25, 50, 100]) {
    const res = await executeLoadStage(
      "HTTP Service Baseline (/health)",
      `${BASE_URL}/health`,
      { method: "GET" },
      c,
      3
    );
    results.push(res);
  }

  // Stage 2: Database Read Workload (GET /api/ticket with Auth & DB Query)
  console.log("\nBenchmarking Authenticated Database Read Workload (GET /api/ticket)...");
  for (const c of [10, 25, 50]) {
    const res = await executeLoadStage(
      "Database Query Feed (GET /api/ticket)",
      `${BASE_URL}/api/ticket`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      },
      c,
      4
    );
    results.push(res);
  }

  // Stage 3: Database Write Ingestion (POST /api/ticket)
  console.log("\nBenchmarking Database Write Ingestion Workload (POST /api/ticket)...");
  const ticketCreationResults = [];
  for (const c of [10, 20]) {
    const res = await executeLoadStage(
      "Ingestion Write (POST /api/ticket)",
      `${BASE_URL}/api/ticket`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Concurrent Load Test Ticket",
          description: "High concurrency stress testing ticket ingestion throughput.",
        }),
      },
      c,
      3
    );
    results.push(res);
    ticketCreationResults.push(res);
  }

  // Cleanup tickets created during load test
  await Ticket.deleteMany({ title: "Concurrent Load Test Ticket" });
  console.log("\nCleaned up benchmark test data.");

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log("\n--- CONCURRENCY & LOAD CAPACITY SUMMARY TABLE ---");
  console.table(
    results.map((r) => ({
      Workload: r.Workload,
      Users: r.Concurrency,
      Duration: r.Duration,
      "Total Reqs": r["Total Reqs"],
      "Throughput (RPS)": r["Throughput (RPS)"],
      "p50 (ms)": r["p50 (ms)"],
      "p95 (ms)": r["p95 (ms)"],
      "Success %": r["Success %"],
    }))
  );

  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLoadCapacityBenchmark()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Load Capacity Benchmark error:", err);
      process.exit(1);
    });
}
