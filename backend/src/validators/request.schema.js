const { z } = require("zod");

const createRequestSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(5),
  category: z.enum(["IT", "HR", "FACILITY"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

const assignSchema = z.object({ assigneeId: z.number().int() });

const commentSchema = z.object({ text: z.string().min(1).max(1000) });

module.exports = { createRequestSchema, statusSchema, assignSchema, commentSchema };