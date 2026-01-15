# Antigravity Notify MCP Server

Dedikovaný MCP server pro integraci notifikací z Antigravity IDE do Virtual Assistant. Odesílá notifikace se zdrojem (`source`) nastaveným na `antigravity`.

## 1. Instalace a Build

V tomto adresáři:

```bash
npm install
npm run build
```

Tím se vytvoří složka `dist` s přeloženým JavaScript kódem.

## 2. Konfigurace v Antigravity

Pro aktivaci serveru v Antigravity upravte konfigurační soubor MCP (obvykle `~/.gemini/antigravity/mcp_config.json` nebo přes nastavení IDE).

Přidejte následující záznam:

```json
{
  "mcpServers": {
    "antigravity-notify": {
      "command": "node",
      "args": ["/absolutni/cesta/k/Olbrasoft/Antigravity/mcp-notify-antigravity/dist/index.js"],
      "env": {
        "VA_ENDPOINT": "http://localhost:5055/api/notifications"
      }
    }
  }
}
```

> **Poznámka:** Ujistěte se, že cesta v `args` odpovídá skutečnému umístění repozitáře na vašem disku.

## 3. Použití

Agent v Antigravity bude mít k dispozici nástroj `notify`.

**Příklad promptu:**
"Upozorni mě, až dokončíš analýzu kódu."

**Volání nástroje (automatické):**
```json
{
  "name": "notify",
  "arguments": {
    "text": "Analýza kódu dokončena."
  }
}
```
