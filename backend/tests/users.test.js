/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  createUserWithLists,
  loginAs,
  bearer,
} from "./helpers.js";

const profileBody = (overrides = {}) => ({
  fName: "Jane",
  lName: "Doe",
  email: "a@example.com",
  username: "usera",
  ...overrides,
});

describe("Feature 4 — User Profile Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-4.2 — Edit profile", () => {
    it("User saves profile changes", async () => {
      const { user } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/users/${user.id}`)
        .set(bearer(session.token))
        .send({
          fName: "Janet",
          lName: "Smith",
          email: "janet@example.com",
          username: "janet",
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: user.id,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
        role: "worker",
      });
      expect(res.body.password).toBeUndefined();
    });

    it("User fetches their own profile", async () => {
      const { user } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .get(`/todo/users/${user.id}`)
        .set(bearer(session.token));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: user.id,
        fName: "Test",
        lName: "User",
        email: "a@example.com",
        username: "usera",
        role: "worker",
      });
      expect(res.body.password).toBeUndefined();
    });

    it("User attempts to fetch another user's profile", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { user: userB } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .get(`/todo/users/${userB.id}`)
        .set(bearer(session.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `User with id=${userB.id} not found.` });
    });

    it("User attempts to update another user's profile", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { user: userB } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/users/${userB.id}`)
        .set(bearer(session.token))
        .send(profileBody({ username: "hijacked", email: "hijacked@example.com" }));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `User with id=${userB.id} not found.` });

      const unchanged = await db.user.findByPk(userB.id);
      expect(unchanged.username).toBe("userb");
      expect(unchanged.email).toBe("b@example.com");
    });

    it("Unauthenticated profile API request", async () => {
      const res = await request(app).get("/todo/users/1");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });

    it("Profile update rejects a password that is too short", async () => {
      const { user } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/users/${user.id}`)
        .set(bearer(session.token))
        .send({ password: "short" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Password must be at least 8 characters." });
    });

    it("Profile update rejects missing required fields", async () => {
      const { user } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/users/${user.id}`)
        .set(bearer(session.token))
        .send({
          lName: "User",
          email: "a@example.com",
          username: "usera",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "First name is required." });

      const unchanged = await db.user.findByPk(user.id);
      expect(unchanged.fName).toBe("Test");
    });

    it("Profile update rejects a duplicate username", async () => {
      const { user: userA } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
      });
      await createUserWithLists({ username: "userb", email: "b@example.com" });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/users/${userA.id}`)
        .set(bearer(session.token))
        .send(profileBody({ username: "userb" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Username is already taken." });

      const userB = await db.user.findOne({ where: { email: "b@example.com" } });
      expect(userB.username).toBe("userb");
    });

    it("Profile update rejects a duplicate email", async () => {
      const { user: userA } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
      });
      await createUserWithLists({ username: "userb", email: "b@example.com" });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/users/${userA.id}`)
        .set(bearer(session.token))
        .send(profileBody({ email: "b@example.com" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Email is already registered." });

      const userB = await db.user.findOne({ where: { username: "userb" } });
      expect(userB.email).toBe("b@example.com");
    });

    it("Unauthenticated profile update API request", async () => {
      const res = await request(app).put("/todo/users/1").send(profileBody());

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });
});
