const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AVATAR_GRADIENTS = [
  "indigo-violet", "sky-indigo", "violet-fuchsia",
  "emerald-teal", "amber-orange", "rose-pink",
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    // Permission role (authorization), distinct from the person's job title shown in the UI.
    role: { type: String, enum: ["admin", "member"], default: "member" },
    // Job title displayed in Team/Profile pages, e.g. "Product Manager".
    jobTitle: { type: String, default: "Team Member", trim: true, maxlength: 80 },
    avatarColor: { type: String, enum: AVATAR_GRADIENTS, default: "indigo-violet" },
    bio: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Deterministic gradient + initials on read, mirrors the frontend's InitialsAvatar.
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    jobTitle: this.jobTitle,
    avatarColor: this.avatarColor,
    bio: this.bio,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
