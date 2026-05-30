const roleMiddleware = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user.role;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Role authorization failed",
        error: error.message,
      });
    }
  };
};

module.exports = roleMiddleware;
