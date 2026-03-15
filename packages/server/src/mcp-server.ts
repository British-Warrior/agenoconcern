import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";

export const mcpServer = new McpServer({
  name: "indomitable-unity",
  version: "0.1.0",
});

registerAllTools(mcpServer);
