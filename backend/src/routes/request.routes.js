const express = require("express");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");
const c = require("../controllers/request.controller");

const router = express.Router();

router.post("/requests", authenticate, authorize("EMPLOYEE", "ADMIN"), c.createRequest);
router.get("/requests", authenticate, c.listRequests);
router.get("/requests/:id", authenticate, c.getRequest);
router.patch("/requests/:id/status", authenticate, authorize("AGENT", "ADMIN"), c.updateStatus);
router.patch("/requests/:id/assign", authenticate, authorize("ADMIN"), c.assignRequest);
router.post("/requests/:id/comments", authenticate, c.addComment);

router.get("/dashboard", authenticate, authorize("ADMIN"), c.getDashboard);
router.get("/audit-logs", authenticate, authorize("ADMIN"), c.getAuditLogs);

module.exports = router;