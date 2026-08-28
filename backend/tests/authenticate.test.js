/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithLists } from "./helpers.js";

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("API request includes session token", async () => {
      const { res: registerRes } = await registerUser();
      const token = registerRes.body.token;

      const res = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("Protected API request succeeds with a valid session", async () => {
      const { user: userA } = await createUserWithLists({
        username: "usera",
        email: "a@example.com",
        lists: ["A list"],
      });
      await createUserWithLists({
        username: "userb",
        email: "b@example.com",
        lists: ["B list"],
      });

      const login = await request(app).post("/todo/login").send({
        username: "usera",
        password: "password123",
      });

      const res = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${login.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("A list");
      expect(res.body[0].userId).toBe(userA.id);
      expect(res.body.every((list) => list.userId === userA.id)).toBe(true);
    });

    it("Expired or invalid session token", async () => {
      const { res: registerRes } = await registerUser();
      const token = registerRes.body.token;

      await db.session.update(
        { expirationDate: new Date(Date.now() - 1000) },
        { where: { token } }
      );

      const res = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      const res = await request(app).get("/todo/lists");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });
});
