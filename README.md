# Interswitch MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI assistants to interact with Interswitch APIs for payments, transfers, VAS, cardless paycodes, Transaction Search, Card 360, lending, payouts, agency banking, and fintech card-processing utilities.

> [!WARNING]
> **Public Preview:** This MCP server is currently in public preview. It supports both Interswitch sandbox and production environments, so use cautiously, start with read-only mode, and report any issues you encounter.

## Quick Start

Install and run via npm (recommended):

```bash
npx interswitch-mcp-server
```

Or install globally:

```bash
npm install -g interswitch-mcp-server
interswitch-mcp-server
```

Or for local development, clone and build:

```bash
git clone https://github.com/Dairus01/Interswitch-mcp-server.git
cd Interswitch-mcp-server
npm install
npm run build
```

Then configure your MCP client to use the server (see [Client Integration](#client-integration)).

## Requirements

- Node.js v18+
- npm or yarn
- Interswitch API credentials for the domains you want to use
- Required Interswitch merchant, payable, initiating entity, terminal, or domain-specific identifiers for your use case

## Configuration Options

| Environment Variable | Purpose |
| -------------------- | ------- |
| `INTERSWITCH_CLIENT_ID` | Core OAuth2 client ID for payments, transfers, VAS, cardless, lending, transfer service, and payouts |
| `INTERSWITCH_CLIENT_SECRET` | Core OAuth2 client secret |
| `INTERSWITCH_ENV` | API environment: `sandbox` or `production`; defaults to `sandbox` |
| `INTERSWITCH_READ_ONLY` | Set `true` to block write tools before any API call; defaults to `false` |
| `INTERSWITCH_REQUIRE_CONFIRMATION` | Compatibility setting. Tool confirmation is enforced by tool mode and risk. |
| `INTERSWITCH_MERCHANT_CODE` | Merchant code for payment operations that require it |
| `INTERSWITCH_PAYABLE_CODE` | Payable code for payment operations that require it |
| `INTERSWITCH_INITIATING_ENTITY_CODE` | Initiating entity code for transfer operations |
| `INTERSWITCH_TERMINAL_ID` | Terminal ID for operations that require terminal identification |
| `CARD360_CLIENT_ID` | Separate Card 360 client ID |
| `CARD360_CLIENT_SECRET` | Separate Card 360 client secret |
| `CARD360_RSA_PUBLIC_KEY` | RSA public key used to encrypt Card 360 PIN payloads locally |
| `TRANSACTION_SEARCH_CLIENT_ID` | Separate Transaction Search client ID |
| `TRANSACTION_SEARCH_CLIENT_SECRET` | Separate Transaction Search client secret |
| `INTERSWITCH_AGENCY_MERCHANT_ID` | Agency Banking merchant identifier |
| `INTERSWITCH_AGENCY_TERMINAL_ID` | Agency Banking terminal identifier |
| `INTERSWITCH_LEGACY_AUTH_ENABLED` | Enables legacy InterswitchAuth-backed flows where supported |
| `DEBUG` | Enables debug logging. Avoid using this in production. |

You can select the API environment with `INTERSWITCH_ENV`:

1. **Sandbox (default):** `INTERSWITCH_ENV=sandbox`
2. **Production:** `INTERSWITCH_ENV=production`

> **Security note:** Production mode uses real Interswitch production endpoints. If `INTERSWITCH_ENV=production`, valid production credentials are configured, `INTERSWITCH_READ_ONLY=false`, and a write tool is called with `confirm: true`, the server can make real production API calls.

For safer first-time setup, start in read-only mode:

```bash
INTERSWITCH_ENV=production \
INTERSWITCH_READ_ONLY=true \
INTERSWITCH_CLIENT_ID=your_production_client_id \
INTERSWITCH_CLIENT_SECRET=your_production_client_secret \
interswitch-mcp-server
```

When you are authorized and ready to allow live writes, set:

```bash
INTERSWITCH_READ_ONLY=false
```

## Client Integration

The Interswitch MCP Server works with any MCP-compatible client. Below is the standard configuration schema used by most clients (Claude Desktop, ChatGPT Desktop, Cursor, Windsurf, VS Code, Claude Code, etc.).

### Using npm (recommended)

For npm-installed server:

```json
{
  "mcpServers": {
    "interswitch": {
      "command": "npx",
      "args": ["-y", "interswitch-mcp-server"],
      "env": {
        "INTERSWITCH_ENV": "sandbox",
        "INTERSWITCH_READ_ONLY": "true",
        "INTERSWITCH_CLIENT_ID": "your_client_id",
        "INTERSWITCH_CLIENT_SECRET": "your_client_secret",
        "INTERSWITCH_MERCHANT_CODE": "your_merchant_code",
        "INTERSWITCH_PAYABLE_CODE": "your_payable_code",
        "INTERSWITCH_INITIATING_ENTITY_CODE": "your_entity_code"
      }
    }
  }
}
```

For production, change the environment values intentionally:

```json
{
  "mcpServers": {
    "interswitch": {
      "command": "npx",
      "args": ["-y", "interswitch-mcp-server"],
      "env": {
        "INTERSWITCH_ENV": "production",
        "INTERSWITCH_READ_ONLY": "true",
        "INTERSWITCH_CLIENT_ID": "your_production_client_id",
        "INTERSWITCH_CLIENT_SECRET": "your_production_client_secret",
        "INTERSWITCH_MERCHANT_CODE": "your_production_merchant_code",
        "INTERSWITCH_PAYABLE_CODE": "your_production_payable_code",
        "INTERSWITCH_INITIATING_ENTITY_CODE": "your_production_entity_code"
      }
    }
  }
}
```

### Using a local build

If you've cloned and built the server locally:

```json
{
  "mcpServers": {
    "interswitch": {
      "command": "node",
      "args": ["/path/to/Interswitch-mcp-server/dist/index.js"],
      "env": {
        "INTERSWITCH_ENV": "sandbox",
        "INTERSWITCH_READ_ONLY": "true",
        "INTERSWITCH_CLIENT_ID": "your_client_id",
        "INTERSWITCH_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

> [!IMPORTANT]
> When setting `command: "node"`, you should ensure you're using Node v18+. If you are using a package manager, you might need to get the path of your Node binary by running this command in your CLI:
>
> ### Linux and MacOS
>
> ```sh
> which node
> ```
>
> ### Windows
>
> ```sh
> where node
> ```
>
> Once you have the path, use it as the value of the MCP Server command in the JSON configuration. e.g., `command: "path/to/installation/bin/node"`

### Where to add this configuration

| Client | Config file location |
| ------ | -------------------- |
| VS Code | `.vscode/mcp.json` |
| Claude Desktop | `claude_desktop_config.json` |
| ChatGPT Desktop | MCP settings in app preferences |
| Cursor | `.cursor/mcp.json` or global MCP settings |
| Windsurf | MCP configuration in settings |
| Claude Code | `~/.claude/mcp.json` or project-level `.mcp.json` |

## How It Works

The Interswitch MCP Server exposes Interswitch API domains to AI assistants through dedicated MCP tools. The server does not parse an OpenAPI file at runtime; instead, it provides curated, typed tools for the supported Interswitch domains.

Each tool:

1. Validates its input with a strict schema
2. Applies confirmation and read-only safety gates
3. Selects the configured sandbox or production base URL
4. Uses the correct authentication system for the domain
5. Calls the Interswitch API only when the tool is invoked
6. Redacts sensitive fields from returned data
7. Returns a normalized MCP response

### Authentication systems

| Auth system | Used for |
| ----------- | -------- |
| OAuth2 Passport | Core payments, transfers, VAS, cardless, lending, transfer service, and payouts |
| Card 360 token manager | Card 360 operations |
| Transaction Search token manager | Transaction Search APIs |
| Legacy InterswitchAuth | Legacy signed request flows where enabled |
| Agency Banking token manager | Agency Banking SOAP/XML token flow |

### Available Tools

| Tool | Description |
| ---- | ----------- |
| `isw_initialize_payment` | Initialize a payment request |
| `isw_get_transaction_status` | Check transaction status |
| `isw_get_transaction_by_reference` | Fetch transaction by reference |
| `isw_create_payment_link` | Create a payment link |
| `isw_initiate_refund` | Initiate a refund; high-risk write |
| `isw_get_refund_status` | Check refund status |
| `isw_pay_bill` | Pay a bill |
| `isw_get_billers` | List billers |
| `isw_get_biller_packages` | List packages for a biller |
| `isw_get_billers_by_category` | List billers by category |
| `isw_get_biller_details` | Fetch biller details |
| `isw_validate_customer` | Validate a biller customer |
| `isw_pay_vas_bill` | Pay a VAS bill |
| `isw_airtime_recharge` | Recharge airtime |
| `isw_get_airtime_epins` | Request airtime ePINs |
| `isw_single_transfer` | Send a single bank transfer; high-risk write |
| `isw_bulk_transfer` | Send bulk transfers; high-risk write; max 100 transactions |
| `isw_resolve_bank_account` | Resolve bank account details |
| `isw_get_bank_codes` | List supported bank codes |
| `isw_agency_banking_cashout` | Initiate agency cashout; high-risk write |
| `isw_create_paycode` | Create a cardless paycode |
| `isw_create_bulk_paycodes` | Create bulk paycodes; high-risk write; max 100 paycodes |
| `isw_get_paycode_status` | Check paycode status |
| `isw_deactivate_paycode` | Deactivate a paycode |
| `isw_transaction_search_quick_search` | Search transactions by quick-search fields |
| `isw_transaction_search_reference_search` | Search by transaction reference |
| `isw_transaction_search_bulk_search` | Search multiple transactions |
| `isw_get_transaction_details` | Fetch detailed transaction information |
| `isw_create_card` | Create a card; high-risk write |
| `isw_retry_card_creation` | Retry card creation |
| `isw_initiate_card_data_prep` | Initiate card data preparation |
| `isw_fetch_data_prep_request` | Fetch a data-prep request |
| `isw_fetch_prepared_cards` | Fetch prepared cards |
| `isw_bulk_card_production` | Start bulk card production; high-risk write |
| `isw_reissue_card_pin` | Reissue a card PIN; high-risk write |
| `isw_change_card_pin` | Change a card PIN; high-risk write |
| `isw_get_pin` | Retrieve PIN-related response where supported; high-risk read |
| `isw_block_card` | Block a card; high-risk write |
| `isw_unblock_card` | Unblock a card; high-risk write |
| `isw_block_prepaid_card` | Block a prepaid card; high-risk write |
| `isw_unblock_prepaid_card` | Unblock a prepaid card; high-risk write |
| `isw_link_card_to_account` | Link a card to an account; high-risk write |
| `isw_check_prepaid_balance` | Check prepaid card balance |
| `isw_check_debit_balance` | Check debit card balance |
| `isw_confirm_prepaid_sufficient` | Confirm prepaid sufficient balance |
| `isw_confirm_debit_sufficient` | Confirm debit sufficient balance |
| `isw_fetch_cards_by_issuer` | Fetch cards by issuer |
| `isw_fetch_single_card_by_pan` | Fetch a single card by PAN with redaction |
| `isw_fetch_cards_by_account` | Fetch cards by account |
| `isw_fetch_customer_card_details` | Fetch customer card details |
| `isw_fetch_request_logs` | Fetch Card 360 request logs |
| `isw_validate_card` | Validate card data |
| `isw_request_nano_loan` | Request a nano loan; high-risk write |
| `isw_salary_lending` | Start salary lending flow; high-risk write |
| `isw_value_financing` | Start value financing flow; high-risk write |
| `isw_get_customer_demographics` | Fetch customer demographics |
| `isw_get_financial_history` | Fetch customer financial history |
| `isw_get_financial_history_average` | Fetch financial-history averages |
| `isw_get_financial_habits` | Fetch customer financial habits |
| `isw_credit_inquiry` | Run credit inquiry |
| `isw_complete_credit` | Complete credit using OTP; high-risk write |
| `isw_requery_transfer` | Requery transfer status |
| `isw_get_receiving_institutions` | List payout receiving institutions |
| `isw_get_payout_channels` | List payout channels |
| `isw_agency_get_token` | Fetch/cache Agency Banking token |
| `isw_fintech_validate_debit_payload` | Validate debit payload structure |
| `isw_fintech_validate_reversal_payload` | Validate reversal payload structure |
| `isw_fintech_validate_enquiry_payload` | Validate enquiry payload structure |
| `isw_fintech_validate_place_lien_payload` | Validate place-lien payload structure |
| `isw_fintech_validate_debit_lien_payload` | Validate debit-lien payload structure |
| `isw_fintech_compute_mac` | Compute MAC; high-risk because it accepts secrets |
| `isw_fintech_build_response` | Build fintech response payload; high-risk when secrets are supplied |

### Available Resources

| Resource | URI | Description |
| -------- | --- | ----------- |
| `response_codes` | `isw://response-codes` | Common Interswitch response-code reference |
| `config_summary` | `isw://config-summary` | Safe runtime configuration summary; returns credential presence only, never secrets |

### Example

When you ask your AI assistant something like _"Use Interswitch to initialize a 5000 NGN payment for customer@example.com"_, here's what happens behind the scenes:

1. The assistant selects `isw_initialize_payment`
2. It passes explicit money input such as `amountNaira: 5000`
3. For write operations, it must include `confirm: true`
4. The server validates the request, converts the amount safely where required, authenticates with Interswitch, and calls the configured sandbox or production endpoint
5. You get a normalized response with redacted raw data

### Prompt recommendation

To get the best results when using this MCP server, be specific in your prompts and always include "Interswitch" in your requests.

**Good prompts:**

- "Initialize an Interswitch payment for 50000 NGN for user@example.com."
- "Check the Interswitch transaction status for reference order-1001."
- "Resolve Interswitch bank account 0123456789 with bank code 058."
- "Send an Interswitch single transfer for 1000 NGN with confirm true."
- "Read the Interswitch response code resource."

**Less effective prompts:**

- "List my transactions" (unclear which service and reference/search criteria to use)
- "Send money" (missing beneficiary, bank, amount, and confirmation details)
- "Pay this bill" (missing biller, package, customer, and amount details)

Being explicit ensures the LLM narrows down to the right tool quickly and reduces ambiguity.

## Production Safety

This server can route to production Interswitch endpoints when `INTERSWITCH_ENV=production` is set. Production readiness depends on correct credentials, Interswitch account permissions, and your organization's operational controls.

Safety behavior built into the server:

- Write tools require `confirm: true`
- High-risk sensitive read tools require `confirm: true`
- `INTERSWITCH_READ_ONLY=true` blocks all writes before any external API call
- Low-risk reads do not require confirmation
- Raw responses are redacted before being returned
- Tokens and secrets are never intentionally returned in tool output
- Card PIN payloads are encrypted locally when the required RSA public key is configured
- Production startup warnings are written to stderr instead of silently hiding risky configuration

Recommended production rollout:

1. Configure production credentials but keep `INTERSWITCH_READ_ONLY=true`
2. Verify startup warnings and config summary
3. Test safe read-only tools first
4. Confirm domain credentials for the exact tools you intend to use
5. Switch `INTERSWITCH_READ_ONLY=false` only when live writes are authorized
6. Require human review before prompts that include `confirm: true`

## Development

### Run locally (without building)

For local development and testing, you can run the TypeScript source directly:

```bash
npm run dev
```

### Run with MCP Inspector

```bash
npm run inspect
```

### Build

```bash
npm run build
```

### Run tests

```bash
npm test
```

### Type-check

```bash
npm run lint
```

### Preview npm package contents

```bash
npm pack --dry-run
```

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| Server exits silently at startup | Run it from a terminal and check stderr; verify Node v18+ and valid environment variables |
| Production warning appears | Add the missing credential group, set `INTERSWITCH_READ_ONLY=true`, or disable `DEBUG` depending on the warning |
| Tools not appearing in client | Ensure the server is running and the client config path is correct |
| Write tool blocked | Pass `confirm: true`; if still blocked, check `INTERSWITCH_READ_ONLY` |
| High-risk read blocked | Pass `confirm: true` |
| Payment tools fail | Configure `INTERSWITCH_MERCHANT_CODE` and `INTERSWITCH_PAYABLE_CODE` where required |
| Transfer tools fail | Configure `INTERSWITCH_INITIATING_ENTITY_CODE` where required |
| Card 360 tools fail | Configure `CARD360_CLIENT_ID` and `CARD360_CLIENT_SECRET` |
| PIN operations fail | Configure a valid `CARD360_RSA_PUBLIC_KEY` |
| Transaction Search fails | Configure `TRANSACTION_SEARCH_CLIENT_ID` and `TRANSACTION_SEARCH_CLIENT_SECRET` |
| Agency tools fail | Configure `INTERSWITCH_AGENCY_MERCHANT_ID` and `INTERSWITCH_AGENCY_TERMINAL_ID` |
| Request timeouts | Check network connectivity to the configured Interswitch environment |

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

MIT
