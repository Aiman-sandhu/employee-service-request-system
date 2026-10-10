const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token missing" });
  }
  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("JWT error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
