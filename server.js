import express from "express";

import app from "./server/app.js";

// Vercel's Express detector expects the root entrypoint to import express directly.
void express;

export default app;
