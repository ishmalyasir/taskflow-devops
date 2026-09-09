require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/User");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");

const USERS = [
  { name: "Lisa Anderson", email: "lisa.anderson@taskflow.io", password: "password123", role: "admin", jobTitle: "Product Manager", avatarColor: "indigo-violet" },
  { name: "Sarah Mitchell", email: "sarah.mitchell@taskflow.io", password: "password123", role: "member", jobTitle: "UI/UX Designer", avatarColor: "sky-indigo" },
  { name: "Daniel Carter", email: "daniel.carter@taskflow.io", password: "password123", role: "member", jobTitle: "Frontend Developer", avatarColor: "violet-fuchsia" },
  { name: "Emily Johnson", email: "emily.johnson@taskflow.io", password: "password123", role: "member", jobTitle: "Backend Developer", avatarColor: "emerald-teal" },
  { name: "Michael Brown", email: "michael.brown@taskflow.io", password: "password123", role: "member", jobTitle: "QA Engineer", avatarColor: "amber-orange" },
  { name: "Olivia Wilson", email: "olivia.wilson@taskflow.io", password: "password123", role: "member", jobTitle: "Project Manager", avatarColor: "rose-pink" },
];

async function run() {
  await connectDB();

  if (process.argv.includes("-d")) {
    await Promise.all([
      Notification.deleteMany(), Activity.deleteMany(), Comment.deleteMany(),
      Task.deleteMany(), Project.deleteMany(), User.deleteMany(),
    ]);
    console.log("All TaskFlow collections cleared.");
    return mongoose.connection.close();
  }

  // Wipe first so the script is safely re-runnable.
  await Promise.all([
    Notification.deleteMany(), Activity.deleteMany(), Comment.deleteMany(),
    Task.deleteMany(), Project.deleteMany(), User.deleteMany(),
  ]);

  // Users (password hashing happens in the User pre-save hook).
  const createdUsers = [];
  for (const u of USERS) createdUsers.push(await User.create(u));
  const [lisa, sarah, daniel, emily, michael, olivia] = createdUsers;

  // Projects
  const projectDefs = [
    { name: "Website Redesign", description: "Redesign the company website with a modern responsive interface, improved navigation and a stronger user experience across desktop, tablet and mobile.", status: "In Progress", dueDate: "2026-09-15", members: [lisa, sarah, daniel, olivia], color: "indigo", owner: lisa },
    { name: "Mobile App Launch", description: "Prepare the mobile application for production launch, including onboarding, QA testing, app-store assets and final performance optimization.", status: "In Progress", dueDate: "2026-10-03", members: [sarah, daniel, emily, michael], color: "violet", owner: olivia },
    { name: "Marketing Campaign", description: "Plan and execute the Q4 digital marketing campaign including content, paid advertising, analytics and campaign reporting.", status: "In Progress", dueDate: "2026-09-22", members: [lisa, olivia, sarah], color: "sky", owner: lisa },
    { name: "E-commerce Platform", description: "Build a scalable ecommerce experience with product discovery, cart management, checkout and order tracking.", status: "In Progress", dueDate: "2026-11-01", members: [daniel, emily, michael], color: "emerald", owner: emily },
    { name: "Product Launch", description: "Coordinate the launch of a new digital product across design, development, marketing and customer support.", status: "Planning", dueDate: "2026-11-20", members: [lisa, sarah, emily, michael, olivia], color: "amber", owner: lisa },
  ];
  const projects = [];
  for (const p of projectDefs) projects.push(await Project.create(p));
  const [website, mobile, marketing, ecommerce, launch] = projects;

  // Tasks — mirrors the frontend's demo set, now with real ObjectId refs.
  const taskDefs = [
    { title: "Finalize landing page design", project: website, priority: "High", status: "In Review", assignee: sarah, dueDate: "2026-09-01", tags: ["Design"], description: "Finalize the responsive landing page layout and prepare the final design for developer handoff.", checklist: [{ label: "Desktop design", done: true }, { label: "Mobile layout", done: true }, { label: "Tablet optimization", done: false }, { label: "Developer handoff", done: false }] },
    { title: "Review mobile onboarding flow", project: mobile, priority: "Medium", status: "To Do", assignee: michael, dueDate: "2026-09-02", tags: ["QA"], description: "Review onboarding screens and make sure the new user flow works consistently across mobile devices." },
    { title: "Prepare campaign analytics report", project: marketing, priority: "High", status: "In Progress", assignee: lisa, dueDate: "2026-09-05", tags: ["Research"], description: "Compile campaign performance data and prepare the weekly marketing performance report." },
    { title: "Design responsive checkout page", project: ecommerce, priority: "High", status: "In Progress", assignee: sarah, dueDate: "2026-09-04", tags: ["Design", "Frontend"], description: "Create a responsive checkout experience for desktop, tablet and mobile users." },
    { title: "Build product filtering API", project: ecommerce, priority: "Medium", status: "In Progress", assignee: emily, dueDate: "2026-09-08", tags: ["Backend", "API"] },
    { title: "Set up app store listing assets", project: mobile, priority: "Medium", status: "To Do", assignee: sarah, dueDate: "2026-09-10", tags: ["Design", "Launch"] },
    { title: "QA regression pass on payment flow", project: ecommerce, priority: "High", status: "To Do", assignee: michael, dueDate: "2026-09-03", tags: ["QA"] },
    { title: "Write Q4 campaign ad copy", project: marketing, priority: "Medium", status: "Completed", assignee: olivia, dueDate: "2026-08-28", tags: ["Copy"] },
    { title: "Homepage hero section redesign", project: website, priority: "High", status: "Completed", assignee: sarah, dueDate: "2026-08-25", tags: ["Design"] },
    { title: "Implement navigation component", project: website, priority: "Medium", status: "Completed", assignee: daniel, dueDate: "2026-08-27", tags: ["Frontend"] },
    { title: "Set up push notification service", project: mobile, priority: "Low", status: "Backlog", assignee: emily, dueDate: "2026-09-18", tags: ["Backend"] },
    { title: "Competitive research: onboarding UX", project: mobile, priority: "Low", status: "Backlog", assignee: lisa, dueDate: "2026-09-16", tags: ["Research"] },
    { title: "Cart abandonment email sequence", project: ecommerce, priority: "Medium", status: "To Do", assignee: olivia, dueDate: "2026-09-09", tags: ["Copy"] },
    { title: "Fix checkout API validation bug", project: ecommerce, priority: "High", status: "In Progress", assignee: emily, dueDate: "2026-09-02", tags: ["Backend", "API"] },
    { title: "Landing page A/B test setup", project: marketing, priority: "Medium", status: "In Review", assignee: lisa, dueDate: "2026-09-06", tags: ["Research"] },
    { title: "Design product launch keynote deck", project: launch, priority: "Medium", status: "To Do", assignee: olivia, dueDate: "2026-09-25", tags: ["Design", "Launch"] },
    { title: "Coordinate press kit with PR team", project: launch, priority: "Low", status: "Backlog", assignee: lisa, dueDate: "2026-10-02", tags: ["Launch"] },
    { title: "Accessibility audit for redesign", project: website, priority: "Medium", status: "To Do", assignee: michael, dueDate: "2026-09-12", tags: ["QA", "Design"] },
    { title: "Set up analytics dashboards", project: marketing, priority: "Low", status: "In Progress", assignee: emily, dueDate: "2026-09-14", tags: ["Backend"] },
    { title: "Onboarding tutorial illustrations", project: mobile, priority: "Medium", status: "In Progress", assignee: sarah, dueDate: "2026-09-07", tags: ["Design"] },
    { title: "Product photography retouching", project: ecommerce, priority: "Low", status: "To Do", assignee: sarah, dueDate: "2026-09-19", tags: ["Design"] },
    { title: "Support macro responses for launch", project: launch, priority: "Low", status: "Backlog", assignee: michael, dueDate: "2026-10-05", tags: ["QA"] },
    { title: "Migrate database schema for orders", project: ecommerce, priority: "High", status: "To Do", assignee: emily, dueDate: "2026-09-11", tags: ["Backend"] },
    { title: "Finalize brand voice guidelines", project: launch, priority: "Medium", status: "Completed", assignee: olivia, dueDate: "2026-08-30", tags: ["Copy"] },
    { title: "User testing session recap", project: website, priority: "Medium", status: "In Review", assignee: lisa, dueDate: "2026-09-03", tags: ["Research"] },
  ];

  const tasks = [];
  let completedSeen = 0;
  for (const t of taskDefs) {
    const task = await Task.create({
      title: t.title,
      description: t.description || "",
      project: t.project._id,
      priority: t.priority,
      status: t.status,
      assignee: t.assignee._id,
      dueDate: new Date(t.dueDate),
      tags: t.tags || [],
      checklist: t.checklist || [
        { label: "Review requirements", done: true },
        { label: "Draft first pass", done: true },
        { label: "Get feedback", done: false },
        { label: "Finalize and hand off", done: false },
      ],
      createdBy: lisa._id,
    });
    tasks.push(task);

    await Activity.create({ task: task._id, user: t.assignee._id, type: "task_created", text: `${t.assignee.name} created this task.` });
    if (t.status !== "To Do") {
      await Activity.create({ task: task._id, user: lisa._id, type: "status_changed", text: `Lisa moved the task to ${t.status}.` });
    }
    // Tasks seeded directly as "Completed" skip updateTaskStatus (the code
    // path that normally logs a task_completed activity), so log one here
    // too — otherwise GET /api/dashboard/productivity has nothing to
    // aggregate and the productivity chart is empty on a fresh seed.
    if (t.status === "Completed") {
      const daysAgo = completedSeen % 7; // spread across the last week
      completedSeen += 1;
      const backdated = new Date();
      backdated.setDate(backdated.getDate() - daysAgo);
      const completedActivity = await Activity.create({
        task: task._id,
        user: t.assignee._id,
        type: "task_completed",
        text: `${t.assignee.name} marked this task as completed.`,
      });
      await Activity.updateOne({ _id: completedActivity._id }, { $set: { createdAt: backdated } });
    }
  }

  // Recompute project counters from the real tasks we just created.
  for (const p of projects) {
    const totalTasks = tasks.filter((t) => String(t.project) === String(p._id)).length;
    const completedTasks = tasks.filter((t) => String(t.project) === String(p._id) && t.status === "Completed").length;
    p.totalTasks = totalTasks;
    p.completedTasks = completedTasks;
    p.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    await p.save();
  }

  // A handful of comments on a few tasks.
  const checkoutTask = tasks.find((t) => t.title === "Design responsive checkout page");
  const landingTask = tasks.find((t) => t.title === "Finalize landing page design");
  await Comment.create([
    { task: landingTask._id, user: sarah._id, text: "Desktop layout is locked. Starting on the tablet breakpoint today." },
    { task: landingTask._id, user: daniel._id, text: "I can start implementation once the final responsive design is approved." },
    { task: checkoutTask._id, user: emily._id, text: "Backend validation for guest checkout is ready whenever the design is final." },
  ]);
  await Activity.create([
    { task: landingTask._id, user: sarah._id, type: "comment_added", text: "Sarah added a comment." },
    { task: landingTask._id, user: daniel._id, type: "comment_added", text: "Daniel added a comment." },
    { task: checkoutTask._id, user: emily._id, type: "comment_added", text: "Emily added a comment." },
  ]);

  // Notifications
  await Notification.create([
    { user: lisa._id, text: 'Sarah completed "Homepage hero section redesign".', kind: "done", read: false },
    { user: emily._id, text: 'Your task "Fix checkout API validation bug" is due tomorrow.', kind: "due", read: false, relatedTask: (tasks.find((t) => t.title === "Fix checkout API validation bug"))._id },
    { user: lisa._id, text: "Daniel commented on Mobile App Launch.", kind: "comment", read: false },
    { user: olivia._id, text: "Marketing Campaign reached 65% completion.", kind: "progress", read: true },
    { user: lisa._id, text: 'Emily assigned you a new task: "Set up analytics dashboards".', kind: "assign", read: true },
    { user: michael._id, text: "Michael flagged a QA issue on E-commerce Platform.", kind: "alert", read: true },
    { user: olivia._id, text: 'Olivia moved "Landing page A/B test setup" to In Review.', kind: "status", read: true },
    { user: sarah._id, text: "Sarah added 3 new comments on Website Redesign.", kind: "comment", read: true },
    { user: michael._id, text: 'Your task "QA regression pass on payment flow" is overdue.', kind: "alert", read: true },
    { user: lisa._id, text: "Product Launch project was created.", kind: "progress", read: true },
  ]);

  console.log("Seed complete:");
  console.log(`  Users: ${createdUsers.length}`);
  console.log(`  Projects: ${projects.length}`);
  console.log(`  Tasks: ${tasks.length}`);
  console.log("\nDemo login (all seeded users share this password): password123");
  console.log("e.g. lisa.anderson@taskflow.io / password123");

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
