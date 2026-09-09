const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const Project = require("../models/Project");
const Task = require("../models/Task");

// @route GET /api/projects
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find().populate("members", "name email jobTitle avatarColor").populate("owner", "name email");
  sendSuccess(res, projects);
});

// @route GET /api/projects/:id
const getProjectById = asyncHandler(async (req, res) => {
  // A malformed id can never match a document, so treat it the same as a
  // well-formed-but-nonexistent id (404) rather than letting it fall through
  // to a generic CastError. This is a GET-by-id — an id in the URL is a
  // resource lookup, unlike an id inside a request body (e.g. "assignee" on
  // task creation), which is a client input error and correctly stays 400.
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(404, "Project not found");
  }
  const project = await Project.findById(req.params.id).populate("members", "name email jobTitle avatarColor").populate("owner", "name email");
  if (!project) throw new ApiError(404, "Project not found");
  sendSuccess(res, project);
});

// @route POST /api/projects
const createProject = asyncHandler(async (req, res) => {
  const { name, description, status, progress, dueDate, members, color } = req.body;
  if (!name) throw new ApiError(400, "Project name is required");

  const project = await Project.create({
    name,
    description,
    status,
    progress,
    dueDate,
    members: members || [],
    color,
    owner: req.user._id,
  });
  sendSuccess(res, project, 201);
});

// @route PUT /api/projects/:id
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");

  const editable = ["name", "description", "status", "progress", "dueDate", "members", "color"];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) project[field] = req.body[field];
  });

  await project.save();
  sendSuccess(res, project);
});

// @route DELETE /api/projects/:id
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");

  const taskCount = await Task.countDocuments({ project: project._id });
  if (taskCount > 0) {
    throw new ApiError(409, `Cannot delete: ${taskCount} task(s) still belong to this project`);
  }

  await project.deleteOne();
  sendSuccess(res, { id: req.params.id, deleted: true });
});

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject };
