import bcrypt from "bcryptjs";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import logger from "../config/logger.js";
import { getAccessibleUserOrNull } from "../authorization/authorization.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const exports = {};

const parseId = (value) => {
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
};

const requiredMessage = (field, label) => {
  if (field == null || String(field).trim() === "") {
    return `${label} is required.`;
  }
  return null;
};

const uniqueConstraintMessage = (err) => {
  const fields = err.errors?.map((e) => e.path) || [];
  if (fields.includes("username")) {
    return "Username is already taken.";
  }
  if (fields.includes("email")) {
    return "Email is already registered.";
  }
  return "Profile could not be updated.";
};

const profilePayload = (user) => ({
  id: user.id,
  fName: user.fName,
  lName: user.lName,
  email: user.email,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

exports.findOne = async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    if (userId == null) {
      return res.status(400).send({ message: "Invalid user id." });
    }

    const user = await getAccessibleUserOrNull(req, userId);
    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    return res.send(profilePayload(user));
  } catch (err) {
    logger.error(`user findOne failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    if (userId == null) {
      return res.status(400).send({ message: "Invalid user id." });
    }

    const user = await getAccessibleUserOrNull(req, userId);
    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    const { fName, lName, email, username, password } = req.body || {};

    if (password != null && String(password).trim() !== "" && String(password).length < 8) {
      return res.status(400).send({ message: "Password must be at least 8 characters." });
    }

    const missing =
      requiredMessage(fName, "First name") ||
      requiredMessage(lName, "Last name") ||
      requiredMessage(email, "Email") ||
      requiredMessage(username, "Username");

    if (missing) {
      return res.status(400).send({ message: missing });
    }

    if (!EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).send({ message: "Enter a valid email address." });
    }

    const scopedUser = await db.user.unscoped().findByPk(user.id);

    if (password != null && String(password).trim() !== "") {
      scopedUser.password = await bcrypt.hash(password, authConfig.saltRounds);
    }

    scopedUser.fName = String(fName).trim();
    scopedUser.lName = String(lName).trim();
    scopedUser.email = String(email).trim();
    scopedUser.username = String(username).trim().toLowerCase();
    await scopedUser.save();

    const refreshed = await db.user.findByPk(user.id);
    return res.send(profilePayload(refreshed));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: uniqueConstraintMessage(err) });
    }
    logger.error(`user update failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

export default exports;
