import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import logger from "../config/logger.js";

const { user: User, session: Session } = db;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requiredMessage = (field, label) => {
  const value = field;
  if (value == null || String(value).trim() === "") {
    return `${label} is required.`;
  }
  return null;
};

const sessionPayload = (user, token) => ({
  userId: user.id,
  username: user.username,
  email: user.email,
  fName: user.fName,
  lName: user.lName,
  role: user.role,
  token,
});

const createSession = async (user) => {
  const token = jwt.sign({ id: user.id }, authConfig.secret, {
    expiresIn: authConfig.expiresIn,
  });
  const expirationDate = new Date(Date.now() + authConfig.expiresIn * 1000);

  await Session.create({
    token,
    email: user.email,
    expirationDate,
    userId: user.id,
  });

  return token;
};

const reuseOrCreateSession = async (user) => {
  const existing = await Session.findOne({
    where: {
      userId: user.id,
      expirationDate: { [Op.gte]: new Date() },
      token: { [Op.and]: [{ [Op.ne]: "" }, { [Op.ne]: null }] },
    },
  });

  if (existing) {
    return existing.token;
  }

  return createSession(user);
};

const uniqueConstraintMessage = (err) => {
  const fields = err.errors?.map((e) => e.path) || [];
  if (fields.includes("username")) {
    return "Username is already taken.";
  }
  if (fields.includes("email")) {
    return "Email is already registered.";
  }
  return "Account could not be created.";
};

const exports = {};

exports.register = async (req, res) => {
  try {
    const { fName, lName, email, username, password } = req.body || {};

    const missing =
      requiredMessage(fName, "First name") ||
      requiredMessage(lName, "Last name") ||
      requiredMessage(email, "Email") ||
      requiredMessage(username, "Username") ||
      requiredMessage(password, "Password");

    if (missing) {
      return res.status(400).send({ message: missing });
    }

    if (!EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).send({ message: "Enter a valid email address." });
    }

    if (String(password).length < 8) {
      return res.status(400).send({ message: "Password must be at least 8 characters." });
    }

    const hash = await bcrypt.hash(password, authConfig.saltRounds);
    const user = await User.create({
      fName,
      lName,
      email,
      username,
      password: hash,
      role: "worker",
    });

    const token = await createSession(user);
    return res.status(201).send(sessionPayload(user, token));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: uniqueConstraintMessage(err) });
    }
    logger.error(`register failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    const missingUsername = requiredMessage(username, "Username");
    if (missingUsername) {
      return res.status(400).send({ message: missingUsername });
    }

    const missingPassword = requiredMessage(password, "Password");
    if (missingPassword) {
      return res.status(400).send({ message: missingPassword });
    }

    const normalized = String(username).trim().toLowerCase();
    const user = await User.unscoped().findOne({ where: { username: normalized } });

    if (!user) {
      return res.status(401).send({ message: "Invalid username or password." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send({ message: "Invalid username or password." });
    }

    const token = await reuseOrCreateSession(user);
    return res.status(200).send(sessionPayload(user, token));
  } catch (err) {
    logger.error(`login failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.split(" ")[1];

    if (token) {
      await Session.update({ token: "" }, { where: { token } });
    }

    return res.status(200).send({ message: "Signed out successfully." });
  } catch (err) {
    logger.error(`logout failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

export default exports;
