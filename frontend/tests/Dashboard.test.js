/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import ListServices from "../src/services/listServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
}));

const groceries = { id: 1, name: "Groceries", userId: 10 };
const work = { id: 2, name: "Work", userId: 10 };
const personal = { id: 3, name: "Personal", userId: 10 };

function clickByText(wrapper, text) {
  const match = wrapper.findAll("button").find((btn) => btn.text().includes(text));
  if (!match) {
    throw new Error(`No button containing "${text}"`);
  }
  return match.trigger("click");
}

function rowFor(wrapper, name) {
  return wrapper.findAll(".v-list-item").find((item) => item.text().includes(name));
}

describe("Feature 2 — Todo List Management", () => {
  let wrapper;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    ListServices.getLists.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      ListServices.createList.mockResolvedValue({ data: groceries });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await clickByText(wrapper, "+ New List");
      await flushPromises();

      const field = wrapper.findAllComponents({ name: "VTextField" })[0];
      await field.setValue("Groceries");
      await clickByText(wrapper, "Create");
      await flushPromises();

      expect(ListServices.createList).toHaveBeenCalledWith({ name: "Groceries" });
      expect(wrapper.text()).toContain("Groceries");
    });

    it("User creates a list with an empty name", async () => {
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await clickByText(wrapper, "+ New List");
      await flushPromises();
      await clickByText(wrapper, "Create");
      await flushPromises();

      expect(wrapper.text()).toContain("List name is required.");
      expect(ListServices.createList).not.toHaveBeenCalled();
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      ListServices.getLists.mockResolvedValue({ data: [personal, work] });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      expect(wrapper.text()).toContain("Work");
      expect(wrapper.text()).toContain("Personal");
      expect(rowFor(wrapper, "Work").find('[aria-label="Edit list"]').exists()).toBe(true);
      expect(rowFor(wrapper, "Work").find('[aria-label="Delete list"]').exists()).toBe(true);
    });

    it("User has no lists", async () => {
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
    });
  });

  describe("US-2.3 — Manage list rows", () => {
    it("List rows show edit and delete actions", async () => {
      ListServices.getLists.mockResolvedValue({ data: [groceries] });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      const row = rowFor(wrapper, "Groceries");
      expect(row.find('[aria-label="Edit list"]').exists()).toBe(true);
      expect(row.find('[aria-label="Delete list"]').exists()).toBe(true);
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      ListServices.getLists.mockResolvedValue({ data: [groceries] });
      ListServices.updateList.mockResolvedValue({
        data: { ...groceries, name: "Shopping" },
      });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await rowFor(wrapper, "Groceries").find('[aria-label="Edit list"]').trigger("click");
      await flushPromises();

      const field = wrapper.findAllComponents({ name: "VTextField" }).at(-1);
      await field.setValue("Shopping");
      await clickByText(wrapper, "Save");
      await flushPromises();

      expect(ListServices.updateList).toHaveBeenCalledWith(1, { name: "Shopping" });
      expect(wrapper.text()).toContain("Shopping");
      expect(wrapper.text()).not.toContain("Groceries");
    });

    it("User deletes a list", async () => {
      ListServices.getLists.mockResolvedValue({ data: [groceries] });
      ListServices.deleteList.mockResolvedValue({ data: { message: "List deleted." } });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await rowFor(wrapper, "Groceries").find('[aria-label="Delete list"]').trigger("click");
      await flushPromises();
      await clickByText(wrapper, "Delete");
      await flushPromises();

      expect(ListServices.deleteList).toHaveBeenCalledWith(1);
      expect(rowFor(wrapper, "Groceries")).toBeUndefined();
      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
    });
  });
});
