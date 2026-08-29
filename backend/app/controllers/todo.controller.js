import db from "../models/index.js";
import logger from "../config/logger.js";
import {
  getAccessibleListOrNull,
  getAccessibleTodoOrNull,
} from "../authorization/authorization.js";

const exports = {};

const parseId = (value) => {
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
};

const validateTitle = (raw) => {
  if (raw == null || String(raw).trim() === "") {
    return { error: "Todo title is required." };
  }
  const title = String(raw).trim();
  if (title.length > 255) {
    return { error: "Todo title must be 255 characters or fewer." };
  }
  return { title };
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const INVALID_DUE_DATE = "Due date must be a valid date in YYYY-MM-DD format.";

const isValidDateOnly = (value) => {
  if (!DATE_ONLY_REGEX.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const parseDueDate = (raw) => {
  if (raw === undefined) {
    return { omitted: true };
  }
  if (raw === null || raw === "") {
    return { dueDate: null };
  }
  const value = String(raw).trim();
  if (!isValidDateOnly(value)) {
    return { error: INVALID_DUE_DATE };
  }
  return { dueDate: value };
};

const notFoundList = (listId) => ({ message: `List with id=${listId} not found.` });
const notFoundTodo = (todoId) => ({ message: `Todo with id=${todoId} not found.` });

const todoOrder = [
  ["completed", "ASC"],
  ["createdAt", "ASC"],
];

exports.findAll = async (req, res) => {
  try {
    const listId = parseId(req.params.listId);
    if (listId == null) {
      return res.status(400).send({ message: "Invalid list id." });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send(notFoundList(listId));
    }

    const todos = await db.todo.findAll({
      where: { listId, userId: req.user.id },
      order: todoOrder,
    });
    return res.send(todos);
  } catch (err) {
    logger.error(`todo findAll failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const listId = parseId(req.params.listId);
    if (listId == null) {
      return res.status(400).send({ message: "Invalid list id." });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send(notFoundList(listId));
    }

    const { error, title } = validateTitle(req.body?.title);
    if (error) {
      return res.status(400).send({ message: error });
    }

    const due = parseDueDate(req.body?.dueDate);
    if (due.error) {
      return res.status(400).send({ message: due.error });
    }

    const todo = await db.todo.create({
      title,
      completed: false,
      dueDate: due.omitted ? null : due.dueDate,
      listId: list.id,
      userId: req.user.id,
    });
    return res.status(201).send(todo);
  } catch (err) {
    logger.error(`todo create failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const todoId = parseId(req.params.id);
    if (todoId == null) {
      return res.status(400).send({ message: "Invalid todo id." });
    }

    const todo = await getAccessibleTodoOrNull(req, todoId);
    if (!todo) {
      return res.status(404).send(notFoundTodo(todoId));
    }

    const updates = {};
    if (req.body?.title !== undefined) {
      const { error, title } = validateTitle(req.body.title);
      if (error) {
        return res.status(400).send({ message: error });
      }
      updates.title = title;
    }
    if (req.body?.completed !== undefined) {
      updates.completed = Boolean(req.body.completed);
    }
    if (req.body?.dueDate !== undefined) {
      const due = parseDueDate(req.body.dueDate);
      if (due.error) {
        return res.status(400).send({ message: due.error });
      }
      updates.dueDate = due.dueDate;
    }

    await todo.update(updates);
    return res.send(todo);
  } catch (err) {
    logger.error(`todo update failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const todoId = parseId(req.params.id);
    if (todoId == null) {
      return res.status(400).send({ message: "Invalid todo id." });
    }

    const todo = await getAccessibleTodoOrNull(req, todoId);
    if (!todo) {
      return res.status(404).send(notFoundTodo(todoId));
    }

    await todo.destroy();
    return res.status(200).send({ message: "Todo deleted." });
  } catch (err) {
    logger.error(`todo delete failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

export default exports;
