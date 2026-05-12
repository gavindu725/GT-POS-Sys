import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_key";

export const verifyAdmin = (req, res, next) => {
  console.log(`🔐 verifyAdmin called for: ${req.method} ${req.originalUrl}`);
  const token = req.cookies.token;
  if (!token) {
    console.log("❌ No token found");
    return res.status(401).json({ Status: false, Error: "Not authenticated" });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("❌ Token verification failed:", err.message);
      return res.status(401).json({ Status: false, Error: "Token error" });
    }
    if (decoded.role !== "admin") {
      console.log("❌ Not admin role:", decoded.role);
      return res.status(403).json({ Status: false, Error: "Not authorized" });
    }
    console.log("✓ Auth successful for user:", decoded.email);
    req.user = decoded;
    req.email = decoded.email; // Set req.email for backward compatibility
    req.adminId = decoded.id; // Set admin ID if available
    next();
  });
};
