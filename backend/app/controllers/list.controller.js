import db from "../models/index.js";
import logger from "../config/logger.js";

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const lists = await db.list.findAll({
      where: { userId: req.user.id },
    });
    return res.send(lists);
  } catch (err) {
    logger.error(`list findAll failed: ${err.message}`);
    return res.status(500).send({ message: err.message });
  }
};

export default exports;
