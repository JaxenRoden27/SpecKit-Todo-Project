/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Register from "../src/views/Register.vue";
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

async function submitRegister(wrapper) {
  await wrapper.get("form").trigger("submit.prevent");
  await flushPromises();
}

async function fillValidRegistration(wrapper, overrides = {}) {
  const values = {
    "First name": "Jane",
    "Last name": "Doe",
    Email: "jane@example.com",
    Username: "jdoe",
    Password: "password123",
    "Confirm password": "password123",
    ...overrides,
  };

  for (const [label, value] of Object.entries(values)) {
    await (await fieldByLabel(wrapper, label)).setValue(value);
  }
}

const sessionPayload = {
  userId: 1,
  username: "jdoe",
  email: "jane@example.com",
  fName: "Jane",
  lName: "Doe",
  role: "worker",
  token: "jwt-token",
};

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("US-1.1 — Registration", () => {
    it("User registers with valid information", async () => {
      AuthServices.registerUser.mockResolvedValue({ data: sessionPayload });
      const { wrapper, router } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });

      await fillValidRegistration(wrapper);
      await submitRegister(wrapper);

      expect(AuthServices.registerUser).toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem("user"))).toMatchObject(sessionPayload);
      expect(router.currentRoute.value.name).toBe("home");
    });

    it("User submits registration with invalid email format", async () => {
      const { wrapper } = await mountWithPlugins(Register);

      await fillValidRegistration(wrapper, { Email: "notanemail" });
      await submitRegister(wrapper);

      expect(wrapper.text()).toContain("Enter a valid email address.");
      expect(AuthServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with missing username", async () => {
      const { wrapper } = await mountWithPlugins(Register);

      await fillValidRegistration(wrapper, { Username: "" });
      await submitRegister(wrapper);

      expect(wrapper.text()).toContain("Username is required.");
      expect(AuthServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with password too short", async () => {
      const { wrapper } = await mountWithPlugins(Register);

      await fillValidRegistration(wrapper, { Password: "short", "Confirm password": "short" });
      await submitRegister(wrapper);

      expect(wrapper.text()).toContain("Password must be at least 8 characters.");
      expect(AuthServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with mismatched passwords", async () => {
      const { wrapper } = await mountWithPlugins(Register);

      await fillValidRegistration(wrapper, { "Confirm password": "password456" });
      await submitRegister(wrapper);

      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(AuthServices.registerUser).not.toHaveBeenCalled();
    });

    it("User registers with a duplicate username", async () => {
      AuthServices.registerUser.mockRejectedValue({
        response: { status: 400, data: { message: "Username is already taken." } },
      });
      const { wrapper } = await mountWithPlugins(Register);

      await fillValidRegistration(wrapper);
      await submitRegister(wrapper);

      expect(wrapper.find(".v-alert").exists()).toBe(true);
      expect(wrapper.text()).toContain("Username is already taken.");
    });

    it("User registers with a duplicate email", async () => {
      AuthServices.registerUser.mockRejectedValue({
        response: { status: 400, data: { message: "Email is already registered." } },
      });
      const { wrapper } = await mountWithPlugins(Register);

      await fillValidRegistration(wrapper);
      await submitRegister(wrapper);

      expect(wrapper.find(".v-alert").exists()).toBe(true);
      expect(wrapper.text()).toContain("Email is already registered.");
    });
  });
});
