/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import ListServices from "../src/services/listServices.js";
import TodoServices from "../src/services/todoServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
}));

vi.mock("../src/services/todoServices.js", () => ({
  default: {
    getTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
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

function clickExact(wrapper, text) {
  const match = wrapper.findAll("button").find((btn) => btn.text().trim() === text);
  if (!match) {
    throw new Error(`No button with exact text "${text}"`);
  }
  return match.trigger("click");
}

function rowFor(wrapper, name) {
  return wrapper.findAll(".list-row").find((item) => item.text().includes(name));
}

function todoRow(wrapper, title) {
  return wrapper.findAll(".todo-row").find((item) => item.text().includes(title));
}

async function openItems(wrapper, name) {
  await rowFor(wrapper, name).find(`[aria-label="View items for ${name}"]`).trigger("click");
  await flushPromises();
}

describe("Feature 2 — Todo List Management", () => {
  let wrapper;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    ListServices.getLists.mockResolvedValue({ data: [] });
    TodoServices.getTodos.mockResolvedValue({ data: [] });
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

describe("Feature 3 — Todo List Item Management", () => {
  let wrapper;
  const milk = {
    id: 10,
    listId: 1,
    title: "Buy milk",
    completed: false,
    userId: 10,
    createdAt: "2026-07-02T12:00:00.000Z",
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    ListServices.getLists.mockResolvedValue({ data: [groceries] });
    TodoServices.getTodos.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      TodoServices.createTodo.mockResolvedValue({ data: milk });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Groceries");
      await clickByText(wrapper, "+ Add Item");
      await flushPromises();

      const field = wrapper.findAllComponents({ name: "VTextField" }).find(
        (item) => item.props("label") === "Todo title"
      );
      await field.setValue("Buy milk");
      await clickExact(wrapper, "Add");
      await flushPromises();

      expect(TodoServices.createTodo).toHaveBeenCalledWith(1, { title: "Buy milk" });
      expect(wrapper.text()).toContain("Buy milk");
    });

    it("User adds a todo with an empty title", async () => {
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Groceries");
      await clickByText(wrapper, "+ Add Item");
      await flushPromises();
      await clickExact(wrapper, "Add");
      await flushPromises();

      expect(wrapper.text()).toContain("Todo title is required.");
      expect(TodoServices.createTodo).not.toHaveBeenCalled();
    });

    it("Add item is only available inside the items dialog", async () => {
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      expect(wrapper.text()).toContain("+ New List");
      expect(wrapper.find(".v-list").text()).not.toContain("+ Add Item");
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("List items dialog shows empty state", async () => {
      ListServices.getLists.mockResolvedValue({ data: [personal] });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Personal");

      expect(wrapper.text()).toContain("No todos in this list yet.");
    });

    it("User opens items for different lists", async () => {
      ListServices.getLists.mockResolvedValue({ data: [work, personal] });
      TodoServices.getTodos.mockImplementation((listId) => {
        if (listId === 2) {
          return Promise.resolve({
            data: [
              { id: 21, listId: 2, title: "Email client", completed: false },
              { id: 22, listId: 2, title: "Write report", completed: false },
            ],
          });
        }
        if (listId === 3) {
          return Promise.resolve({
            data: [{ id: 31, listId: 3, title: "Call mom", completed: false }],
          });
        }
        return Promise.resolve({ data: [] });
      });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Personal");
      expect(wrapper.text()).toContain("Call mom");
      expect(wrapper.text()).not.toContain("Email client");

      await clickExact(wrapper, "Close");
      await flushPromises();
      await openItems(wrapper, "Work");

      expect(wrapper.text()).toContain("Email client");
      expect(wrapper.text()).toContain("Write report");
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      TodoServices.getTodos.mockResolvedValue({ data: [milk] });
      TodoServices.updateTodo.mockResolvedValue({ data: { ...milk, completed: true } });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Groceries");
      await todoRow(wrapper, "Buy milk").find('input[type="checkbox"]').setValue(true);
      await flushPromises();

      expect(TodoServices.updateTodo).toHaveBeenCalledWith(10, { completed: true });
      expect(todoRow(wrapper, "Buy milk").html()).toContain("text-decoration-line-through");
    });

    it("User marks a completed todo as incomplete", async () => {
      const done = { ...milk, completed: true };
      TodoServices.getTodos.mockResolvedValue({ data: [done] });
      TodoServices.updateTodo.mockResolvedValue({ data: { ...done, completed: false } });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Groceries");
      await todoRow(wrapper, "Buy milk").find('input[type="checkbox"]').setValue(false);
      await flushPromises();

      expect(TodoServices.updateTodo).toHaveBeenCalledWith(10, { completed: false });
      expect(todoRow(wrapper, "Buy milk").html()).not.toContain("text-decoration-line-through");
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      TodoServices.getTodos.mockResolvedValue({ data: [milk] });
      TodoServices.updateTodo.mockResolvedValue({
        data: { ...milk, title: "Buy oat milk" },
      });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Groceries");
      await todoRow(wrapper, "Buy milk").find('[aria-label="Edit todo"]').trigger("click");
      await flushPromises();

      const field = wrapper.findAllComponents({ name: "VTextField" }).find(
        (item) => item.props("label") === "Todo title"
      );
      await field.setValue("Buy oat milk");
      await clickExact(wrapper, "Save");
      await flushPromises();

      expect(TodoServices.updateTodo).toHaveBeenCalledWith(10, { title: "Buy oat milk" });
      expect(wrapper.text()).toContain("Buy oat milk");
    });

    it("User deletes a todo", async () => {
      TodoServices.getTodos.mockResolvedValue({ data: [milk] });
      TodoServices.deleteTodo.mockResolvedValue({ data: { message: "Todo deleted." } });
      ({ wrapper } = await mountWithPlugins(Dashboard, { attachTo: document.body }));
      await flushPromises();

      await openItems(wrapper, "Groceries");
      await todoRow(wrapper, "Buy milk").find('[aria-label="Delete todo"]').trigger("click");
      await flushPromises();
      await clickExact(wrapper, "Delete");
      await flushPromises();

      expect(TodoServices.deleteTodo).toHaveBeenCalledWith(10);
      expect(todoRow(wrapper, "Buy milk")).toBeUndefined();
    });
  });
});
