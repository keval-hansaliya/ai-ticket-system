import express from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  createTicket,
  getTicket,
  getTickets,
  myTickets,
  updateTicket,
  deleteTicket,
} from "../controllers/ticket.js";

const router = express.Router();

router.get("/", authenticate, getTickets);
router.get("/my-tickets", authenticate, myTickets);
router.post("/my-tickets", authenticate, myTickets);
router.get("/:id", authenticate, getTicket);
router.post("/", authenticate, createTicket);
router.patch("/:id", authenticate, updateTicket);
router.delete("/:id", authenticate, deleteTicket);

export default router;