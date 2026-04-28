# SKILL: Build the Interswitch MCP Server from Start to Finish

## What This Skill Is

This is a complete, opinionated blueprint for building a production-quality **Model Context Protocol (MCP) server** that exposes Interswitch's full API surface to AI agents. You are building the first Interswitch MCP server — there is no existing one. The Paystack MCP server (`PaystackOSS/paystack-mcp-server`) is your structural reference for how a Nigerian fintech MCP server should look. You will surpass it in coverage and quality.

Follow every instruction in order. Do not skip sections. Do not hallucinate API fields — every tool schema must reflect the actual Interswitch documentation described below.

---

## Part 1: Interswitch API Domain Knowledge

### 1.1 What Interswitch Is

Interswitch is Africa's leading payment infrastructure company founded in 2002. It is **not** a simple payment gateway like Paystack — it is a full payment switch, processor, and digital commerce platform. Its APIs serve banks, fintechs, merchants, and governments. This means the MCP server must handle more complex authentication flows, more security-sensitive operations (card management, lending), and more business-level abstraction than a typical payment gateway MCP.

**Key products exposed via API:**
- **Quickteller Business** — merchant payment acceptance
- **Verve** — Africa's largest domestic card scheme (EMV-certified)
- **Card 360** — full lifecycle card management (issue, block, PIN, balance)
- **Paycode / Cardless** — ATM/POS withdrawal without a card
- **Transaction Search** — cross-channel transaction intelligence
- **Value Added Services (VAS)** — airtime, data, bills
- **Send Money** — single and bulk bank transfers
- **Lending APIs** — nano loans, salary lending, value financing
- **Customer Insights** — spending demography, financial habits

### 1.2 Authentication — Critical, Read Carefully

Interswitch uses **OAuth 2.0 Client Credentials** flow for all API access. This is different from Paystack's simple Bearer token. The MCP server must handle token lifecycle — fetching, caching, and refreshing tokens automatically.

**Token endpoint:** `https://passport.interswitchng.com/passport/oauth/token`  
**Method:** POST  
**Content-Type:** `application/x-www-form-urlencoded`  
**Body:** `grant_type=client_credentials`  
**Auth:** HTTP Basic — `client_id:client_secret` base64-encoded in `Authorization` header

**Token response fields:**
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "scope": "profile"
}
```

**SANDBOX base URL:** `https://qa.interswitchng.com`  
**PRODUCTION base URL:** `https://api.interswitchng.com`

The MCP server must:
1. Fetch a token on startup
2. Cache it in memory with an expiry clock
3. Auto-refresh before expiry (refresh 60 seconds early)
4. Retry once on 401 before failing

**Card 360 uses a separate authentication endpoint and a different `client_id`/`client_secret` pair.** The token for Card 360 is fetched from the same passport endpoint but with different scopes. Document this clearly in the config.

**Transaction Search API** also has its own token endpoint: `GET /api/v3/transaction-search/token` (uses HTTP Basic auth with its own credentials set).

### 1.3 API Surface — All APIs to Implement

Below is the complete list of Interswitch API domains and their operations. Each becomes one or more MCP tools.

---

#### Domain 1: Accept Payments (Quickteller Business)

**Base path:** `/quickteller/`

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Initialize Payment | POST | `/api/v2/purchases` | `merchantCode`, `payableCode`, `amount` (in kobo), `redirectUrl`, `customerId`, `currencyCode` (566=NGN) |
| Get Transaction Status | GET | `/api/v2/purchases/{transactionRef}` | `transactionRef` (your unique ref) |
| Get Transaction by Reference | GET | `/api/v2/purchases` | query: `transactionRef` |
| Create Payment Link | POST | `/api/v2/purchasecode` | `merchantCode`, `payableCode`, `amount`, `expiryDate` |
| Initiate Refund | POST | `/api/v2/refunds` | `transactionRef`, `amount`, `merchantCode`, `reason` |
| Get Refund Status | GET | `/api/v2/refunds/{refundRef}` | `refundRef` |
| Pay Bill | POST | `/api/v2/purchases` | same as Initialize but with bill-specific `payableCode` and `customerId` as account/meter number |
| Get Billers | GET | `/api/v2/quickteller/categorys` | optional: `categoryId` |
| Get Biller Packages | GET | `/api/v2/quickteller/billers/{billerId}/packages` | `billerId` |

**Amount note:** ALL amounts are in **kobo** (1 NGN = 100 kobo). This must be documented in every tool description.

**currencyCode values:**
- 566 = NGN (Nigerian Naira)
- 840 = USD
- 566 is default for Nigeria

**Webhook payload fields** (incoming, for documentation/validation tool):
```json
{
  "transactionRef": "...",
  "amount": 10000,
  "responseCode": "00",
  "responseDescription": "Approved",
  "merchantCode": "...",
  "cardNumber": "xxxx...xxxx"
}
```

---

#### Domain 2: Value Added Services (VAS)

**Base path:** `/api/v2/`

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Get Billers by Category | GET | `/api/v2/quickteller/categorys` | `categoryId` (optional) |
| Get Biller Details | GET | `/api/v2/quickteller/billers/{billerId}` | `billerId` |
| Customer Validation | POST | `/api/v2/quickteller/customers/validations` | `billerId`, `customerId` (meter/account number) |
| Pay Bill (VAS) | POST | `/api/v2/purchases` | `merchantCode`, `payableCode`, `amount`, `customerId` |
| Airtime Recharge (VTU) | POST | `/api/v2/purchases` | `payableCode` specific to telco, `customerId`=phone number, `amount` |
| Get Airtime E-Pins | POST | `/api/v2/purchases` | `payableCode` for e-pin type, `amount`, `customerId` |
| VAS Response Codes | (Reference table — build into error handler) | | `00`=Success, `25`=Unable to locate record, `96`=System malfunction |

**Common biller category IDs (from Interswitch):**
- Electricity: `ELEC`
- Cable TV: `DSTV`, `GOTV`, `STARTIMES`
- Airtime: `MTN`, `AIRTEL`, `GLO`, `9MOBILE`
- Water: `WATER`

---

#### Domain 3: Send Money (Transfers)

**Base path:** `/api/v2/`

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Single Transfer | POST | `/api/v2/ft/transfer` | `initiatingEntityCode`, `beneficiaryAccountName`, `beneficiaryAccountNumber`, `beneficiaryBankCode`, `amount` (in kobo), `senderName`, `narration`, `transactionRef` |
| Bulk Transfer | POST | `/api/v2/ft/transfer/bulk` | `initiatingEntityCode`, `narration`, `transactions[]` (array of single transfer objects) |
| Resolve Bank Account | POST | `/api/v2/ft/enquiry/nameenquiry` | `beneficiaryAccountNumber`, `beneficiaryBankCode` |
| Get Bank Codes | GET | `/api/v2/ft/beneficiaries/banks` | returns array of `{bankCode, bankName}` |
| Agency Banking Cashout | POST | `/api/v2/ft/transfer/agentcashout` | `amount`, `agentCode`, `transactionRef`, `customerAccount`, `customerBankCode` |

**Transfer response codes:**
- `00` = Successful
- `01` = Pending (poll requery)
- `57` = Transaction not permitted
- `91` = Issuer or switch inoperative

**CRITICAL:** Transfers require an `initiatingEntityCode` which is a merchant/business code assigned during KYC onboarding. This must be a required config value.

---

#### Domain 4: Cardless Services (Paycode)

**Base path:** `/api/v2/`

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Create Single Paycode | POST | `/api/v2/cardlessservices/paycodes` | `amount` (kobo), `customerId`, `transactionRef`, `expiryDate`, `narration` |
| Create Bulk Paycode | POST | `/api/v2/cardlessservices/paycodes/bulk` | `paycodes[]` (array of single paycode objects) |
| Get Paycode Status | GET | `/api/v2/cardlessservices/paycodes/{paycode}` | `paycode` (the generated code) |
| Deactivate Paycode | DELETE | `/api/v2/cardlessservices/paycodes/{paycode}` | `paycode` |

**Paycode:** A numeric code (typically 9-12 digits) generated by Interswitch that a customer can use at an ATM or POS to withdraw cash without a card. The code is time-limited (`expiryDate`).

---

#### Domain 5: Transaction Search

**Base URL (separate service):** `https://transactionSearch.interswitchng.com` (QA: use QA equivalent)  
**Token endpoint:** `GET /api/v3/transaction-search/token` with Basic auth

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Get Token | GET | `/api/v3/transaction-search/token` | Basic auth header |
| Quick Search | GET | `/api/v3/transaction-search/transactions/quick-search` | `amount`, `terminalId`, `fromDate`, `toDate` |
| Reference Search | GET | `/api/v3/transaction-search/transactions/reference-search` | `transactionRef`, `fromDate`, `toDate` |
| Bulk Search | POST | `/api/v3/transaction-search/transactions/bulk-search` | `transactions[]` (array of refs) |
| Get Transaction Details | GET | `/api/v3/transaction-search/transactions/{transactionId}` | `transactionId` |

**Date format:** `YYYY-MM-DD HH:mm:ss` for all date fields.

**Response codes for this service are separate from payment response codes** — documented as SWOL response codes. `00`=approved, `06`=general error, `68`=response received too late.

---

#### Domain 6: Card 360 Service (Card Management)

This is the most complex API domain. It requires a separate client credential pair configured as `CARD360_CLIENT_ID` and `CARD360_CLIENT_SECRET`.

**Base path for Card 360:** `/api/v1/card360/`

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Create Single Card | POST | `/api/v1/card360/cards` | `cardBin`, `customerId`, `cardHolderName`, `accountNumber`, `expiryDate` |
| Retry Card Creation | POST | `/api/v1/card360/cards/retry` | `requestRef` |
| Initiate Card Data Prep | POST | `/api/v1/card360/dataprep` | `cardBin`, `quantity`, `deliveryDate` |
| Fetch Data Prep Request | GET | `/api/v1/card360/dataprep/{requestRef}` | `requestRef` |
| Fetch Prepared Cards | GET | `/api/v1/card360/dataprep/{requestRef}/cards` | `requestRef`, `page`, `pageSize` |
| Bulk Card Production | POST | `/api/v1/card360/cards/bulk` | `cards[]` |
| Reissue Card PIN | POST | `/api/v1/card360/cards/{cardPan}/pin/reissue` | `cardPan`, `encryptedPin`, `encryptedKey` |
| Change Card PIN | POST | `/api/v1/card360/cards/{cardPan}/pin/change` | `cardPan`, `encryptedOldPin`, `encryptedNewPin`, `encryptedKey` |
| Get PIN | GET | `/api/v1/card360/cards/{cardPan}/pin` | `cardPan` |
| Block Card | POST | `/api/v1/card360/cards/{cardPan}/block` | `cardPan`, `reason` |
| Unblock Card | POST | `/api/v1/card360/cards/{cardPan}/unblock` | `cardPan`, `reason` |
| Block Prepaid Card | POST | `/api/v1/card360/cards/{cardPan}/prepaid/block` | `cardPan` |
| Unblock Prepaid Card | POST | `/api/v1/card360/cards/{cardPan}/prepaid/unblock` | `cardPan` |
| Link Card to Account | POST | `/api/v1/card360/cards/{cardPan}/link` | `cardPan`, `accountNumber`, `bankCode` |
| Check Prepaid Balance | GET | `/api/v1/card360/cards/{cardPan}/prepaid/balance` | `cardPan` |
| Check Debit Balance | GET | `/api/v1/card360/cards/{cardPan}/debit/balance` | `cardPan` |
| Confirm Prepaid Sufficient | POST | `/api/v1/card360/cards/{cardPan}/prepaid/sufficiency` | `cardPan`, `amount` |
| Confirm Debit Sufficient | POST | `/api/v1/card360/cards/{cardPan}/debit/sufficiency` | `cardPan`, `amount` |
| Fetch Cards by Issuer | GET | `/api/v1/card360/cards` | query: `issuerNumber`, `page`, `pageSize` |
| Fetch Single Card by PAN | GET | `/api/v1/card360/cards/{cardPan}` | `cardPan` |
| Fetch Cards by Account | GET | `/api/v1/card360/cards/account/{accountNumber}` | `accountNumber` |
| Fetch Customer Card Details | GET | `/api/v1/card360/cards/account/{accountNumber}/customer` | `accountNumber` |
| Fetch Request Logs | GET | `/api/v1/card360/logs` | `fromDate`, `toDate`, `page`, `pageSize` |
| Validate Card | POST | `/api/v1/card360/cards/{cardPan}/validate` | `cardPan`, `cvv`, `expiryDate` |

**SECURITY CRITICAL — PIN Encryption:**  
Card PINs must NEVER travel in plaintext. Interswitch uses 3DES encryption with a key exchange mechanism. The server must:
1. Fetch the public key from Interswitch
2. Encrypt the PIN block using 3DES (ISO 9564 PIN block format 0)
3. Send `encryptedPin` + `encryptedKey` (the 3DES key encrypted with Interswitch's RSA public key)

The MCP tool for PIN operations must accept a plaintext PIN from the agent and perform this encryption internally. Never expose encrypted intermediates in tool responses.

---

#### Domain 7: Lending & Data Services

**Base path:** `/api/v2/lending/`

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Nano Loan Request | POST | `/api/v2/lending/nanoloans` | `customerId`, `amount`, `tenor`, `merchantCode`, `transactionRef` |
| Salary Lending | POST | `/api/v2/lending/salaryloans` | `customerId`, `amount`, `tenor`, `employerCode` |
| Value Financing | POST | `/api/v2/lending/valuefinancing` | `customerId`, `amount`, `productCode`, `merchantCode` |
| Get Customer Demographics | GET | `/api/v2/insights/customers/{customerId}/demographics` | `customerId` |
| Get Financial History | GET | `/api/v2/insights/customers/{customerId}/financial-history` | `customerId`, `fromDate`, `toDate` |
| Get Financial History Average | GET | `/api/v2/insights/customers/{customerId}/financial-history/average` | `customerId` |
| Get Financial Habits | GET | `/api/v2/insights/customers/{customerId}/financial-habits` | `customerId` |

---

#### Domain 8: Transfer Service (Bank-to-Bank Credit)

**Base path:** `/api/v2/`

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Credit Inquiry | POST | `/api/v2/transfers/inquiry` | `beneficiaryAccountNumber`, `beneficiaryBankCode`, `amount` |
| Credit Completion | POST | `/api/v2/transfers/completion` | `inquiryRef` (from inquiry response), `otp` |
| Transaction Requery | GET | `/api/v2/transfers/{transactionRef}/requery` | `transactionRef` |

---

#### Domain 9: Fintech Card Processing

This domain is for fintechs acting as card processors receiving debit/reversal commands.

| Operation | Description | Direction |
|---|---|---|
| Debit | Card debit command sent to fintech's endpoint by Interswitch | Incoming (webhook handler) |
| Reversal | Reversal command | Incoming (webhook handler) |
| Enquiry | Balance/account enquiry | Incoming |
| Place Lien | Place a hold on funds | Incoming |
| Debit Lien | Debit a previously placed lien | Incoming |

**Note:** These operations are implemented as **incoming webhook handlers**, not outgoing API calls. The MCP tool exposes utilities for building and validating these handlers (schema validation, response formatting), not for calling Interswitch.

---

#### Domain 10: Payouts

| Operation | Method | Path | Key Fields |
|---|---|---|---|
| Get Receiving Institutions | GET | `/api/v2/payouts/institutions` | returns array with `code`, `name`, `type` |
| Get Payout Channels | GET | `/api/v2/payouts/channels` | returns available payout rail configurations |

---

### 1.4 Global Response Code Reference

Build a shared `response-codes.ts` module. Key codes common across all APIs:

| Code | Meaning |
|---|---|
| `00` | Approved / Success |
| `01` | Pending — poll requery |
| `05` | Do not honor |
| `06` | General error |
| `12` | Invalid transaction |
| `14` | Invalid card number |
| `25` | Unable to locate record |
| `51` | Insufficient funds |
| `54` | Expired card |
| `57` | Transaction not permitted to cardholder |
| `62` | Restricted card |
| `65` | Exceeds withdrawal limit |
| `68` | Response received too late |
| `91` | Issuer/switch inoperative |
| `96` | System malfunction |

---

## Part 2: Project Structure

```
interswitch-mcp-server/
├── src/
│   ├── index.ts                    # MCP server entry point, tool registration
│   ├── config.ts                   # Env var validation and typed config export
│   ├── auth/
│   │   ├── token-manager.ts        # OAuth token lifecycle: fetch, cache, refresh
│   │   ├── card360-token.ts        # Separate token manager for Card 360
│   │   └── transaction-search-token.ts  # Separate token for Tx Search
│   ├── client/
│   │   ├── base-client.ts          # Axios instance factory with auth interceptors
│   │   ├── payment-client.ts       # Client for payment API
│   │   ├── card360-client.ts       # Client for Card 360 API
│   │   └── transaction-search-client.ts
│   ├── tools/
│   │   ├── payments/
│   │   │   ├── initialize-payment.ts
│   │   │   ├── get-transaction-status.ts
│   │   │   ├── create-payment-link.ts
│   │   │   ├── initiate-refund.ts
│   │   │   ├── get-refund-status.ts
│   │   │   ├── pay-bill.ts
│   │   │   ├── get-billers.ts
│   │   │   └── get-biller-packages.ts
│   │   ├── transfers/
│   │   │   ├── single-transfer.ts
│   │   │   ├── bulk-transfer.ts
│   │   │   ├── resolve-bank-account.ts
│   │   │   └── get-bank-codes.ts
│   │   ├── vas/
│   │   │   ├── customer-validation.ts
│   │   │   ├── airtime-recharge.ts
│   │   │   └── pay-vas-bill.ts
│   │   ├── cardless/
│   │   │   ├── create-paycode.ts
│   │   │   ├── create-bulk-paycode.ts
│   │   │   ├── get-paycode-status.ts
│   │   │   └── deactivate-paycode.ts
│   │   ├── card360/
│   │   │   ├── create-card.ts
│   │   │   ├── block-card.ts
│   │   │   ├── unblock-card.ts
│   │   │   ├── change-card-pin.ts
│   │   │   ├── get-card-balance.ts
│   │   │   ├── fetch-card.ts
│   │   │   ├── validate-card.ts
│   │   │   └── link-card-to-account.ts
│   │   ├── transaction-search/
│   │   │   ├── quick-search.ts
│   │   │   ├── reference-search.ts
│   │   │   ├── bulk-search.ts
│   │   │   └── get-transaction-details.ts
│   │   ├── lending/
│   │   │   ├── nano-loan.ts
│   │   │   ├── salary-lending.ts
│   │   │   └── customer-insights.ts
│   │   └── transfer-service/
│   │       ├── credit-inquiry.ts
│   │       ├── credit-completion.ts
│   │       └── transaction-requery.ts
│   ├── types/
│   │   ├── payment.types.ts
│   │   ├── transfer.types.ts
│   │   ├── card360.types.ts
│   │   ├── vas.types.ts
│   │   ├── cardless.types.ts
│   │   ├── lending.types.ts
│   │   └── common.types.ts
│   ├── utils/
│   │   ├── response-codes.ts       # Global code → description map
│   │   ├── pin-encryption.ts       # 3DES PIN block encryption for Card 360
│   │   ├── amount-helpers.ts       # kobo ↔ naira conversion, formatting
│   │   ├── date-helpers.ts         # Date formatting for API calls
│   │   └── error-handler.ts        # Standardized ISW error to MCP error mapping
│   └── resources/
│       └── interswitch-reference.ts  # MCP resource: response code reference
├── test/
│   ├── auth/
│   ├── tools/
│   └── utils/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── .mocharc.json
└── README.md
```

---

## Part 3: Tech Stack and Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.7.0",
    "zod": "^3.23.0",
    "node-forge": "^1.3.1",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/node-forge": "^1.3.0",
    "typescript": "^5.4.0",
    "mocha": "^10.4.0",
    "@types/mocha": "^10.0.0",
    "nock": "^13.5.0",
    "ts-node": "^10.9.2"
  },
  "engines": {
    "node": ">=18"
  }
}
```

**Why `node-forge`:** Required for Card 360 PIN block 3DES encryption and RSA key wrapping. This is non-negotiable for PCI-DSS alignment.

**Why `zod`:** Schema validation for all tool inputs before sending to Interswitch. The MCP server must validate inputs early to give agents clear error messages.

---

## Part 4: Configuration and Environment Variables

```bash
# .env.example

# ─── Core Credentials ─────────────────────────────────────────────
# Required. Obtained from developer.interswitchgroup.com
INTERSWITCH_CLIENT_ID=
INTERSWITCH_CLIENT_SECRET=

# ─── Environment ──────────────────────────────────────────────────
# "sandbox" or "production". Defaults to "sandbox" if omitted.
INTERSWITCH_ENV=sandbox

# ─── Business Identifiers ─────────────────────────────────────────
# Required for payment acceptance and transfers
INTERSWITCH_MERCHANT_CODE=
INTERSWITCH_PAYABLE_CODE=
INTERSWITCH_INITIATING_ENTITY_CODE=

# ─── Card 360 Credentials (separate from core) ────────────────────
# Only required if using Card 360 tools
CARD360_CLIENT_ID=
CARD360_CLIENT_SECRET=

# ─── Transaction Search Credentials (separate) ────────────────────
# Only required if using Transaction Search tools
TRANSACTION_SEARCH_CLIENT_ID=
TRANSACTION_SEARCH_CLIENT_SECRET=

# ─── Passphrase for PIN block key (Card 360) ──────────────────────
# The RSA public key downloaded from Interswitch developer console
CARD360_RSA_PUBLIC_KEY=
```

**`config.ts` must:**
1. Load all env vars at startup
2. Validate that required vars are present using Zod
3. Reject production credentials when `INTERSWITCH_ENV=sandbox` (mirror Paystack's safety check)
4. Export a typed `Config` object used by all other modules — never read `process.env` outside this file

---

## Part 5: Authentication Implementation

### `src/auth/token-manager.ts`

```typescript
interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp ms
}

class InterswitchTokenManager {
  private cache: TokenCache | null = null;
  private readonly REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry

  async getToken(): Promise<string> {
    if (this.cache && Date.now() < this.cache.expiresAt - this.REFRESH_BUFFER_MS) {
      return this.cache.accessToken;
    }
    return this.fetchToken();
  }

  private async fetchToken(): Promise<string> {
    // POST to passport.interswitchng.com/passport/oauth/token
    // Content-Type: application/x-www-form-urlencoded
    // Body: grant_type=client_credentials
    // Authorization: Basic base64(clientId:clientSecret)
    // Store result in this.cache with expiresAt = Date.now() + expires_in * 1000
  }
}

export const tokenManager = new InterswitchTokenManager();
```

Create identical `Card360TokenManager` and `TransactionSearchTokenManager` classes — they differ only in which credentials they use.

### `src/client/base-client.ts`

Create an Axios instance factory that:
1. Sets `baseURL` from config (sandbox vs production)
2. Adds request interceptor that calls `tokenManager.getToken()` and sets `Authorization: Bearer {token}`
3. Adds response interceptor that:
   - On `401`: invalidates token cache, retries once
   - On any error: maps to a structured `InterswitchError` with `responseCode`, `responseDescription`, and HTTP status

---

## Part 6: Tool Implementation Pattern

Every tool file must follow this exact pattern:

```typescript
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { paymentClient } from '../../client/payment-client.js';
import { formatAmount } from '../../utils/amount-helpers.js';

// 1. Zod input schema — validates before any API call
const InitializePaymentSchema = z.object({
  amount: z.number().positive().describe('Payment amount in Naira (NOT kobo — the tool converts automatically)'),
  merchantCode: z.string().optional().describe('Override merchant code. Uses INTERSWITCH_MERCHANT_CODE from config by default'),
  payableCode: z.string().optional().describe('Payable code for this transaction'),
  customerId: z.string().describe('Customer identifier (email, phone, or account number)'),
  transactionRef: z.string().describe('Your unique transaction reference — must be unique per transaction'),
  redirectUrl: z.string().url().describe('URL Interswitch redirects to after payment'),
  currencyCode: z.number().default(566).describe('Currency code. 566=NGN (default), 840=USD'),
});

// 2. MCP Tool definition
export const initializePaymentTool: Tool = {
  name: 'isw_initialize_payment',
  description: `Initialize a payment transaction on Interswitch Quickteller. Returns a payment URL the customer visits to complete payment. Amount is in Naira — this tool converts to kobo automatically. Monitor the webhook or poll isw_get_transaction_status to confirm completion.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      amount: { type: 'number', description: 'Amount in Naira' },
      // ... mirror zod schema
    },
    required: ['amount', 'customerId', 'transactionRef', 'redirectUrl'],
  },
};

// 3. Handler function
export async function handleInitializePayment(args: unknown) {
  const params = InitializePaymentSchema.parse(args); // throws ZodError if invalid
  
  const body = {
    merchantCode: params.merchantCode ?? config.merchantCode,
    payableCode: params.payableCode ?? config.payableCode,
    amount: formatAmount.toKobo(params.amount), // converts naira → kobo
    customerId: params.customerId,
    transactionRef: params.transactionRef,
    redirectUrl: params.redirectUrl,
    currencyCode: params.currencyCode,
  };

  const response = await paymentClient.post('/api/v2/purchases', body);
  
  // Always return structured text content
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        paymentUrl: response.data.redirectUrl,
        transactionRef: response.data.transactionRef,
        amount: params.amount,
        instructions: 'Direct the customer to paymentUrl. Poll isw_get_transaction_status or listen to your webhook for completion.',
      }, null, 2),
    }],
  };
}
```

**Tool naming convention:** All tool names are prefixed with `isw_` to avoid namespace collisions in agents that use multiple MCP servers.

---

## Part 7: Complete Tool Inventory

Register all of the following tools in `src/index.ts`. Group them logically.

### Payment Tools
- `isw_initialize_payment` — start a checkout flow
- `isw_get_transaction_status` — poll by transactionRef
- `isw_create_payment_link` — generate a shareable payment link
- `isw_initiate_refund` — reverse a settled transaction
- `isw_get_refund_status` — check refund progress
- `isw_pay_bill` — pay a utility bill (electricity, cable, etc.)
- `isw_get_billers` — list available billers by category
- `isw_get_biller_packages` — list packages for a biller (e.g. DSTV plans)

### Transfer Tools
- `isw_single_transfer` — send money to a bank account
- `isw_bulk_transfer` — send to multiple accounts in one call
- `isw_resolve_bank_account` — name enquiry before sending
- `isw_get_bank_codes` — list all Nigerian bank codes

### Value Added Services Tools
- `isw_validate_customer` — validate a customer account for a biller
- `isw_airtime_recharge` — top up a phone number
- `isw_pay_vas_bill` — pay a bill through VAS route

### Cardless / Paycode Tools
- `isw_create_paycode` — generate a cardless withdrawal code
- `isw_create_bulk_paycodes` — generate multiple paycodes
- `isw_get_paycode_status` — check if a paycode has been used
- `isw_deactivate_paycode` — cancel an unused paycode

### Card 360 Tools
- `isw_create_card` — provision a new Verve card
- `isw_block_card` — immediately block a card
- `isw_unblock_card` — unblock a card
- `isw_change_card_pin` — change card PIN (handles encryption internally)
- `isw_get_card_balance` — get prepaid or debit card balance
- `isw_fetch_card` — get card details by PAN
- `isw_fetch_cards_by_account` — get all cards linked to an account
- `isw_validate_card` — validate card CVV and expiry
- `isw_link_card_to_account` — link an issued card to a bank account

### Transaction Search Tools
- `isw_quick_search` — search transactions by amount/terminal/date
- `isw_reference_search` — search by transaction reference
- `isw_bulk_search` — search multiple references at once
- `isw_get_transaction_details` — get full detail for a transaction ID

### Lending Tools
- `isw_request_nano_loan` — initiate a nano loan for a customer
- `isw_get_customer_demographics` — pull customer demographic profile
- `isw_get_financial_history` — pull spend history for a customer
- `isw_get_financial_habits` — pull recurring financial behaviour

### Transfer Service Tools
- `isw_credit_inquiry` — inquire before a bank credit
- `isw_complete_credit` — complete a credit with OTP
- `isw_requery_transfer` — poll for transfer completion

### Utility / Reference Resources
- MCP Resource: `isw://response-codes` — returns the full response code reference table

---

## Part 8: Amount Handling — `src/utils/amount-helpers.ts`

```typescript
export const formatAmount = {
  // Agents work in Naira. API takes kobo.
  toKobo: (naira: number): number => Math.round(naira * 100),
  toNaira: (kobo: number): number => kobo / 100,
  formatNaira: (kobo: number): string => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
};
```

**Rule:** Every tool that takes an amount field accepts **Naira** in its schema and converts to kobo internally. Document this in every tool's description string. Agents must never need to know about kobo.

---

## Part 9: Error Handling — `src/utils/error-handler.ts`

```typescript
export class InterswitchError extends Error {
  constructor(
    public readonly responseCode: string,
    public readonly responseDescription: string,
    public readonly httpStatus: number,
    public readonly raw?: unknown,
  ) {
    super(`ISW ${responseCode}: ${responseDescription}`);
  }

  get isRetryable(): boolean {
    return ['01', '91', '96'].includes(this.responseCode);
  }

  toMcpContent() {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: true,
          responseCode: this.responseCode,
          description: this.responseDescription,
          retryable: this.isRetryable,
          suggestion: this.getSuggestion(),
        }, null, 2),
      }],
      isError: true,
    };
  }

  private getSuggestion(): string {
    const suggestions: Record<string, string> = {
      '01': 'Transaction is pending. Poll isw_get_transaction_status in 10-30 seconds.',
      '51': 'Customer has insufficient funds.',
      '54': 'Card is expired. Ask customer to use a different card.',
      '91': 'Interswitch switch is temporarily unreachable. Retry in 30 seconds.',
    };
    return suggestions[this.responseCode] ?? 'Check the response code reference at isw://response-codes';
  }
}
```

Wrap every API call handler in a try/catch. Never let Axios errors propagate as unhandled — always convert to `InterswitchError` and call `.toMcpContent()`.

---

## Part 10: Security Requirements

1. **No live keys in sandbox mode.** At startup, if `INTERSWITCH_ENV=sandbox`, reject any credential that looks like a production key.

2. **No PAN logging.** Card PANs (card numbers) must be masked in logs: `411111XXXXXX1111`. Add a log sanitizer that detects and masks 13-19 digit numeric strings.

3. **PIN never logged.** Any parameter named `pin`, `encryptedPin`, `oldPin`, `newPin` must be excluded from request/response logs.

4. **No secret in tool responses.** Token values, secrets, and keys must never appear in MCP tool response content.

5. **Request signing (if required by Interswitch).** Some Interswitch endpoints require an `Authorization` header with an HMAC-SHA256 signature. Implement in `base-client.ts` as optional per-request config.

---

## Part 11: The `src/index.ts` Entry Point

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import all tool definitions and handlers
import { initializePaymentTool, handleInitializePayment } from './tools/payments/initialize-payment.js';
// ... all other tools

const server = new Server(
  { name: 'interswitch-mcp-server', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } },
);

const tools = [
  initializePaymentTool,
  // ... all others
];

const handlers: Record<string, (args: unknown) => Promise<unknown>> = {
  isw_initialize_payment: handleInitializePayment,
  // ... all others
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const handler = handlers[request.params.name];
  if (!handler) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  return handler(request.params.arguments);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Part 12: README Content (Exact Sections to Include)

The README must cover:

1. **What this is** — one paragraph explaining this is the first Interswitch MCP server
2. **Quick Start** — clone, install, build, configure `.env`, run
3. **Environment variables table** — all vars with required/optional and description
4. **Client configuration** — how to add to Claude Desktop, Cursor, Windsurf (show the JSON config block)
5. **Tool reference** — table with `tool name | what it does | key inputs`
6. **API coverage table** — which Interswitch domains are implemented vs planned
7. **Security note** — never use production credentials in testing, PAN/PIN masking
8. **Limitations** — sandbox only in v0.1; Card 360 PIN encryption requires you to configure RSA key
9. **Contributing guide** — link to `CONTRIBUTING.md`
10. **License** — MIT

---

## Part 13: Code Quality Tracks (Apply After Initial Build)

After the full implementation exists, apply the following 8 cleanup tracks exactly as described in the original system prompt. Here is how each track maps to this codebase:

**Track 1 — Deduplicate:** The three token manager classes will have near-identical structure. Extract a `BaseTokenManager` abstract class and have each extend it with only the credential difference.

**Track 2 — Consolidate Types:** `PaymentResponse`, `TransferResponse`, and `VASResponse` all share `responseCode`, `responseDescription`, `transactionRef`. Extract a `BaseInterswitchResponse` interface in `common.types.ts`.

**Track 3 — Unused Code:** Run `npx knip` after implementation. Any tool stub not yet connected to a handler is dead code — remove or implement before merge.

**Track 4 — Circular Dependencies:** Run `npx madge --circular src/`. The most likely cycle is `config.ts` ↔ token managers. Break by passing config as constructor args rather than importing globally.

**Track 5 — Typing:** Replace any `axios.AxiosResponse<any>` with typed generics. Every API response must be typed. The handler argument `args: unknown` is correct — do not weaken it to `any`.

**Track 6 — Error Handling:** Every `try/catch` in a tool handler must do something meaningful — log the error, convert to `InterswitchError`, and return `.toMcpContent()`. Remove any catch block that only `console.log`s and re-throws without enrichment.

**Track 7 — Dead Paths:** If a biller or endpoint is documented but not yet active in sandbox, mark it with a `// STATUS: not yet available in sandbox` comment. Do not delete — Interswitch may activate it.

**Track 8 — Comments:** Every tool file gets a single block comment at the top explaining what the tool does and which Interswitch doc page it implements. No comments that say "this function calls the API" — those are noise. Comments must explain *why*, not *what*.

---

## Part 14: Testing Strategy

**Unit tests** (use Nock to mock HTTP):
- Token manager: test cache hit, cache miss, refresh before expiry, 401 retry
- Amount helpers: `toKobo(100)` → `10000`, `toNaira(10000)` → `100`
- Error handler: `responseCode=01` → `isRetryable=true`, `responseCode=00` → no error
- PIN encryption: output is a valid hex string, never equals plaintext PIN

**Integration tests** (against ISW sandbox — require real credentials in CI):
- `isw_initialize_payment` → returns a URL containing `interswitchng.com`
- `isw_get_bank_codes` → returns an array with at least one entry containing `bankCode` and `bankName`
- `isw_get_billers` → returns categories array

**Test env isolation:** All unit tests use Nock and must work offline. Never make real HTTP calls in unit tests.

---

## Part 15: `package.json` Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "mocha",
    "test:unit": "mocha test/unit/**/*.test.ts",
    "test:integration": "mocha test/integration/**/*.test.ts",
    "lint": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

---

## Part 16: Validation Commands (Run After Each Track)

After each code quality track:
```bash
npm run lint          # TypeScript type check — zero errors required
npm run test:unit     # All unit tests pass
npm run build         # Build succeeds — no TS compile errors
```

After all tracks:
```bash
npm run test          # Full test suite
npx knip              # Zero unused exports (or document exceptions)
npx madge --circular src/  # Zero circular dependencies
npm run build         # Final clean build
```

---

## Part 17: Constraints and Gotchas

1. **Amounts in kobo everywhere.** Every single Interswitch payment API uses kobo. The only place naira appears is in your tool input schemas and formatted output strings.

2. **Transaction references must be unique.** If an agent reuses a transactionRef, Interswitch will either reject or return the original transaction. Warn about this in tool descriptions.

3. **Sandbox and production have different base URLs.** The `config.ts` must select the right URL. Never hardcode URLs in tool files.

4. **Card 360 is behind separate credentials.** A developer might have main API credentials but not Card 360 credentials. The server should still start and expose non-Card-360 tools; Card 360 tools should fail gracefully at invocation time with a clear message if those credentials are missing.

5. **The Transaction Search service uses a different auth token.** Its token endpoint is a GET, not a POST. This is unusual — document it clearly in `transaction-search-token.ts`.

6. **Interswitch API responses for success often use `responseCode: "00"` inside a 200 HTTP response.** Never assume HTTP 200 = success. Always check `responseCode`.

7. **Polling is sometimes required.** For transfers and some payments, the initial response may be `responseCode: "01"` (pending). Tool descriptions must tell agents to poll `isw_get_transaction_status` or `isw_requery_transfer` after a delay.

8. **Bulk operations have size limits.** Interswitch bulk transfer and bulk paycode endpoints typically have a max of 100 items per request. Validate this in the Zod schema with `.max(100)` on the array.

---

## Final Output Checklist

When the agent has completed implementation, verify:

- [ ] All 40+ tools are registered and return valid MCP content shapes
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test:unit` passes with zero failures
- [ ] `npm run lint` passes
- [ ] `npx madge --circular src/` reports no cycles
- [ ] `.env.example` is complete and accurate
- [ ] `README.md` covers all 10 required sections
- [ ] No hardcoded credentials, URLs, or secrets anywhere outside `config.ts`
- [ ] All amount fields accept Naira and convert to kobo internally
- [ ] All tool names are prefixed `isw_`
- [ ] Card 360 tools fail gracefully when Card360 credentials are missing
- [ ] PIN encryption uses `node-forge` 3DES — no plaintext PINs in logs or responses
