#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Vytvoření serveru
const server = new McpServer({
  name: 'antigravity-notify',
  version: '1.0.0'
});

// Registrace nástroje
server.tool(
  'notify',
  {
    text: z.string().describe('Notification text in Czech language (1-3 sentences)'),
    issueIds: z.array(z.number()).optional().describe('Optional GitHub issue IDs')
  },
  async ({ text, issueIds }) => {
    try {
      const endpoint = process.env.VA_ENDPOINT || 'http://localhost:5055/api/notifications';
      
      const body = {
          text,
          source: 'antigravity',
          issueIds: issueIds || [],
          // LLM tracking - Antigravity uses Gemini Flash
          providerName: 'google',
          modelName: 'gemini-2.0-flash-001'
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as { id: number };
      return {
        content: [{ 
            type: 'text', 
            text: `Notifikace odeslána: "${text}" (ID: ${data.id})` 
        }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ 
            type: 'text', 
            text: `Chyba při odesílání notifikace: ${error.message}` 
        }]
      };
    }
  }
);

// Spuštění
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
