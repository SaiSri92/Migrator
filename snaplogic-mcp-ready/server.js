import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { exportDependencySet } from "./src/exporter.js";

const server = new Server(
  { name: "snaplogic-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "download_pipeline",
    description: "Download SnapLogic pipeline and dependencies",
    inputSchema: {
      type: "object",
      properties: { pipelinePath: { type: "string" } },
      required: ["pipelinePath"]
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "download_pipeline") {
    throw new Error("Unknown tool");
  }

  const { pipelinePath } = req.params.arguments;
  const assets = new Set([pipelinePath]);

  const zipPath = await exportDependencySet(
    assets,
    pipelinePath.split("/").pop()
  );

  return {
    content: [{ type: "text", text: `Exported to ${zipPath}` }]
  };
});

await server.connect(new StdioServerTransport());
