const prisma = require("../db/prisma");
const logAudit = require("../utils/audit");
const { calcDueAt } = require("../utils/sla");
const {
  createRequestSchema, statusSchema, assignSchema, commentSchema,
} = require("../validators/request.schema");

const TRANSITIONS = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"], // reopen allowed
  CLOSED: [],
};

const bad = (res, result) =>
  res.status(400).json({ message: "Invalid input", errors: result.error.flatten().fieldErrors });

// agent jise sabse kam open requests hon
const pickAgent = async (tx, category) => {
  const agents = await tx.user.findMany({ where: { role: "AGENT", category } });
  if (agents.length === 0) return null;
  const counts = await Promise.all(
    agents.map((a) =>
      tx.serviceRequest.count({
        where: { assigneeId: a.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      })
    )
  );
  return agents[counts.indexOf(Math.min(...counts))].id;
};

// kya is user ko ye request dikhni chahiye?
const canView = (user, r) =>
  user.role === "ADMIN" ||
  r.requesterId === user.id ||
  r.assigneeId === user.id ||
  (user.role === "AGENT" && user.category === r.category);

const createRequest = async (req, res) => {
  try {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed);
    const { title, description, category, priority } = parsed.data;

    const created = await prisma.$transaction(
      async (tx) => {
        const assigneeId = await pickAgent(tx, category);
        const r = await tx.serviceRequest.create({
          data: {
            title, description, category, priority,
            dueAt: calcDueAt(priority),
            requesterId: req.user.id,
            assigneeId,
          },
        });
        await logAudit(
          { userId: req.user.id, action: "REQUEST_CREATED", entity: "ServiceRequest",
            entityId: r.id, meta: { category, priority, assigneeId } },
          tx
        );
        return r;
      },
      { maxWait: 15000, timeout: 30000 }
    );
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const listRequests = async (req, res) => {
  try {
    const { role, id, category } = req.user;
    let where = {};
    if (role === "EMPLOYEE") where = { requesterId: id };
    else if (role === "AGENT") where = { OR: [{ category }, { assigneeId: id }] };

    const { status } = req.query;
    if (status) where = { AND: [where, { status }] };

    const items = await prisma.serviceRequest.findMany({
      where,
      orderBy: { dueAt: "asc" },
      include: { requester: { select: { id: true, email: true } },
                 assignee: { select: { id: true, email: true } } },
    });
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id" });

    const r = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { comments: { include: { user: { select: { id: true, email: true } } } } },
    });
    if (!r) return res.status(404).json({ message: "Request not found" });
    if (!canView(req.user, r)) return res.status(403).json({ message: "Forbidden" });
    return res.json(r);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const updateStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id" });
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed);
    const { status } = parsed.data;

    const r = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!r) return res.status(404).json({ message: "Request not found" });
    if (!canView(req.user, r)) return res.status(403).json({ message: "Forbidden" });
    if (!TRANSITIONS[r.status].includes(status)) {
      return res.status(400).json({ message: `Cannot change ${r.status} to ${status}` });
    }

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { status, resolvedAt: status === "RESOLVED" ? new Date() : r.resolvedAt },
    });
    await logAudit({ userId: req.user.id, action: "REQUEST_STATUS_CHANGED",
      entity: "ServiceRequest", entityId: id, meta: { from: r.status, to: status } });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const assignRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id" });
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed);

    const agent = await prisma.user.findUnique({ where: { id: parsed.data.assigneeId } });
    if (!agent || agent.role !== "AGENT") {
      return res.status(400).json({ message: "Assignee must be an AGENT" });
    }

    // yahan naya check
    const target = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ message: "Request not found" });
    if (agent.category !== target.category) {
      return res.status(400).json({ message: "Agent category does not match request" });
    }

    const updated = await prisma.serviceRequest.update({
      where: { id }, data: { assigneeId: agent.id },
    });
    await logAudit({ userId: req.user.id, action: "REQUEST_ASSIGNED",
      entity: "ServiceRequest", entityId: id, meta: { assigneeId: agent.id } });
    return res.json(updated);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Request not found" });
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
const addComment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id" });
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed);

    const r = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!r) return res.status(404).json({ message: "Request not found" });
    if (!canView(req.user, r)) return res.status(403).json({ message: "Forbidden" });

    const c = await prisma.comment.create({
      data: { requestId: id, userId: req.user.id, text: parsed.data.text },
    });
    return res.status(201).json(c);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getDashboard = async (req, res) => {
  try {
    const [byStatus, byCategory, overdue] = await Promise.all([
      prisma.serviceRequest.groupBy({ by: ["status"], _count: true }),
      prisma.serviceRequest.groupBy({ by: ["category"], _count: true }),
      prisma.serviceRequest.count({
        where: { dueAt: { lt: new Date() }, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
    ]);
    return res.json({
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count])),
      overdue,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
const listAgents = async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      select: { id: true, email: true, category: true },
    });
    return res.json(agents);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
module.exports = {
  createRequest, listRequests, getRequest, updateStatus,
  assignRequest, addComment, getDashboard, getAuditLogs, listAgents,
};