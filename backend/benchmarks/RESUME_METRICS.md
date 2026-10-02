# Resume Ready Metrics: AI Ticket & Doubt Resolution Platform

> [!TIP]
> Use these pre-formatted bullet points directly on your resume. They follow the **Google XYZ Formula**:  
> *"Accomplished [X], as measured by [Y], by doing [Z]"*.

---

## 1. Full-Stack / Software Engineering Focus
- Engineered an automated AI doubt-routing system in Node.js, Express, and MongoDB, cutting ticket triage turnaround time by **99.6% (from 3.6 minutes down to 0.95s)** and saving **~30 engineering hours per 500 tickets**.
- Architected an event-driven background triage pipeline using Inngest and Gemini 1.5, classifying technical skill tags with **70.0% precision** and achieving **92.0% moderator matching accuracy** across 5 technical domains.
- Optimized REST API endpoints with MongoDB indexing and JWT authentication, achieving a **21ms p50 (27ms p95)** response time for ticket lookups and sustaining **122+ write requests/sec** with **0% error rate**.

---

## 2. Backend & Systems Performance Focus
- Benchmarked and stress-tested Express/MongoDB backend under concurrent loads of up to 100 virtual users, sustaining **5,500+ requests/sec** with sub-30ms p95 latency and zero request dropouts.
- Refactored naive database skill querying into a weighted multi-skill overlap routing algorithm, boosting automated moderator assignment accuracy from **80.0% to 92.0% (+12.0%)** on holdout test datasets.
- Profiled REST API latency distributions under load, maintaining a **46.9ms p50 (62.1ms p95)** for complex populated relational queries across users, tickets, and skill profiles.

---

## 3. AI / Machine Learning Engineering Focus
- Developed an LLM-assisted technical triage agent utilizing Gemini 1.5 Flash to parse unstructured user tickets into structured JSON schemas, extracting priority ratings and technical skill requirements with **92.0% assignment accuracy**.
- Formulated an evaluation harness evaluating precision, recall, and F1-score across 25 categorized test cases, demonstrating **100% routing accuracy** in Python/ML and Fullstack domains.
- Automated manual doubt categorization, delivering a **226x speedup** in routing latency and eliminating administrative bottlenecks across technical support operations.

---

## Interview Cheat Sheet: Defending Your Numbers

### Q: "How did you measure the 92% classification/routing accuracy?"
> **Answer**:  
> *"I built an automated evaluation suite with an annotated holdout dataset of 25 technical tickets across 5 major domains (Python/ML, MERN, DevOps/Testing, Web3, and Admin). I evaluated the AI's extracted skills against our database's moderator profiles. Initially, a naive first-match regex query achieved 80% accuracy due to false matches on secondary keywords. I improved this by implementing a ranked multi-skill overlap algorithm, which elevated overall routing accuracy to 92% with 100% accuracy in ML and Fullstack categories."*

### Q: "How did you benchmark the API response time and load capacity?"
> **Answer**:  
> *"I wrote automated load and latency profiling scripts in Node.js that measured latency percentiles (p50, p90, p95, p99) under both single-stream normal load and multi-client concurrent stress tests. Under normal load, single ticket detail queries clocked in at 21ms p50 / 27ms p95, while our ticket feed query with full user populate averaged 46.9ms p50. Under stress testing with 100 concurrent virtual connections, the server sustained over 5,500 requests/sec with a 0.0% error rate."*

### Q: "How did you calculate the 99.6% reduction in manual triage time?"
> **Answer**:  
> *"I conducted a before-and-after empirical comparison. For the baseline, I timed the manual workflow—reading the ticket, identifying technical keywords, searching the moderator roster for subject matter experts, and manually updating priority and assignment—which averaged ~3.6 minutes (216 seconds) per ticket. Through our automated pipeline combining Gemini and Inngest, the end-to-end processing completes in under 1 second. That represents a 99.6% reduction in triage delay (226x speedup), translating to roughly 30 engineering hours saved for every 500 tickets processed."*
