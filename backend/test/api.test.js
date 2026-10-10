require("dotenv").config({ quiet: true });
jest.setTimeout(30000);
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/db/prisma");

const emp = { email: `emp${Date.now()}@test.com`, password: "12345678" };
let empT, adminT, itT, hrT, reqId;

const login = async (email, password) =>
  (await request(app).post("/api/auth/login").send({ email, password })).body.token;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  adminT = await login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
  itT = await login(process.env.TEST_IT_EMAIL, process.env.TEST_IT_PASSWORD);
  hrT = await login(process.env.TEST_HR_EMAIL, process.env.TEST_HR_PASSWORD);
}, 30000);

afterAll(async () => { await prisma.$disconnect(); });

describe("Auth", () => {
  test("register always creates EMPLOYEE", async () => {
    const r = await request(app).post("/api/auth/register").send({ ...emp, role: "ADMIN" });
    expect(r.status).toBe(201);
    expect(r.body.role).toBe("EMPLOYEE");
  });
  test("login returns token", async () => {
    empT = await login(emp.email, emp.password);
    expect(empT).toBeDefined();
  });
  test("no token returns 401", async () => {
    expect((await request(app).get("/api/requests")).status).toBe(401);
  });
});

describe("Requests", () => {
  test("employee creates request with SLA", async () => {
    const r = await request(app).post("/api/requests").set(auth(empT))
      .send({ title: "Laptop broken", description: "Screen black", category: "IT", priority: "URGENT" });
    expect(r.status).toBe(201);
    expect(r.body.dueAt).toBeDefined();
    reqId = r.body.id;
  });
  test("invalid input returns 400", async () => {
    const r = await request(app).post("/api/requests").set(auth(empT)).send({ title: "x" });
    expect(r.status).toBe(400);
  });
  test("employee sees own requests", async () => {
    const r = await request(app).get("/api/requests").set(auth(empT));
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThan(0);
  });
});

describe("Access and workflow", () => {
  test("employee cannot change status (403)", async () => {
    const r = await request(app).patch(`/api/requests/${reqId}/status`).set(auth(empT))
      .send({ status: "IN_PROGRESS" });
    expect(r.status).toBe(403);
  });
  test("HR agent cannot touch IT request (403)", async () => {
    const r = await request(app).patch(`/api/requests/${reqId}/status`).set(auth(hrT))
      .send({ status: "IN_PROGRESS" });
    expect(r.status).toBe(403);
  });
  test("IT agent valid transition (200)", async () => {
    const r = await request(app).patch(`/api/requests/${reqId}/status`).set(auth(itT))
      .send({ status: "IN_PROGRESS" });
    expect(r.status).toBe(200);
  });
  test("invalid transition (400)", async () => {
    const r = await request(app).patch(`/api/requests/${reqId}/status`).set(auth(itT))
      .send({ status: "OPEN" });
    expect(r.status).toBe(400);
  });
  test("comment works (201)", async () => {
    const r = await request(app).post(`/api/requests/${reqId}/comments`).set(auth(itT))
      .send({ text: "Working on it" });
    expect(r.status).toBe(201);
  });
});

describe("Admin", () => {
  test("employee cannot see dashboard (403)", async () => {
    expect((await request(app).get("/api/dashboard").set(auth(empT))).status).toBe(403);
  });
  test("admin sees dashboard", async () => {
    const r = await request(app).get("/api/dashboard").set(auth(adminT));
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("overdue");
  });
  test("admin sees audit logs", async () => {
    expect((await request(app).get("/api/audit-logs").set(auth(adminT))).status).toBe(200);
  });
});