/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MenuBar from "../src/components/MenuBar.vue";
import AuthServices from "../src/services/authServices.js";
import Utils from "../src/config/utils.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("US-1.4 — Sign out", () => {
    it("User signs out", async () => {
      Utils.setStore("user", { fName: "Jane", lName: "Doe", token: "jwt-token" });
      AuthServices.logoutUser.mockResolvedValue({ data: { message: "Signed out successfully." } });

      const { wrapper, router } = await mountWithPlugins(
        {
          components: { MenuBar },
          template: "<v-app><MenuBar /></v-app>",
        },
        {
          router: await createTestRouter("/"),
        }
      );

      expect(wrapper.text()).toContain("Jane");
      await wrapper.get("button").trigger("click");
      await flushPromises();

      expect(AuthServices.logoutUser).toHaveBeenCalled();
      expect(localStorage.getItem("user")).toBeNull();
      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});
