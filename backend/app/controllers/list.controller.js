import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull } from "../authorization/authorization.js";

const exports = {};

const parseListId = (value) => {
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
};

const validateName = (raw) => {
  if (raw == null || String(raw).trim() === "") {
    return { error: "List name is required." };
  }
  const name = String(raw).trim();
  if (name.length > 100) {
    return { error: "List name must be 100 characters or fewer." };
  }
  return { name };
};

exports.findAll = async (req, res) => {
  try {
    const lists = await db.list.findAll({
      where: { userId: req.user.id },
      order: [["name", "ASC"]],
    });
    return res.send(lists);
  } catch (err) {
    logger.error(`list findAll failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { error, name } = validateName(req.body?.name);
    if (error) {
      return res.status(400).send({ message: error });
    }

    const list = await db.list.create({
      name,
      userId: req.user.id,
    });
    return res.status(201).send(list);
  } catch (err) {
    logger.error(`list create failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const listId = parseListId(req.params.listId);
    if (listId == null) {
      return res.status(400).send({ message: "Invalid list id." });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    const { error, name } = validateName(req.body?.name);
    if (error) {
      return res.status(400).send({ message: error });
    }

    await list.update({ name });
    return res.send(list);
  } catch (err) {
    logger.error(`list update failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const listId = parseListId(req.params.listId);
    if (listId == null) {
      return res.status(400).send({ message: "Invalid list id." });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    await list.destroy();
    return res.status(200).send({ message: "List deleted." });
  } catch (err) {
    logger.error(`list delete failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

export default exports;
