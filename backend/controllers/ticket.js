import Ticket from "../models/ticket.js";
import { triageTicket } from "../services/triageService.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
    });

    // Fire background AI triage immediately without blocking the HTTP response
    setImmediate(() => {
      triageTicket(newTicket._id).catch((err) =>
        console.error("Background triage execution error:", err)
      );
    });

    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const isPrivileged = req.user.role === "admin" || req.user.role === "moderator";

    const filter = isPrivileged ? {} : { createdBy: req.user._id.toString() };

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "email")
      .populate("assignedTo", "email");

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.role !== "user") {
      ticket = await Ticket.findById(req.params.id)
        .populate("assignedTo", ["email", "_id"])
        .populate("createdBy", ["email", "_id"]);
    } else {
      ticket = await Ticket.findOne({
        createdBy: user._id,
        _id: req.params.id,
      })
        .populate("assignedTo", ["email", "_id"])
        .populate("createdBy", ["email", "_id"]);
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    return res.status(200).json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, helpfulNotes, title, description } = req.body;
    const user = req.user;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isCreator = ticket.createdBy?.toString() === user._id.toString();
    const isAssigned = ticket.assignedTo?.toString() === user._id.toString();
    const isAdmin = user.role === "admin";
    const isModerator = user.role === "moderator";

    if (!isAdmin && !isCreator && !isAssigned && !isModerator) {
      return res.status(403).json({ message: "You are not authorized to update this ticket" });
    }

    const updates = {};
    if (status) {
      const allowedStatuses = ["TODO", "IN_PROGRESS", "RESOLVED", "CLOSED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` });
      }
      updates.status = status;
    }
    if (priority && (isAdmin || isModerator)) updates.priority = priority;
    if (helpfulNotes !== undefined && (isAdmin || isModerator)) updates.helpfulNotes = helpfulNotes;
    if (title && (isAdmin || isCreator)) updates.title = title;
    if (description && (isAdmin || isCreator)) updates.description = description;

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updates, { new: true })
      .populate("assignedTo", ["email", "_id"])
      .populate("createdBy", ["email", "_id"]);

    return res.status(200).json({ message: "Ticket updated successfully", ticket: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isCreator = ticket.createdBy?.toString() === user._id.toString();
    const isAdmin = user.role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "You do not have permission to delete this ticket" });
    }

    await Ticket.findByIdAndDelete(id);
    return res.status(200).json({ message: "Ticket deleted successfully", id });
  } catch (error) {
    console.error("Error deleting ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const myTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ createdBy: req.user._id || req.user.id })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "email");
    res.status(200).json({ tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch your tickets" });
  }
};