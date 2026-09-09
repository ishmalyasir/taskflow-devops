// TaskFlow API — Phase 2 automated test suite.
//
// Requires a REAL MongoDB reachable via MONGO_URI (this sandbox has none —
// see the Phase 2 report). Point MONGO_URI at a DEDICATED TEST DATABASE
// before running this — it drops the database at the start.
//
// Usage:
//   MONGO_URI="mongodb://localhost:27017/taskflow_test" \
//   JWT_SECRET="testsecret" NODE_ENV=test npm test
//
// Or just `npm test` if your .env already points somewhere disposable.

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();

process.env.NODE_ENV = "test";
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-do-not-use-in-prod";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../server");

// Shared state threaded through the sequential test flow below.
const ctx = {};
const uniqueEmail = `test.user.${Date.now()}@taskflow.io`;

before(async () => {
  // Wait for the connection server.js already opened via connectDB().
  await new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) return resolve();
    mongoose.connection.once("connected", resolve);
    mongoose.connection.once("error", reject);
  });
  // Start from a clean slate — this MUST be a disposable test database.
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  await mongoose.connection.close();
});

describe("1-4. Health, registration, login, /auth/me", () => {
  test("GET /api/health -> 200", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test("POST /api/auth/register -> 400 on invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "X", email: "not-an-email", password: "password123" });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test("POST /api/auth/register -> 400 on short password", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "X", email: "short@pw.io", password: "123" });
    assert.equal(res.status, 400);
  });

  test("POST /api/auth/register -> 201 on valid data, returns user + token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User", email: uniqueEmail, password: "password123", jobTitle: "QA Tester",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token, "expected a JWT in the response");
    assert.ok(res.body.data.user.id, "expected a user id");
    assert.equal(res.body.data.user.password, undefined, "password must never be returned");
    ctx.userId = res.body.data.user.id;
  });

  test("POST /api/auth/register -> 409 on duplicate email", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Dup", email: uniqueEmail, password: "password123" });
    assert.equal(res.status, 409);
  });

  test("POST /api/auth/login -> 400 on missing password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: uniqueEmail });
    assert.equal(res.status, 400);
  });

  test("POST /api/auth/login -> 401 on wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: uniqueEmail, password: "wrongpassword" });
    assert.equal(res.status, 401);
  });

  test("POST /api/auth/login -> 200 on correct credentials, returns JWT", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: uniqueEmail, password: "password123" });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    ctx.token = res.body.data.token;
    ctx.auth = () => ["Authorization", `Bearer ${ctx.token}`];
  });

  test("GET /api/auth/me -> 401 without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 401);
  });

  test("GET /api/auth/me -> 401 with a garbage token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-jwt");
    assert.equal(res.status, 401);
  });

  test("GET /api/auth/me -> 200 with a valid token, matches the registered user", async () => {
    const res = await request(app).get("/api/auth/me").set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, uniqueEmail);
  });
});

describe("5. Projects CRUD", () => {
  test("POST /api/projects -> 201", async () => {
    const res = await request(app).post("/api/projects").set(...ctx.auth()).send({
      name: "QA Test Project", description: "Created by the automated test suite.", color: "indigo", status: "Planning",
    });
    assert.equal(res.status, 201);
    ctx.projectId = res.body.data._id;
  });

  test("POST /api/projects -> 400 when name is missing", async () => {
    const res = await request(app).post("/api/projects").set(...ctx.auth()).send({ description: "no name" });
    assert.equal(res.status, 400);
  });

  test("GET /api/projects -> 200, includes the new project", async () => {
    const res = await request(app).get("/api/projects").set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((p) => p._id === ctx.projectId));
  });

  test("GET /api/projects/:id -> 200", async () => {
    const res = await request(app).get(`/api/projects/${ctx.projectId}`).set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, "QA Test Project");
  });

  test("GET /api/projects/:id -> 404 for a well-formed but nonexistent id", async () => {
    const res = await request(app).get(`/api/projects/${new mongoose.Types.ObjectId()}`).set(...ctx.auth());
    assert.equal(res.status, 404);
  });

  test("GET /api/projects/:id -> 404 for a malformed id (route param cast)", async () => {
    const res = await request(app).get("/api/projects/not-a-valid-objectid").set(...ctx.auth());
    assert.equal(res.status, 404);
  });

  test("PUT /api/projects/:id -> 200, updates fields", async () => {
    const res = await request(app).put(`/api/projects/${ctx.projectId}`).set(...ctx.auth()).send({ status: "In Progress", progress: 40 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, "In Progress");
    assert.equal(res.body.data.progress, 40);
  });
});

describe("6-9. Tasks CRUD, status, checklist, comments", () => {
  test("POST /api/tasks -> 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/tasks").set(...ctx.auth()).send({ title: "Missing project/assignee" });
    assert.equal(res.status, 400);
  });

  test("POST /api/tasks -> 400 for a malformed project id in the body", async () => {
    const res = await request(app).post("/api/tasks").set(...ctx.auth()).send({
      title: "Bad project id", project: "not-an-id", assignee: ctx.userId,
    });
    assert.equal(res.status, 400);
  });

  test("POST /api/tasks -> 201, creates a task with a checklist", async () => {
    const res = await request(app).post("/api/tasks").set(...ctx.auth()).send({
      title: "QA regression: login flow",
      description: "Verify login works end to end.",
      project: ctx.projectId,
      assignee: ctx.userId,
      priority: "High",
      status: "To Do",
      dueDate: "2026-09-20",
      tags: ["QA"],
      checklist: [{ label: "Happy path" }, { label: "Wrong password" }],
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.checklist.length, 2);
    ctx.taskId = res.body.data._id;
    ctx.checklistItemId = res.body.data.checklist[0]._id;
  });

  test("GET /api/tasks -> 200, filter by status", async () => {
    const res = await request(app).get("/api/tasks").query({ status: "To Do" }).set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((t) => t.status === "To Do"));
  });

  test("GET /api/tasks/:id -> 200, includes comments[] and activity[]", async () => {
    const res = await request(app).get(`/api/tasks/${ctx.taskId}`).set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.comments));
    assert.ok(Array.isArray(res.body.data.activity));
    assert.ok(res.body.data.activity.some((a) => a.text.includes("created this task")));
  });

  test("PUT /api/tasks/:id -> 200, logs an activity entry for the change", async () => {
    const res = await request(app).put(`/api/tasks/${ctx.taskId}`).set(...ctx.auth()).send({ title: "QA regression: login flow (updated)" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, "QA regression: login flow (updated)");

    const check = await request(app).get(`/api/tasks/${ctx.taskId}`).set(...ctx.auth());
    assert.ok(check.body.data.activity.some((a) => a.text.includes("renamed the task")));
  });

  test("PATCH /api/tasks/:id/status -> 400 on an invalid status value", async () => {
    const res = await request(app).patch(`/api/tasks/${ctx.taskId}/status`).set(...ctx.auth()).send({ status: "Not A Real Status" });
    assert.equal(res.status, 400);
  });

  test("PATCH /api/tasks/:id/status -> 200, moves to Completed and logs task_completed", async () => {
    const res = await request(app).patch(`/api/tasks/${ctx.taskId}/status`).set(...ctx.auth()).send({ status: "Completed" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, "Completed");

    const check = await request(app).get(`/api/tasks/${ctx.taskId}`).set(...ctx.auth());
    assert.ok(check.body.data.activity.some((a) => a.text.includes("marked this task as completed")));
  });

  test("Project counters synced after status change (completedTasks incremented)", async () => {
    const res = await request(app).get(`/api/projects/${ctx.projectId}`).set(...ctx.auth());
    assert.equal(res.body.data.completedTasks, 1);
    assert.equal(res.body.data.totalTasks, 1);
    assert.equal(res.body.data.progress, 100);
  });

  test("PATCH /api/tasks/:id/checklist/:checklistId -> 200, toggles done", async () => {
    const res = await request(app).patch(`/api/tasks/${ctx.taskId}/checklist/${ctx.checklistItemId}`).set(...ctx.auth()).send({ done: true });
    assert.equal(res.status, 200);
    const item = res.body.data.checklist.find((c) => c._id === ctx.checklistItemId);
    assert.equal(item.done, true);
  });

  test("PATCH .../checklist/:checklistId -> 404 for a nonexistent checklist item", async () => {
    const res = await request(app)
      .patch(`/api/tasks/${ctx.taskId}/checklist/${new mongoose.Types.ObjectId()}`)
      .set(...ctx.auth())
      .send({ done: true });
    assert.equal(res.status, 404);
  });

  test("POST /api/tasks/:taskId/comments -> 400 on empty text", async () => {
    const res = await request(app).post(`/api/tasks/${ctx.taskId}/comments`).set(...ctx.auth()).send({ text: "   " });
    assert.equal(res.status, 400);
  });

  test("POST /api/tasks/:taskId/comments -> 201", async () => {
    const res = await request(app).post(`/api/tasks/${ctx.taskId}/comments`).set(...ctx.auth()).send({ text: "Looks good, shipping it." });
    assert.equal(res.status, 201);
    ctx.commentId = res.body.data._id;
  });

  test("GET /api/tasks/:taskId/comments -> 200, includes the new comment", async () => {
    const res = await request(app).get(`/api/tasks/${ctx.taskId}/comments`).set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((c) => c._id === ctx.commentId));
  });

  test("DELETE /api/comments/:id -> 200", async () => {
    const res = await request(app).delete(`/api/comments/${ctx.commentId}`).set(...ctx.auth());
    assert.equal(res.status, 200);
  });
});

describe("10. Notifications", () => {
  test("GET /api/notifications -> 200 with unreadCount, includes the self-assignment notification", async () => {
    const res = await request(app).get("/api/notifications").set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.unreadCount === "number");
    assert.ok(res.body.data.length > 0);
    ctx.notificationId = res.body.data[0]._id;
  });

  test("PATCH /api/notifications/:id/read -> 200", async () => {
    const res = await request(app).patch(`/api/notifications/${ctx.notificationId}/read`).set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.equal(res.body.data.read, true);
  });

  test("PATCH /api/notifications/read-all -> 200, no unread left", async () => {
    const res = await request(app).patch("/api/notifications/read-all").set(...ctx.auth());
    assert.equal(res.status, 200);
    const check = await request(app).get("/api/notifications").set(...ctx.auth());
    assert.equal(check.body.unreadCount, 0);
  });
});

describe("11-13. Dashboard, analytics, team", () => {
  test("GET /api/dashboard/stats -> 200, correct shape", async () => {
    const res = await request(app).get("/api/dashboard/stats").set(...ctx.auth());
    assert.equal(res.status, 200);
    for (const key of ["total", "completed", "inProgress", "overdue", "myPending"]) {
      assert.ok(key in res.body.data, `missing ${key}`);
    }
  });

  test("GET /api/dashboard/productivity -> 200, 7 days", async () => {
    const res = await request(app).get("/api/dashboard/productivity").set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 7);
  });

  test("GET /api/dashboard/priority-breakdown -> 200, High/Medium/Low", async () => {
    const res = await request(app).get("/api/dashboard/priority-breakdown").set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.map((d) => d.name), ["High", "Medium", "Low"]);
  });

  test("GET /api/dashboard/project-progress -> 200", async () => {
    const res = await request(app).get("/api/dashboard/project-progress").set(...ctx.auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((p) => p._id === ctx.projectId));
  });

  test("GET /api/analytics -> 200, correct shape", async () => {
    const res = await request(app).get("/api/analytics").set(...ctx.auth());
    assert.equal(res.status, 200);
    for (const key of ["tasksCompleted", "tasksCreated", "completionRate", "overdueTasks", "priorityBreakdown", "projectTaskCounts", "monthlyTrend"]) {
      assert.ok(key in res.body.data, `missing ${key}`);
    }
  });

  test("GET /api/team -> 200, includes the test user with stats", async () => {
    const res = await request(app).get("/api/team").set(...ctx.auth());
    assert.equal(res.status, 200);
    const me = res.body.data.find((u) => u.email === uniqueEmail);
    assert.ok(me, "test user missing from /api/team");
    assert.ok("assigned" in me && "completed" in me && "productivity" in me);
  });
});

describe("14. Protected routes reject unauthenticated requests", () => {
  const protectedGets = [
    "/api/auth/me", "/api/users", "/api/projects", "/api/tasks",
    "/api/notifications", "/api/dashboard/stats", "/api/analytics", "/api/team",
  ];
  for (const route of protectedGets) {
    test(`GET ${route} -> 401 without a token`, async () => {
      const res = await request(app).get(route);
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  }
});

describe("17-18. Cleanup + delete-blocked-while-tasks-exist", () => {
  test("DELETE /api/projects/:id -> 409 while a task still references it", async () => {
    const res = await request(app).delete(`/api/projects/${ctx.projectId}`).set(...ctx.auth());
    assert.equal(res.status, 409);
  });

  test("DELETE /api/tasks/:id -> 200", async () => {
    const res = await request(app).delete(`/api/tasks/${ctx.taskId}`).set(...ctx.auth());
    assert.equal(res.status, 200);
  });

  test("DELETE /api/projects/:id -> 200 once its tasks are gone", async () => {
    const res = await request(app).delete(`/api/projects/${ctx.projectId}`).set(...ctx.auth());
    assert.equal(res.status, 200);
  });

  test("GET /api/nonexistent-route -> 404 with the standard error shape", async () => {
    const res = await request(app).get("/api/nonexistent-route");
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
