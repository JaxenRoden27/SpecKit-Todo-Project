/**
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  createUserWithLists,
  createTodo,
  loginAs,
  bearer,
} from "./helpers.js";

describe("Feature 3 — Todo List Item Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      const { user, lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const session = await loginAs("alice");

      const res = await request(app)
        .post(`/todo/lists/${lists[0].id}/todos`)
        .set(bearer(session.token))
        .send({ title: "Buy milk" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: "Buy milk",
        completed: false,
        userId: user.id,
        listId: lists[0].id,
      });
    });

    it("User adds a todo with an empty title", async () => {
      const { lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const session = await loginAs("alice");

      const res = await request(app)
        .post(`/todo/lists/${lists[0].id}/todos`)
        .set(bearer(session.token))
        .send({ title: "   " });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Todo title is required." });
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("User only sees their own todos when opening items", async () => {
      const { user: userA, lists: listsA } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
        lists: ["Work"],
      });
      const { user: userB, lists: listsB } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Work"],
      });
      await createTodo({ user: userA, list: listsA[0], title: "My task" });
      await createTodo({ user: userB, list: listsB[0], title: "Their task" });
      const session = await loginAs("usera");

      const res = await request(app)
        .get(`/todo/lists/${listsA[0].id}/todos`)
        .set(bearer(session.token));

      expect(res.status).toBe(200);
      expect(res.body.map((todo) => todo.title)).toEqual(["My task"]);
      expect(res.body.map((todo) => todo.title)).not.toContain("Their task");
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      const { user, lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const todo = await createTodo({
        user,
        list: lists[0],
        title: "Buy milk",
        completed: false,
      });
      const session = await loginAs("alice");

      const res = await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set(bearer(session.token))
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
    });

    it("User marks a completed todo as incomplete", async () => {
      const { user, lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const todo = await createTodo({
        user,
        list: lists[0],
        title: "Buy milk",
        completed: true,
      });
      const session = await loginAs("alice");

      const res = await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set(bearer(session.token))
        .send({ completed: false });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      const { user, lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const todo = await createTodo({ user, list: lists[0], title: "Buy milk" });
      const session = await loginAs("alice");

      const res = await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set(bearer(session.token))
        .send({ title: "Buy oat milk" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Buy oat milk");
    });

    it("User deletes a todo", async () => {
      const { user, lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const todo = await createTodo({ user, list: lists[0], title: "Buy milk" });
      const session = await loginAs("alice");

      const res = await request(app)
        .delete(`/todo/todos/${todo.id}`)
        .set(bearer(session.token));

      expect([200, 204]).toContain(res.status);
      expect(await db.todo.findByPk(todo.id)).toBeNull();
    });
  });

  describe("US-3.5 — Private items only", () => {
    it("User cannot read todos in another user's list", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { user: userB, lists } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Secret"],
      });
      await createTodo({ user: userB, list: lists[0], title: "Hidden task" });
      const session = await loginAs("usera");

      const res = await request(app)
        .get(`/todo/lists/${lists[0].id}/todos`)
        .set(bearer(session.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${lists[0].id} not found.` });
      expect(JSON.stringify(res.body)).not.toContain("Hidden task");
    });

    it("User attempts to add a todo to another user's list", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { lists } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Secret"],
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .post(`/todo/lists/${lists[0].id}/todos`)
        .set(bearer(session.token))
        .send({ title: "Intruder task" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${lists[0].id} not found.` });
      expect(await db.todo.count({ where: { listId: lists[0].id } })).toBe(0);
    });

    it("User attempts to rename another user's todo", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { user: userB, lists } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Secret"],
      });
      const todo = await createTodo({ user: userB, list: lists[0], title: "Hidden task" });
      const session = await loginAs("usera");

      const res = await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set(bearer(session.token))
        .send({ title: "Hijacked" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `Todo with id=${todo.id} not found.` });
      expect((await db.todo.findByPk(todo.id)).title).toBe("Hidden task");
    });

    it("User attempts to delete another user's todo", async () => {
      await createUserWithLists({ username: "usera", email: "a@example.com" });
      const { user: userB, lists } = await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["Secret"],
      });
      const todo = await createTodo({ user: userB, list: lists[0], title: "Hidden task" });
      const session = await loginAs("usera");

      const res = await request(app)
        .delete(`/todo/todos/${todo.id}`)
        .set(bearer(session.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `Todo with id=${todo.id} not found.` });
      expect(await db.todo.findByPk(todo.id)).not.toBeNull();
    });

    it("Client cannot assign a todo to another user on create", async () => {
      const { user, lists } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
        lists: ["Groceries"],
      });
      const session = await loginAs("usera");

      const res = await request(app)
        .post(`/todo/lists/${lists[0].id}/todos`)
        .set(bearer(session.token))
        .send({ title: "Buy milk", userId: 999 });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(user.id);
      expect(res.body.userId).not.toBe(999);
      expect((await db.todo.findByPk(res.body.id)).userId).toBe(user.id);
    });

    it("Unauthenticated API request for todos", async () => {
      const res = await request(app).get("/todo/lists/1/todos");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-3.6 — Lists carry their items", () => {
    it("Deleting a list removes its todos", async () => {
      const { user, lists } = await createUserWithLists({
        username: "alice",
        email: "alice@example.com",
        lists: ["Groceries"],
      });
      const milk = await createTodo({ user, list: lists[0], title: "Buy milk" });
      const eggs = await createTodo({ user, list: lists[0], title: "Buy eggs" });
      const session = await loginAs("alice");

      const res = await request(app)
        .delete(`/todo/lists/${lists[0].id}`)
        .set(bearer(session.token));

      expect([200, 204]).toContain(res.status);
      expect(await db.todo.findByPk(milk.id)).toBeNull();
      expect(await db.todo.findByPk(eggs.id)).toBeNull();

      const todosRes = await request(app)
        .get(`/todo/lists/${lists[0].id}/todos`)
        .set(bearer(session.token));
      expect(todosRes.status).toBe(404);
    });
  });
});
