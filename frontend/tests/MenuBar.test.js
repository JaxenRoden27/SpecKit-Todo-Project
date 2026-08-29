/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MenuBar from "../src/components/MenuBar.vue";
import AuthServices from "../src/services/authServices.js";
import UserServices from "../src/services/userServices.js";
import Utils from "../src/config/utils.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const sessionUser = {
  userId: 1,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
  token: "jwt-token",
};

const profile = {
  id: 1,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
};

function clickExact(wrapper, text) {
  const matches = wrapper.findAll("button").filter((btn) => btn.text().trim() === text);
  const match = matches[matches.length - 1];
  if (!match) {
    throw new Error(`No button with exact text "${text}"`);
  }
  return match.trigger("click");
}

function fieldByLabel(wrapper, label) {
  const match = wrapper.findAllComponents({ name: "VTextField" }).find(
    (field) => field.props("label") === label
  );
  if (!match) {
    throw new Error(`No v-text-field with label "${label}"`);
  }
  return match;
}

async function mountBar() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return mountWithPlugins(
    {
      components: { MenuBar },
      template: "<v-app><MenuBar /></v-app>",
    },
    {
      attachTo: host,
      router: await createTestRouter("/"),
    }
  );
}

async function openProfile(wrapper) {
  await wrapper.find('[aria-label="Open profile"]').trigger("click");
  await flushPromises();
}

describe("Feature 4 — User Profile Management", () => {
  let wrapper;
  let router;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Utils.setStore("user", sessionUser);
    UserServices.getUser.mockResolvedValue({ data: profile });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe("US-4.1 — View profile from the menu bar", () => {
    it("User opens the profile dropdown from the menu bar", async () => {
      ({ wrapper, router } = await mountBar());
      await openProfile(wrapper);

      expect(wrapper.text()).toContain("Jane Doe");
      expect(wrapper.text()).toContain("jdoe");
      expect(wrapper.text()).toContain("jane@example.com");
      expect(wrapper.text()).toContain("Edit Profile");
      expect(wrapper.text()).toContain("Log out");
    });
  });

  describe("US-4.2 — Edit profile", () => {
    it("User opens the edit profile dialog", async () => {
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Edit Profile");
      await flushPromises();

      expect(wrapper.text()).toContain("Edit Profile");
      expect(fieldByLabel(wrapper, "First name").props("modelValue")).toBe("Jane");
      expect(fieldByLabel(wrapper, "Last name").props("modelValue")).toBe("Doe");
      expect(fieldByLabel(wrapper, "Email").props("modelValue")).toBe("jane@example.com");
      expect(fieldByLabel(wrapper, "Username").props("modelValue")).toBe("jdoe");
    });

    it("User cancels the edit profile dialog", async () => {
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Edit Profile");
      await flushPromises();

      await fieldByLabel(wrapper, "First name").setValue("Janet");
      await clickExact(wrapper, "Cancel");
      await flushPromises();

      expect(UserServices.updateUser).not.toHaveBeenCalled();
      expect(Utils.getStore("user").fName).toBe("Jane");
    });

    it("User saves profile changes", async () => {
      const updated = {
        ...profile,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
      };
      UserServices.updateUser.mockResolvedValue({ data: updated });
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Edit Profile");
      await flushPromises();

      await fieldByLabel(wrapper, "First name").setValue("Janet");
      await fieldByLabel(wrapper, "Last name").setValue("Smith");
      await fieldByLabel(wrapper, "Email").setValue("janet@example.com");
      await fieldByLabel(wrapper, "Username").setValue("janet");
      await clickExact(wrapper, "Save");
      await flushPromises();

      expect(UserServices.updateUser).toHaveBeenCalled();
      expect(Utils.getStore("user")).toMatchObject({
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
      });

      await openProfile(wrapper);
      expect(wrapper.text()).toContain("Janet Smith");
      expect(wrapper.text()).toContain("janet");
      expect(wrapper.text()).toContain("janet@example.com");
    });

    it("User saves profile with invalid email format", async () => {
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Edit Profile");
      await flushPromises();

      await fieldByLabel(wrapper, "Email").setValue("notanemail");
      await clickExact(wrapper, "Save");
      await flushPromises();

      expect(wrapper.text()).toContain("Enter a valid email address.");
      expect(UserServices.updateUser).not.toHaveBeenCalled();
    });

    it("User saves profile with mismatched passwords", async () => {
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Edit Profile");
      await flushPromises();

      await fieldByLabel(wrapper, "New password").setValue("password123");
      await fieldByLabel(wrapper, "Confirm password").setValue("password456");
      await clickExact(wrapper, "Save");
      await flushPromises();

      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(UserServices.updateUser).not.toHaveBeenCalled();
    });

    it("User saves profile with a password that is too short", async () => {
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Edit Profile");
      await flushPromises();

      await fieldByLabel(wrapper, "New password").setValue("short");
      await fieldByLabel(wrapper, "Confirm password").setValue("short");
      await clickExact(wrapper, "Save");
      await flushPromises();

      expect(wrapper.text()).toContain("Password must be at least 8 characters.");
      expect(UserServices.updateUser).not.toHaveBeenCalled();
    });

    it("Profile update API returns an error", async () => {
      UserServices.updateUser.mockRejectedValue({
        response: { status: 400, data: { message: "Username is already taken." } },
      });
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Edit Profile");
      await flushPromises();
      await clickExact(wrapper, "Save");
      await flushPromises();

      expect(wrapper.find(".v-alert").exists()).toBe(true);
      expect(wrapper.text()).toContain("Username is already taken.");
      expect(wrapper.text()).toContain("Edit Profile");
    });
  });

  describe("US-4.3 — Log out from profile", () => {
    it("User logs out from the profile dropdown", async () => {
      AuthServices.logoutUser.mockResolvedValue({ data: { message: "Signed out successfully." } });
      ({ wrapper, router } = await mountBar());
      await openProfile(wrapper);
      await clickExact(wrapper, "Log out");
      await flushPromises();
      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe("login");
      });

      expect(AuthServices.logoutUser).toHaveBeenCalled();
      expect(localStorage.getItem("user")).toBeNull();
    });
  });

  describe("US-4.4 — Single logout entry point", () => {
    it("Menu bar does not show Sign out", async () => {
      ({ wrapper } = await mountBar());
      await openProfile(wrapper);

      expect(wrapper.text()).not.toContain("Sign out");
      expect(wrapper.text()).toContain("Log out");
    });
  });
});
