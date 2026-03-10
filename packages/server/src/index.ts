import { app } from "./express-app.js";
import { getEnv } from "./config/env.js";
// MCP server import added after tool stubs are created
// import "./mcp-server.js";

const { PORT } = getEnv();

app.listen(PORT, () => {
  console.log(`[server] Age No Concern server running on port ${PORT}`);
});
