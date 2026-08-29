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

vi.mock("../src/services/userServices.js", () => ({
  default: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
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

      const host = document.createElement("div");
      document.body.appendChild(host);
      const { wrapper, router } = await mountWithPlugins(
        {
          components: { MenuBar },
          template: "<v-app><MenuBar /></v-app>",
        },
        {
          attachTo: host,
          router: await createTestRouter("/"),
        }
      );

      await wrapper.find('[aria-label="Open profile"]').trigger("click");
      await flushPromises();
      expect(wrapper.text()).toContain("Jane");
      const logOut = wrapper.findAll("button").find((btn) => btn.text().trim() === "Log out");
      await logOut.trigger("click");
      await flushPromises();
      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe("login");
      });

      expect(AuthServices.logoutUser).toHaveBeenCalled();
      expect(localStorage.getItem("user")).toBeNull();
      wrapper.unmount();
    });
  });
});
