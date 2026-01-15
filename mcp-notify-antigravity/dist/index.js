#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
// Vytvoření serveru
const server = new mcp_js_1.McpServer({
    name: 'antigravity-notify',
    version: '1.0.0'
});
// Registrace nástroje
server.tool('notify', {
    text: zod_1.z.string().describe('Notification text in Czech language (1-3 sentences)'),
    issueIds: zod_1.z.array(zod_1.z.number()).optional().describe('Optional GitHub issue IDs')
}, async ({ text, issueIds }) => {
    try {
        const endpoint = process.env.VA_ENDPOINT || 'http://localhost:5055/api/notifications';
        const body = {
            text,
            source: 'antigravity',
            issueIds: issueIds || []
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return {
            content: [{
                    type: 'text',
                    text: `Notifikace odeslána: "${text}" (ID: ${data.id})`
                }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{
                    type: 'text',
                    text: `Chyba při odesílání notifikace: ${error.message}`
                }]
        };
    }
});
// Spuštění
async function run() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
