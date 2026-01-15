# Antigravity: Notifikace do Virtual Assistant

**Stav:** 📝 Návrh dokončen  
**Datum:** 2026-01-14 (Aktualizováno)  
**Účel:** Integrace notifikací z Google Antigravity do Virtual Assistant

---

## 1. Přehled

Antigravity je **Google DeepMind VS Code fork** s integrovaným AI asistentem (model Gemini). Cílem je dosáhnout stejné funkcionality jako u Claude Code, OpenCode a Gemini CLI - automatické hlasové notifikace při práci.

**Aktualizace 2026-01-14:** Byla provedena analýza a zvoleno řešení pomocí **MCP Serveru**.

---

## 2. Konfigurační soubory AI nástrojů

### Přehled konfiguračních souborů

| Nástroj | Konfigurační soubor | Umístění |
|---------|---------------------|----------|
| **Claude Code** | `CLAUDE.md` | V kořeni projektu nebo `~/.claude/CLAUDE.md` |
| **OpenCode** | `AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| **Gemini CLI** | `GEMINI.md` | `~/.gemini/GEMINI.md` |
| **Antigravity** | `AGENTS.md` | V kořeni projektu (čte stejně jako Claude Code) |

### Klíčové zjištění pro Antigravity

Antigravity **čte `AGENTS.md`** (nikoliv `GEMINI.md`), podobně jako Codex CLI a další AI coding nástroje. Podporuje **Model Context Protocol (MCP)**, což je preferovaná cesta integrace.

---

## 3. Současné implementace notifikací

### 3.1 Claude Code

**Mechanismus:** Custom slash command `/notify`
**Soubor:** `/home/jirka/Olbrasoft/ClaudeCode/plugins/notify-plugin/commands/notify.md`
**Jak to funguje:** AI používá `curl` k volání REST API Virtual Assistant na základě instrukcí v `CLAUDE.md`.

### 3.2 OpenCode

**Mechanismus:** JavaScript plugin s nástrojem `notify`
**Soubor:** `/home/jirka/.config/opencode/plugin/notify.js`
**Jak to funguje:** Plugin registruje JS funkci jako nástroj, který AI volá na základě instrukcí v `AGENTS.md`.

### 3.3 Gemini CLI

**Mechanismus:** Nástroj `notify` + instrukce v `GEMINI.md`
**Soubor:** `/home/jirka/.gemini/GEMINI.md`
**Jak to funguje:** Native nástroj CLI agenta + striktní instrukce.

---

## 4. Antigravity: Možnosti implementace

### 4.1 Přehled Antigravity

| Feature | Podpora |
|---------|---------|
| **MCP (Model Context Protocol)** | ✅ Ano - Plná podpora |
| **Custom MCP servery** | ✅ Ano - `mcp_config.json` |
| **Konfigurační soubor** | `AGENTS.md` v kořeni projektu |
| **Konfigurace MCP** | `~/.gemini/antigravity/mcp_config.json` |

### 4.2 Technologie pro MCP servery

MCP server je samostatný proces, se kterým Antigravity komunikuje přes standardní vstup/výstup (stdio). Protokol je postaven na JSON-RPC, což znamená, že je **jazykově nezávislý**. Lze jej implementovat v:

1.  **JavaScript / TypeScript (Node.js):** Nejvíce podporované díky oficiálnímu SDK. Antigravity jej spouští přes `node`.
2.  **Python:** Plná podpora s oficiálním SDK. Antigravity jej spouští přes `python`.
3.  **Libovolný jazyk (C#, Rust, Go, atd.):** Pokud jazyk umí pracovat se standardním I/O a JSON, může fungovat jako MCP server.

Pro naši implementaci je v sekci 11 navržen **čistý JavaScript (Node.js)** pro maximální jednoduchost a snadnou údržbu bez nutnosti build procesů.

### 4.3 Varianta A: MCP Server (DOPORUČENO)

Vytvořit vlastní MCP server pro Virtual Assistant notifikace.

**Výhody:**
- Nativní integrace s Antigravity ("agent-first" design).
- Bezpečnější a robustnější než volání shell příkazů (curl).
- Znovupoužitelnost pro jiné MCP-kompatibilní editory (Cursor, Windsurf).

### 4.3 Varianta B: Instrukce v AGENTS.md + curl

Podobně jako Claude Code - instrukce v `AGENTS.md` s použitím `curl`.
*Zamítnuto pro Antigravity ve prospěch robustnějšího MCP řešení.*

---

## 11. Finální návrh implementace (Aktualizováno 2026-01-14)

Na základě analýzy dostupných technologií (Node.js v20+, podpora MCP v Antigravity) byl schválen následující implementační plán.

### 11.1 Architektura

*   **Typ:** MCP Server (Node.js)
*   **Název:** `virtual-assistant-mcp`
*   **Umístění:** `~/.mcp/virtual-assistant-mcp/`
*   **Endpoint VA:** `http://localhost:5055/api/notifications`

### 11.2 Struktura souborů

#### `~/.mcp/virtual-assistant-mcp/package.json`
Jednoduchý ESM modul se závislostí na oficiálním SDK.

```json
{
  "name": "virtual-assistant-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  }
}
```

#### `~/.mcp/virtual-assistant-mcp/index.js`
Server vystavující nástroj `notify`.

```javascript
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Vytvoření serveru
const server = new McpServer({
  name: 'virtual-assistant-notify',
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
    } catch (error) {
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
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 11.3 Konfigurace Antigravity

Soubor: `~/.gemini/antigravity/mcp_config.json`
*Analýza 2026-01-14: Soubor aktuálně existuje, ale je prázdný.*

```json
{
  "mcpServers": {
    "virtual-assistant": {
      "command": "node",
      "args": ["/home/jirka/.mcp/virtual-assistant-mcp/index.js"],
      "env": {
        "VA_ENDPOINT": "http://localhost:5055/api/notifications"
      }
    }
  }
}
```

### 11.4 Instrukce pro Agenta (AGENTS.md)

Pro zajištění konzistence s OpenCode a Claude Code by měl soubor `AGENTS.md` v kořeni projektu (nebo globální konfiguraci) obsahovat následující sekci:

```markdown
## Voice Notifications (MANDATORY)

> [!IMPORTANT]
> **VŽDY používej nástroj `notify` pro hlasová oznámení!**
> Bez notifikací uživatel neví, co se děje.

**Pravidla:**
- **Jazyk:** Čeština
- **Styl:** Stručný, profesionální (mužský rod), výsledkově orientovaný
- **Časování:**
  - **Start:** Při zahájení úkolu (včetně `issueIds`, pokud existují)
  - **Konec:** Po dokončení úkolu se shrnutím výsledku

**Příklady:**
- Start: "Začínám pracovat na analýze MCP serveru. Projdu dokumentaci a navrhnu řešení."
- End: "Analýza je hotová. Návrh MCP serveru jsem zapsal do dokumentu."
```

### 11.5 Změna strategie: Dedikovaný Antigravity Server (2026-01-14)



Ačkoliv existuje `mcp-notify-gemini`, pro Antigravity vytvoříme **zcela nový, dedikovaný MCP server**.



**Důvody:**

1.  **Unikátní identita:** Server bude posílat `source: "antigravity"`.

2.  **Hlasové rozlišení:** Virtual Assistant díky odlišnému `source` může přiřadit jiný hlas (např. odlišit "Gemini CLI" vs. "Antigravity IDE").

3.  **Konzistence:** Server bude napsán v **TypeScriptu**, aby držel standard s ostatními Olbrasoft MCP servery.



### 11.6 Proces vývoje: GitHub Repository (Aktualizace 2026-01-14)







Vývoj bude probíhat v rámci širšího repozitáře věnovaného tomuto IDE.







1.  **Repozitář:** `Olbrasoft/antigravity`



2.  **Lokální cesta:** `/home/jirka/Olbrasoft/antigravity`



3.  **Projekt:** `mcp-notify-antigravity` (bude součástí repozitáře)







---







## 12. Aktualizované TODO







- [x] Analyzovat možnosti Antigravity.



- [x] Rozhodnout o architektuře (Dedikovaný TS server).



- [ ] **Vytvořit GitHub repozitář `Olbrasoft/antigravity`.**



- [ ] Naklonovat do `/home/jirka/Olbrasoft/`.



- [ ] Inicializovat v něm projekt `mcp-notify-antigravity` (TypeScript).



- [ ] Implementovat logiku (`source: "antigravity"`).







- [ ] Zkompilovat a otestovat.



- [ ] Nasadit do konfigurace Antigravity.







---



## 13. Záznam analýzy a komunikace



### 2026-01-14: Finální rozhodnutí o architektuře

- **Rozhodnutí:** Zamítnuto sdílení serveru s Gemini CLI.

- **Nový směr:** Bude vyvinut samostatný `mcp-notify-antigravity` v TypeScriptu.

- **Umístění:** `/home/jirka/apps/mcp-notify-antigravity/`.

- **Funkcionalita:** Identická s Gemini verzí, ale s pevným `source: "antigravity"` pro možnost konfigurace unikátního hlasu na straně Virtual Assistanta.


