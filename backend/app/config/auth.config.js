const authConfig = {
  secret: process.env.AUTH_SECRET || "todo-speckit-dev-secret",
  expiresIn: 86400,
  saltRounds: 10,
};

export default authConfig;
