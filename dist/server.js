"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const company_1 = __importDefault(require("./routes/company"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const esg_1 = __importDefault(require("./routes/esg"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "EcoTrack India API is running" });
});
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/company", company_1.default);
app.use("/api/metrics", metrics_1.default);
app.use("/api/esg", esg_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
// Start server
const startServer = async () => {
  try {
    // Connect to database
    await (0, database_1.connectDatabase)();
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
startServer();
exports.default = app;
