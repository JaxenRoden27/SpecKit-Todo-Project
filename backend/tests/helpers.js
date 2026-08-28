import bcrypt from "bcryptjs";
import request from "supertest";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";
import app from "../server.js";

/** Sync schema for tests. */
export const syncTestDatabase = async () => {
  await db.sequelize.sync({ force: true });
};

export const validRegisterBody = (overrides = {}) => ({
  fName: "Jane",
  lName: "Doe",
  email: "jdoe@example.com",
  username: "jdoe",
  password: "password123",
  ...overrides,
});

export const registerUser = async (overrides = {}) => {
  const body = validRegisterBody(overrides);
  const res = await request(app).post("/todo/register").send(body);
  return { res, body };
};

export const createUserWithLists = async ({
  username,
  email,
  password = "password123",
  lists = [],
} = {}) => {
  const hash = await bcrypt.hash(password, authConfig.saltRounds);
  const user = await db.user.create({
    fName: "Test",
    lName: "User",
    email,
    username,
    password: hash,
    role: "worker",
  });

  const createdLists = [];
  for (const name of lists) {
    createdLists.push(await db.list.create({ name, userId: user.id }));
  }

  return { user, password, lists: createdLists };
};

export const loginAs = async (username, password = "password123") => {
  const res = await request(app).post("/todo/login").send({ username, password });
  return res.body;
};

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
