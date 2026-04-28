# Interswitch MCP Server
A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI assistants to interact with [Interswitch](https://www.interswitchgroup.com/) payment APIs — accept payments, send money, manage cards, recharge airtime, issue paycodes, and more.

> ⚠️ **Public Preview:** This MCP server is currently in public preview. Use cautiously in non-production environments and report issues.

## Quick Start

```bash
git clone <repo-url>
cd interswitch-mcp-server
npm install
npm run build
```

## Requirements

- Node.js v18+
- npm or yarn
- Interswitch Developer account: https://developer.interswitchgroup.com
- Client ID and Client Secret from the developer console

## Configuration Options

| Environment Variable | Required | Purpose |
|---|---|---|
| `INTERSWITCH_CLIENT_ID` | Yes | OAuth2 client ID from developer console |
| `INTERSWITCH_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `INTERSWITCH_ENV` | No | `sandbox` (default) or `production` |
| `INTERSWITCH_MERCHANT_CODE` | For payments | Merchant code from Quickteller Business |
| `INTERSWITCH_PAYABLE_CODE` | For payments | Payable code for your integration |
| `INTERSWITCH_INITIATING_ENTITY_CODE` | For transfers | Entity code for money transfers |
| `CARD360_CLIENT_ID` | For Card 360 | Separate Card 360 credentials |
| `CARD360_CLIENT_SECRET` | For Card 360 | Separate Card 360 credentials |
| `CARD360_RSA_PUBLIC_KEY` | For PIN ops | RSA public key for PIN encryption |
| `TRANSACTION_SEARCH_CLIENT_ID` | For tx search | Transaction Search credentials |
| `TRANSACTION_SEARCH_CLIENT_SECRET` | For tx search | Transaction Search credentials |
| `INTERSWITCH_READ_ONLY` | No | Set `true` to block all write operations |

Sandbox and production use different base URLs — the server selects automatically based on `INTERSWITCH_ENV`.

## Client Integration

Configure your MCP client to run a local build:

```json
{
  "mcpServers": {
    "interswitch": {
      "command": "node",
      "args": ["/absolute/path/to/interswitch-mcp-server/dist/index.js"],
      "env": {
        "INTERSWITCH_CLIENT_ID": "your_client_id",
        "INTERSWITCH_CLIENT_SECRET": "your_client_secret",
        "INTERSWITCH_ENV": "sandbox",
        "INTERSWITCH_MERCHANT_CODE": "your_merchant_code"
      }
    }
  }
}
```

| Client | MCP server support |
|---|---|
| VS Code | Supported |
| Claude Desktop | Supported |
| ChatGPT Desktop | Supported |
| Cursor | Supported |
| Windsurf | Supported |
| Claude Code | Supported |

## Available Tools

| Tool | Domain | Description |
|---|---|---|
| `isw_initialize_payment` | Payments | Initialize a Quickteller checkout |
| `isw_get_transaction_status` | Payments | Poll transaction status by reference |
| `isw_get_transaction_by_reference` | Payments | Fetch transaction by reference query |
| `isw_create_payment_link` | Payments | Generate a shareable payment link |
| `isw_initiate_refund` | Payments | Reverse a settled transaction |
| `isw_get_refund_status` | Payments | Check refund progress |
| `isw_pay_bill` | Payments | Pay a utility bill |
| `isw_get_billers` | Payments | List available billers |
| `isw_get_biller_packages` | Payments | List packages for a biller |
| `isw_single_transfer` | Transfers | Send money to a bank account |
| `isw_bulk_transfer` | Transfers | Send to multiple accounts |
| `isw_resolve_bank_account` | Transfers | Name enquiry before sending |
| `isw_get_bank_codes` | Transfers | List all Nigerian bank codes |
| `isw_validate_customer` | VAS | Validate a biller customer account |
| `isw_airtime_recharge` | VAS | Top up a phone number |
| `isw_pay_vas_bill` | VAS | Pay a bill via VAS route |
| `isw_create_paycode` | Cardless | Generate a cardless withdrawal code |
| `isw_create_bulk_paycodes` | Cardless | Generate multiple paycodes |
| `isw_get_paycode_status` | Cardless | Check if a paycode has been used |
| `isw_deactivate_paycode` | Cardless | Cancel an unused paycode |
| `isw_transaction_search_quick_search` | Tx Search | Search by amount/terminal/date |
| `isw_transaction_search_reference_search` | Tx Search | Search by transaction reference |
| `isw_transaction_search_bulk_search` | Tx Search | Search multiple references |
| `isw_get_transaction_details` | Tx Search | Get full transaction detail |
| `isw_create_card` | Card 360 | Provision a Verve card |
| `isw_block_card` | Card 360 | Immediately block a card |
| `isw_unblock_card` | Card 360 | Unblock a card |
| `isw_change_card_pin` | Card 360 | Change PIN (encrypted locally) |
| `isw_reissue_card_pin` | Card 360 | Reissue a card PIN |
| `isw_get_card_balance` | Card 360 | Get prepaid or debit card balance |
| `isw_fetch_single_card_by_pan` | Card 360 | Fetch card by PAN |
| `isw_fetch_cards_by_account` | Card 360 | Get all cards on an account |
| `isw_validate_card` | Card 360 | Validate card CVV and expiry |
| `isw_request_nano_loan` | Lending | Request a nano loan |
| `isw_get_customer_demographics` | Lending | Customer demographic data |
| `isw_get_financial_history` | Lending | Customer spend history |
| `isw_credit_inquiry` | Transfer Service | Inquire before a bank credit |
| `isw_complete_credit` | Transfer Service | Complete a credit with OTP |
| `isw_requery_transfer` | Transfer Service | Poll transfer completion |
| `isw_get_receiving_institutions` | Payouts | List payout institutions |
| `isw_get_payout_channels` | Payouts | List payout channels |

## Security

- All write tools require `confirm: true` in the request
- Set `INTERSWITCH_READ_ONLY=true` to block all writes regardless of confirmation
- Secrets, tokens, PANs, CVVs, and PINs are redacted from all logs and tool output
- Card PIN operations use 3DES encryption locally — plaintext PINs never leave the server

## Development

```bash
# Run without building (TypeScript directly)
npm run dev

# Inspect tools with MCP Inspector
npm run inspect

# Build
npm run build

# Run tests
npm test
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Server exits at startup | Ensure `INTERSWITCH_CLIENT_ID` and `INTERSWITCH_CLIENT_SECRET` are set |
| Payment tools fail | `INTERSWITCH_MERCHANT_CODE` and `INTERSWITCH_PAYABLE_CODE` are required for payment operations |
| Card 360 tools fail | Set `CARD360_CLIENT_ID` and `CARD360_CLIENT_SECRET` — these are separate from core credentials |
| PIN operations fail | Set `CARD360_RSA_PUBLIC_KEY` from the Interswitch developer console |
| Transaction Search fails | Set `TRANSACTION_SEARCH_CLIENT_ID` and `TRANSACTION_SEARCH_CLIENT_SECRET` |
| Write tool blocked | Pass `"confirm": true` in tool arguments, or check `INTERSWITCH_READ_ONLY` |
| Amounts seem wrong | All tools accept `amountNaira` or `amountKobo` explicitly — never a bare `amount` field |

## Contributing + License

See [CONTRIBUTING.md](CONTRIBUTING.md). Pull requests are welcome.

MIT License — see [LICENSE](LICENSE).
