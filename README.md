# Interswitch MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that lets AI assistants work with Interswitch APIs for payments, transfers, VAS, cardless paycodes, Card 360, lending, payouts, transaction search, and related utilities.

> **Public Preview:** This package is newly published and should be used cautiously. Start in sandbox, keep `INTERSWITCH_READ_ONLY=true` while exploring, and verify every operation against your own Interswitch account setup before production use.

## Install

Use the published npm package:

```bash
npm install -g interswitch-mcp-server
```

Or run it without a global install:

```bash
npx interswitch-mcp-server
```

The package is published as:

```text
interswitch-mcp-server@0.1.0
```

## Requirements

- Node.js 18+
- npm
- Interswitch developer credentials
- Domain-specific credentials for optional services such as Card 360 and Transaction Search

## Configuration

The server reads configuration from environment variables. Core payment and transfer tools use the main Interswitch credentials. Card 360, Transaction Search, Agency Banking, and legacy auth settings are isolated so those services can fail clearly when their specific credentials are missing.

| Environment variable | Required | Purpose |
|---|---:|---|
| `INTERSWITCH_CLIENT_ID` | Yes | Core OAuth2 client ID from Interswitch |
| `INTERSWITCH_CLIENT_SECRET` | Yes | Core OAuth2 client secret |
| `INTERSWITCH_ENV` | No | `sandbox` or `production`; defaults to `sandbox` |
| `INTERSWITCH_READ_ONLY` | No | Set `true` to block all write operations |
| `INTERSWITCH_REQUIRE_CONFIRMATION` | No | Keep explicit confirmation behavior enabled |
| `INTERSWITCH_MERCHANT_CODE` | Payments | Merchant code for payment operations |
| `INTERSWITCH_PAYABLE_CODE` | Payments | Payable code for payment operations |
| `INTERSWITCH_INITIATING_ENTITY_CODE` | Transfers | Initiating entity code for transfers |
| `INTERSWITCH_TERMINAL_ID` | Some operations | Terminal ID where required by the API |
| `CARD360_CLIENT_ID` | Card 360 | Separate Card 360 client ID |
| `CARD360_CLIENT_SECRET` | Card 360 | Separate Card 360 client secret |
| `CARD360_RSA_PUBLIC_KEY` | Card PIN operations | RSA public key used for local PIN encryption |
| `TRANSACTION_SEARCH_CLIENT_ID` | Transaction Search | Separate Transaction Search client ID |
| `TRANSACTION_SEARCH_CLIENT_SECRET` | Transaction Search | Separate Transaction Search client secret |
| `INTERSWITCH_AGENCY_MERCHANT_ID` | Agency Banking | Agency Banking merchant identifier |
| `INTERSWITCH_AGENCY_TERMINAL_ID` | Agency Banking | Agency Banking terminal identifier |
| `INTERSWITCH_LEGACY_AUTH_ENABLED` | Legacy APIs | Enables legacy InterswitchAuth-backed calls when needed |

Example `.env`:

```bash
INTERSWITCH_CLIENT_ID=your_client_id
INTERSWITCH_CLIENT_SECRET=your_client_secret
INTERSWITCH_ENV=sandbox
INTERSWITCH_READ_ONLY=true
INTERSWITCH_MERCHANT_CODE=your_merchant_code
INTERSWITCH_PAYABLE_CODE=your_payable_code
INTERSWITCH_INITIATING_ENTITY_CODE=your_entity_code
```

## MCP client setup

### Using the npm package

Configure your MCP client to run the installed binary:

```json
{
  "mcpServers": {
    "interswitch": {
      "command": "npx",
      "args": ["-y", "interswitch-mcp-server"],
      "env": {
        "INTERSWITCH_CLIENT_ID": "your_client_id",
        "INTERSWITCH_CLIENT_SECRET": "your_client_secret",
        "INTERSWITCH_ENV": "sandbox",
        "INTERSWITCH_READ_ONLY": "true",
        "INTERSWITCH_MERCHANT_CODE": "your_merchant_code",
        "INTERSWITCH_PAYABLE_CODE": "your_payable_code"
      }
    }
  }
}
```

### Using a local checkout

```bash
git clone https://github.com/Dairus01/Interswitch-mcp-server.git
cd Interswitch-mcp-server
npm install
npm run build
```

Then configure your MCP client with the built entry point:

```json
{
  "mcpServers": {
    "interswitch": {
      "command": "node",
      "args": ["/absolute/path/to/Interswitch-mcp-server/dist/index.js"],
      "env": {
        "INTERSWITCH_CLIENT_ID": "your_client_id",
        "INTERSWITCH_CLIENT_SECRET": "your_client_secret",
        "INTERSWITCH_ENV": "sandbox",
        "INTERSWITCH_READ_ONLY": "true"
      }
    }
  }
}
```

## Safety model

- Write tools require `confirm: true`.
- High-risk sensitive tools also require `confirm: true`, even when they are read-like operations.
- `INTERSWITCH_READ_ONLY=true` blocks all write operations before any external API call is made.
- Tool schemas use explicit `amountNaira` or `amountKobo`; they do not accept ambiguous bare `amount` fields for money movement operations.
- `amountNaira` values with more than two decimal places are rejected instead of rounded.
- Tokens, secrets, passwords, keys, OTPs, PINs, CVVs, PANs, Track 2 data, auth data, and authorization headers are redacted from logs and tool responses.
- PAN-like 13-19 digit values are masked in raw responses.
- Card PIN operations encrypt locally using the configured Card 360 RSA public key; malformed public keys fail with a configuration error.

## Response shape

Tools return normalized JSON content with the same top-level shape:

```json
{
  "success": true,
  "responseCode": "00",
  "message": "Approved / Success",
  "data": {},
  "raw": {}
}
```

The `raw` field is preserved for troubleshooting but redacted before it is returned.

## Available tools

### Payments

| Tool | Mode | Description |
|---|---|---|
| `isw_initialize_payment` | Write | Initialize a payment request |
| `isw_get_transaction_status` | Read | Check transaction status |
| `isw_get_transaction_by_reference` | Read | Fetch transaction by reference |
| `isw_create_payment_link` | Write | Create a shareable payment link |
| `isw_initiate_refund` | Write, high risk | Initiate a refund |
| `isw_get_refund_status` | Read | Check refund status |
| `isw_pay_bill` | Write | Pay a bill |
| `isw_get_billers` | Read | List billers |
| `isw_get_biller_packages` | Read | List packages for a biller |

### VAS

| Tool | Mode | Description |
|---|---|---|
| `isw_get_billers_by_category` | Read | List billers by category |
| `isw_get_biller_details` | Read | Fetch biller details |
| `isw_validate_customer` | Read | Validate a biller customer |
| `isw_pay_vas_bill` | Write | Pay a VAS bill |
| `isw_airtime_recharge` | Write | Recharge airtime |
| `isw_get_airtime_epins` | Write | Request airtime ePINs |

### Transfers and cardless paycodes

| Tool | Mode | Description |
|---|---|---|
| `isw_single_transfer` | Write, high risk | Send a single bank transfer |
| `isw_bulk_transfer` | Write, high risk | Send bulk transfers; limited to 100 items |
| `isw_resolve_bank_account` | Read | Resolve bank account details |
| `isw_get_bank_codes` | Read | List supported bank codes |
| `isw_agency_banking_cashout` | Write, high risk | Initiate agency cashout |
| `isw_create_paycode` | Write | Create a cardless paycode |
| `isw_create_bulk_paycodes` | Write, high risk | Create bulk paycodes; limited to 100 items |
| `isw_get_paycode_status` | Read | Check paycode status |
| `isw_deactivate_paycode` | Write | Deactivate a paycode |

### Transaction Search

| Tool | Mode | Description |
|---|---|---|
| `isw_transaction_search_quick_search` | Read | Search transactions by quick-search fields |
| `isw_transaction_search_reference_search` | Read | Search by transaction reference |
| `isw_transaction_search_bulk_search` | Read | Search multiple transactions |
| `isw_get_transaction_details` | Read | Fetch detailed transaction information |

### Card 360

| Tool | Mode | Description |
|---|---|---|
| `isw_create_card` | Write, high risk | Create a card |
| `isw_retry_card_creation` | Write | Retry card creation |
| `isw_initiate_card_data_prep` | Write | Initiate card data preparation |
| `isw_fetch_data_prep_request` | Read | Fetch a data-prep request |
| `isw_fetch_prepared_cards` | Read | Fetch prepared cards |
| `isw_bulk_card_production` | Write, high risk | Start bulk card production |
| `isw_reissue_card_pin` | Write, high risk | Reissue a card PIN |
| `isw_change_card_pin` | Write, high risk | Change a card PIN |
| `isw_get_pin` | Read, high risk | Retrieve a PIN-related response where supported |
| `isw_block_card` | Write, high risk | Block a card |
| `isw_unblock_card` | Write, high risk | Unblock a card |
| `isw_block_prepaid_card` | Write, high risk | Block a prepaid card |
| `isw_unblock_prepaid_card` | Write, high risk | Unblock a prepaid card |
| `isw_link_card_to_account` | Write, high risk | Link card to account |
| `isw_check_prepaid_balance` | Read | Check prepaid card balance |
| `isw_check_debit_balance` | Read | Check debit card balance |
| `isw_confirm_prepaid_sufficient` | Read | Confirm prepaid card has sufficient balance |
| `isw_confirm_debit_sufficient` | Read | Confirm debit card has sufficient balance |
| `isw_fetch_cards_by_issuer` | Read | Fetch cards by issuer |
| `isw_fetch_single_card_by_pan` | Read, sensitive | Fetch a single card by PAN with redacted response |
| `isw_fetch_cards_by_account` | Read | Fetch cards by account |
| `isw_fetch_customer_card_details` | Read | Fetch customer card details |
| `isw_fetch_request_logs` | Read | Fetch Card 360 request logs |
| `isw_validate_card` | Read, sensitive | Validate card data with redacted response |

### Lending, transfer service, payouts, agency, and utilities

| Tool | Mode | Description |
|---|---|---|
| `isw_request_nano_loan` | Write, high risk | Request a nano loan |
| `isw_salary_lending` | Write, high risk | Start salary lending flow |
| `isw_value_financing` | Write, high risk | Start value financing flow |
| `isw_get_customer_demographics` | Read | Fetch customer demographics |
| `isw_get_financial_history` | Read | Fetch customer financial history |
| `isw_get_financial_history_average` | Read | Fetch financial-history averages |
| `isw_get_financial_habits` | Read | Fetch customer financial habits |
| `isw_credit_inquiry` | Read | Run credit inquiry |
| `isw_complete_credit` | Write, high risk | Complete credit using OTP |
| `isw_requery_transfer` | Read | Requery transfer status |
| `isw_get_receiving_institutions` | Read | List payout receiving institutions |
| `isw_get_payout_channels` | Read | List payout channels |
| `isw_agency_get_token` | Read | Fetch/cache Agency Banking token |
| `isw_fintech_validate_debit_payload` | Read | Validate debit payload structure |
| `isw_fintech_validate_reversal_payload` | Read | Validate reversal payload structure |
| `isw_fintech_validate_enquiry_payload` | Read | Validate enquiry payload structure |
| `isw_fintech_validate_place_lien_payload` | Read | Validate place-lien payload structure |
| `isw_fintech_validate_debit_lien_payload` | Read | Validate debit-lien payload structure |
| `isw_fintech_compute_mac` | Read, high risk | Compute MAC; requires confirmation because it accepts secrets |
| `isw_fintech_build_response` | Read, high risk | Build fintech response payload; requires confirmation when secrets are involved |

## MCP resources

| Resource URI | Description |
|---|---|
| `isw://response-codes` | Common Interswitch response codes |
| `isw://config-summary` | Safe configuration summary with credential presence only; never returns secrets |

## Example prompts

Initialize a payment:

```text
Use isw_initialize_payment with amountNaira 2500, customer email ada@example.com, transaction reference demo-001, and confirm true.
```

Check a transaction:

```text
Use isw_get_transaction_status for transaction reference demo-001.
```

Resolve a bank account:

```text
Use isw_resolve_bank_account for bank code 058 and account number 0123456789.
```

Run a protected transfer:

```text
Use isw_single_transfer to send 1000 naira to bank code 058 account 0123456789 with confirm true.
```

Read response codes:

```text
Read the MCP resource isw://response-codes.
```

## Development

```bash
npm install
npm run build
npm run lint
npm test
```

Other useful commands:

```bash
npm run dev       # Run TypeScript directly
npm run start     # Run built server
npm run inspect   # Open MCP Inspector against the built server
npm run clean     # Remove dist and dist-test
```

The package build uses `tsconfig.build.json` and emits only runtime files into `dist/`. Tests compile separately with `tsconfig.test.json` into `dist-test/`, so test artifacts are not included in the npm package.

## Publishing checklist

The `0.1.0` package was published to npm after passing:

```bash
npm run build
npm run lint
npm test
npm pack --dry-run
```

Current package contents are restricted by the `files` field in `package.json`:

```json
["dist", "README.md", "LICENSE", ".env.example"]
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Server exits at startup | Ensure `INTERSWITCH_CLIENT_ID` and `INTERSWITCH_CLIENT_SECRET` are set |
| Payment tools fail | Set `INTERSWITCH_MERCHANT_CODE` and `INTERSWITCH_PAYABLE_CODE` |
| Transfer tools fail | Set `INTERSWITCH_INITIATING_ENTITY_CODE` where required |
| Card 360 tools fail | Set `CARD360_CLIENT_ID` and `CARD360_CLIENT_SECRET`; PIN operations also need `CARD360_RSA_PUBLIC_KEY` |
| Transaction Search fails | Set `TRANSACTION_SEARCH_CLIENT_ID` and `TRANSACTION_SEARCH_CLIENT_SECRET` |
| Agency tools fail | Set `INTERSWITCH_AGENCY_MERCHANT_ID` and `INTERSWITCH_AGENCY_TERMINAL_ID` where required |
| Write tool blocked | Pass `"confirm": true`; if still blocked, check `INTERSWITCH_READ_ONLY` |
| Amount rejected | Use exactly one of `amountNaira` or `amountKobo`; `amountNaira` supports at most two decimal places |
| Secret appears missing in config summary | This is intentional; config resources only report whether credential groups are configured |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Pull requests and issues are welcome.

## License

MIT License — see [LICENSE](LICENSE).
