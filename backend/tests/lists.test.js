/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
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

describe("Feature 2 — Todo List Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      const { user } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
      });
      const session = await loginAs("alice");

      const res = await request(app)
        .post("/todo/lists")
        .set(bearer(session.token))
        .send({ name: "Groceries" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        name: "Groceries",
        userId: user.id,
      });
    });

    it("User creates a list with an empty name", async () => {
      await createUserWithLists({ username: "alice", email: "alice@example.com" });
      const session = await loginAs("alice");

      const res = await request(app)
        .post("/todo/lists")
        .set(bearer(session.token))
        .send({ name: "   " });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "List name is required." });
    });

    it("User creates a list with a name that is too long", async () => {
      await createUserWithLists({ username: "alice", email: "alice@example.com" });
      const session = await loginAs("alice");

      const res = await request(app)
        .post("/todo/lists")
        .set(bearer(session.token))
        .send({ name: "a".repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "List name must be 100 characters or fewer." });
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Work", "Personal"],
      });
      const session = await loginAs("alice");

      const res = await request(app).get("/todo/lists").set(bearer(session.token));

      expect(res.status).toBe(200);
      expect(res.body.map((list) => list.name)).toEqual(["Personal", "Work"]);
    });

    it("User cannot see another user's lists", async () => {
      const { user: userA } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
        lists: ["Mine"],
      });
      await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Secret Project"],
      });
      const session = await loginAs("usera");

      const res = await request(app).get("/todo/lists").set(bearer(session.token));

      expect(res.status).toBe(200);
      expect(res.body.every((list) => list.userId === userA.id)).toBe(true);
      expect(res.body.map((list) => list.name)).not.toContain("Secret Project");
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      const { lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const session = await loginAs("alice");

      const res = await request(app)
        .put(`/todo/lists/${lists[0].id}`)
        .set(bearer(session.token))
        .send({ name: "Shopping" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: lists[0].id,
        name: "Shopping",
      });
    });

    it("User deletes a list", async () => {
      const { lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const session = await loginAs("alice");

      const res = await request(app)
        .delete(`/todo/lists/${lists[0].id}`)
        .set(bearer(session.token));

      expect([200, 204]).toContain(res.status);
      expect(await db.list.findByPk(lists[0].id)).toBeNull();
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("User attempts to rename another user's list", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { lists } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Secret Project"],
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/lists/${lists[0].id}`)
        .set(bearer(session.token))
        .send({ name: "Hijacked" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${lists[0].id} not found.` });

      const unchanged = await db.list.findByPk(lists[0].id);
      expect(unchanged.name).toBe("Secret Project");
    });

    it("User attempts to delete another user's list", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { lists } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Secret Project"],
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .delete(`/todo/lists/${lists[0].id}`)
        .set(bearer(session.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${lists[0].id} not found.` });
      expect(await db.list.findByPk(lists[0].id)).not.toBeNull();
    });

    it("Client cannot assign a list to another user on create", async () => {
      const { user: userA } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .post("/todo/lists")
        .set(bearer(session.token))
        .send({ name: "Groceries", userId: 999 });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(userA.id);
      expect(res.body.userId).not.toBe(999);

      const stored = await db.list.findByPk(res.body.id);
      expect(stored.userId).toBe(userA.id);
    });

    it("Unauthenticated API request to lists", async () => {
      const res = await request(app).get("/todo/lists");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });
});
