import db from "../models/index.js";
import logger from "../config/logger.js";

const { session: Session, user: User, list: List, todo: Todo } = db;

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).send({ message: "Unauthorized! No token provided." });
    }

    const session = await Session.findOne({
      where: { token },
      include: [{ model: User, as: "user" }],
    });

    if (!session || !session.user || session.expirationDate < new Date()) {
      return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
    }

    req.user = { id: session.user.id, role: session.user.role };
    return next();
  } catch (err) {
    logger.error(`authenticate failed: ${err.message}`);
    return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
  }
};

export const getAccessibleListOrNull = async (req, listId) => {
  const row = await List.findOne({ where: { id: listId, userId: req.user.id } });
  return row ?? null;
};

export const getAccessibleTodoOrNull = async (req, todoId) => {
  const row = await Todo.findOne({ where: { id: todoId, userId: req.user.id } });
  return row ?? null;
};

export const getAccessibleUserOrNull = async (req, userId) => {
  if (userId !== req.user.id) {
    return null;
  }
  return (await User.findByPk(userId)) ?? null;
};
