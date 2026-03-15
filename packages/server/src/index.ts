import { app } from "./express-app.js";
import { getEnv } from "./config/env.js";
import { startWellbeingReminderJob } from "./services/wellbeing-reminder.job.js";
import "./mcp-server.js"; // Initialise MCP server and register tools

const { PORT } = getEnv();

app.listen(PORT, () => {
  console.log(`[server] Age No Concern server running on port ${PORT}`);
  startWellbeingReminderJob();
});
