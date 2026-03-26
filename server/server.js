/**
 * server.js - AuraBoard Entry Point
 * Loads env variables, imports Express app, starts HTTP server.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const dotenv = require("dotenv");
dotenv.config();
const app = require("./app");
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`AuraBoard server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
