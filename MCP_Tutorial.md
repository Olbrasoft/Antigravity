# Návod: Vytvoření MCP Serveru pro Systémové Notifikace

Tento návod popisuje, jak vytvořit vlastní **Model Context Protocol (MCP)** server v Pythonu. 
Cílem serveru je poskytnout nástroj (tool), který umožní AI agentovi (Google Antigravity) posílat systémové notifikace v Linuxu (pomocí `notify-send`) namísto hlasového výstupu.

## 1. Příprava prostředí

Nejprve si připravíme adresář a virtuální prostředí pro Python.

```bash
# Vytvoření složky projektu
mkdir mcp-notifications
cd mcp-notifications

# Vytvoření virtuálního prostředí
python3 -m venv venv
source venv/bin/activate

# Instalace knihovny MCP
# "mcp" je oficiální Python SDK pro Model Context Protocol
pip install mcp
```

## 2. Kód serveru (`server.py`)

Vytvořte soubor `server.py`. Tento skript definuje MCP server a jeden nástroj `send_notification`.

```python
import asyncio
import subprocess
from mcp.server.fastmcp import FastMCP

# Vytvoření instance serveru
# FastMCP je zjednodušená obálka pro rychlý vývoj
mcp = FastMCP("Linux Notifications")

@mcp.tool()
def send_notification(title: str, message: str) -> str:
    """
    Odešle systémovou notifikaci v Linuxu pomocí notify-send.
    
    Args:
        title: Nadpis notifikace (např. "Úkol dokončen").
        message: Obsah zprávy.
    """
    try:
        # Spuštění příkazu notify-send
        subprocess.run(
            ["notify-send", title, message], 
            check=True,
            capture_output=True
        )
        return f"Notifikace odeslána: {title} - {message}"
    except FileNotFoundError:
        return "Chyba: Příkaz 'notify-send' nebyl nalezen. Ujisti se, že máš nainstalovaný balíček libnotify-bin."
    except Exception as e:
        return f"Chyba při odesílání notifikace: {str(e)}"

if __name__ == "__main__":
    # Spuštění serveru
    mcp.run()
```

## 3. Konfigurace Google Antigravity

Aby Antigravity o tomto serveru vědělo, musíte ho přidat do konfiguračního souboru MCP.
Tento soubor se obvykle nachází v nastavení projektu nebo v globálním nastavení editoru (např. `.vscode/mcp-servers.json` nebo v nastavení profilu).

Pokud používáte konfigurační JSON pro MCP, přidejte následující záznam:

```json
{
  "mcpServers": {
    "notifications": {
      "command": "/cesta/k/vasemu/projektu/venv/bin/python",
      "args": [
        "/cesta/k/vasemu/projektu/server.py"
      ]
    }
  }
}
```

**Důležité:**
*   Nahraďte `/cesta/k/vasemu/projektu/` skutečnou absolutní cestou, kde jste vytvořili `server.py` a `venv`.
*   Musíte použít python z virtuálního prostředí (venv), aby byly dostupné nainstalované knihovny.

## 4. Použití

1.  Restartujte Antigravity nebo obnovte MCP servery (často přes Command Palette "MCP: Restart Servers").
2.  Nyní můžete agenta požádat: *"Pošli mi notifikaci, až dokončíš tento úkol."*
3.  Agent uvidí nástroj `send_notification` a použije ho.

## 5. Poznámka pro Linux
Ujistěte se, že máte nainstalovaný nástroj `notify-send`. Na Debian/Ubuntu systémech:
```bash
sudo apt-get install libnotify-bin
```
