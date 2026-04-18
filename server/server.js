/**
 * server.js - VocalIQ Entry Point
 * Loads env variables, imports Express app, starts HTTP server.
 * Author: Angaddeep Singh Gupta | CS651 VocalIQ
 */
const dotenv = require("dotenv");
const path   = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });
const app = require("./app");
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`VocalIQ server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
