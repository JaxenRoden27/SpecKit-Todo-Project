/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Login from "../src/views/Login.vue";
import AuthServices from "../src/services/authServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

async function fieldByLabel(wrapper, label) {
  const fields = wrapper.findAllComponents({ name: "VTextField" });
  const match = fields.find((field) => field.props("label") === label);
  if (!match) {
    throw new Error(`No v-text-field with label "${label}"`);
  }
  return match;
}

async function submitLogin(wrapper) {
  await wrapper.get("form").trigger("submit.prevent");
  await flushPromises();
}

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("US-1.2 — Sign in", () => {
    it("User signs in with valid credentials", async () => {
      const payload = {
        userId: 1,
        username: "jdoe",
        email: "jdoe@example.com",
        fName: "Jane",
        lName: "Doe",
        role: "worker",
        token: "jwt-token",
      };
      AuthServices.loginUser.mockResolvedValue({ data: payload });

      const { wrapper, router } = await mountWithPlugins(Login, {
        router: await createTestRouter("/login"),
      });
      await (await fieldByLabel(wrapper, "Username")).setValue("jdoe");
      await (await fieldByLabel(wrapper, "Password")).setValue("password123");
      await submitLogin(wrapper);

      expect(AuthServices.loginUser).toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem("user"))).toMatchObject(payload);
      expect(router.currentRoute.value.name).toBe("home");
    });

    it("User signs in with invalid password", async () => {
      AuthServices.loginUser.mockRejectedValue({
        response: {
          status: 401,
          data: { message: "Invalid username or password." },
        },
      });

      const { wrapper, router } = await mountWithPlugins(Login, {
        router: await createTestRouter("/login"),
      });
      await (await fieldByLabel(wrapper, "Username")).setValue("jdoe");
      await (await fieldByLabel(wrapper, "Password")).setValue("wrong-password");
      await submitLogin(wrapper);

      expect(AuthServices.loginUser).toHaveBeenCalled();
      expect(wrapper.find(".v-alert").exists()).toBe(true);
      expect(wrapper.text()).toContain("Invalid username or password.");
      expect(router.currentRoute.value.name).toBe("login");
    });

    it("User signs in with missing username", async () => {
      const { wrapper } = await mountWithPlugins(Login);
      await (await fieldByLabel(wrapper, "Password")).setValue("password123");
      await submitLogin(wrapper);

      expect(wrapper.text()).toContain("Username is required.");
      expect(AuthServices.loginUser).not.toHaveBeenCalled();
    });

    it("User signs in with missing password", async () => {
      const { wrapper } = await mountWithPlugins(Login);
      await (await fieldByLabel(wrapper, "Username")).setValue("jdoe");
      await submitLogin(wrapper);

      expect(wrapper.text()).toContain("Password is required.");
      expect(AuthServices.loginUser).not.toHaveBeenCalled();
    });
  });
});
