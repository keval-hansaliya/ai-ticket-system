import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns";
import userRoutes from "./routes/user.js";
import ticketRoutes from "./routes/ticket.js";

dns.setServers([
  '1.1.1.1',
  '8.8.8.8',
]);

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/ticket", ticketRoutes);

app.get('/', (req, res) => {
  res.send({
    activeStatus: true,
    message: "AutoResolve AI Ticket Service is running",
    error: false
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected ✅");
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error: ", err));