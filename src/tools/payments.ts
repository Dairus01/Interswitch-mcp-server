/**
 * Accept Payments / Quickteller Business tools from INTERSWITCH_MCP_SKILL.md Domain 1.
 * Sandbox behavior depends on configured merchant/payable codes and does not call Interswitch until a tool is invoked.
 */
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RegisteredTool } from '../types/tool.js';
import { config, requireConfigValue } from '../config/config.js';
import { paymentsClient } from '../clients/payments-client.js';
import { resolveKoboAmount } from '../utils/amount.js';
import { requireWriteConfirmation } from '../utils/confirmation.js';
import { errorResponse } from '../utils/errors.js';
import { jsonContent, normalizedContent } from '../utils/mcp.js';
import { normalizeResponse } from '../utils/normalizer.js';
import { amountProperties, confirmProperty } from './schemas.js';

const InitializePaymentSchema = z.object({
  amountNaira: z.number().positive().optional(),
  amountKobo: z.number().int().positive().optional(),
  merchantCode: z.string().optional(),
  payableCode: z.string().optional(),
  customerId: z.string(),
  transactionRef: z.string(),
  redirectUrl: z.string().url(),
  currencyCode: z.number().default(566),
  confirm: z.boolean().optional(),
  extra: z.record(z.unknown()).optional(),
});
const PaymentLinkSchema = z.object({
  amountNaira: z.number().positive().optional(),
  amountKobo: z.number().int().positive().optional(),
  merchantCode: z.string().optional(),
  payableCode: z.string().optional(),
  expiryDate: z.string(),
  confirm: z.boolean().optional(),
  extra: z.record(z.unknown()).optional(),
});
const RefundSchema = z.object({
  transactionRef: z.string(),
  refundRef: z.string().optional(),
  reason: z.string().optional(),
  amountNaira: z.number().positive().optional(),
  amountKobo: z.number().int().positive().optional(),
  merchantCode: z.string().optional(),
  confirm: z.boolean().optional(),
  extra: z.record(z.unknown()).optional(),
});
const BillPaymentSchema = z.object({
  amountNaira: z.number().positive().optional(),
  amountKobo: z.number().int().positive().optional(),
  merchantCode: z.string().optional(),
  payableCode: z.string().optional(),
  customerId: z.string(),
  transactionRef: z.string(),
  confirm: z.boolean().optional(),
  extra: z.record(z.unknown()).optional(),
});
const TransactionRefSchema = z.object({ transactionRef: z.string() });
const RefundStatusSchema = z.object({ refundRef: z.string() });
const BillerPackagesSchema = z.object({ billerId: z.string() });
const GetBillersSchema = z.object({ categoryId: z.string().optional() });

async function runTool(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return normalizedContent(normalizeResponse(await fn()));
  } catch (error) {
    return jsonContent(errorResponse(error), true);
  }
}

async function initializePayment(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = InitializePaymentSchema.parse(args);
    requireWriteConfirmation('isw_initialize_payment', params, 'write', 'medium');
    return paymentsClient.post('/api/v2/purchases', {
      merchantCode: params.merchantCode ?? requireConfigValue(config.core.merchantCode, 'INTERSWITCH_MERCHANT_CODE'),
      payableCode: params.payableCode ?? requireConfigValue(config.core.payableCode, 'INTERSWITCH_PAYABLE_CODE'),
      amount: resolveKoboAmount(params),
      customerId: params.customerId,
      transactionRef: params.transactionRef,
      redirectUrl: params.redirectUrl,
      currencyCode: params.currencyCode,
      ...params.extra,
    });
  });
}

async function getTransactionStatus(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = TransactionRefSchema.parse(args);
    return paymentsClient.get(`/api/v2/purchases/${encodeURIComponent(params.transactionRef)}`);
  });
}

async function getTransactionByReference(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = TransactionRefSchema.parse(args);
    return paymentsClient.get('/api/v2/purchases', { query: { transactionRef: params.transactionRef } });
  });
}

async function createPaymentLink(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = PaymentLinkSchema.parse(args);
    requireWriteConfirmation('isw_create_payment_link', params, 'write', 'medium');
    return paymentsClient.post('/api/v2/purchasecode', {
      merchantCode: params.merchantCode ?? requireConfigValue(config.core.merchantCode, 'INTERSWITCH_MERCHANT_CODE'),
      payableCode: params.payableCode ?? requireConfigValue(config.core.payableCode, 'INTERSWITCH_PAYABLE_CODE'),
      amount: resolveKoboAmount(params),
      expiryDate: params.expiryDate,
      ...params.extra,
    });
  });
}

async function initiateRefund(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = RefundSchema.parse(args);
    requireWriteConfirmation('isw_initiate_refund', params, 'write', 'high');
    return paymentsClient.post('/api/v2/refunds', {
      transactionRef: params.transactionRef,
      refundRef: params.refundRef,
      reason: params.reason,
      merchantCode: params.merchantCode ?? requireConfigValue(config.core.merchantCode, 'INTERSWITCH_MERCHANT_CODE'),
      amount: params.amountNaira !== undefined || params.amountKobo !== undefined ? resolveKoboAmount(params) : undefined,
      ...params.extra,
    });
  });
}

async function getRefundStatus(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = RefundStatusSchema.parse(args);
    return paymentsClient.get(`/api/v2/refunds/${encodeURIComponent(params.refundRef)}`);
  });
}

async function payBill(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = BillPaymentSchema.parse(args);
    requireWriteConfirmation('isw_pay_bill', params, 'write', 'medium');
    return paymentsClient.post('/api/v2/purchases', {
      merchantCode: params.merchantCode ?? requireConfigValue(config.core.merchantCode, 'INTERSWITCH_MERCHANT_CODE'),
      payableCode: params.payableCode ?? requireConfigValue(config.core.payableCode, 'INTERSWITCH_PAYABLE_CODE'),
      amount: resolveKoboAmount(params),
      customerId: params.customerId,
      transactionRef: params.transactionRef,
      ...params.extra,
    });
  });
}

async function getBillers(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = GetBillersSchema.parse(args ?? {});
    return paymentsClient.get('/api/v2/quickteller/categorys', { query: params.categoryId ? { categoryId: params.categoryId } : undefined });
  });
}

async function getBillerPackages(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = BillerPackagesSchema.parse(args);
    return paymentsClient.get(`/api/v2/quickteller/billers/${encodeURIComponent(params.billerId)}/packages`);
  });
}

export const tools: RegisteredTool[] = [
  {
    definition: { name: 'isw_initialize_payment', description: 'Initialize a Quickteller payment. Provide amountNaira or amountKobo explicitly; endpoint receives kobo. Requires confirm: true.', inputSchema: { type: 'object', properties: { ...amountProperties, merchantCode: { type: 'string' }, payableCode: { type: 'string' }, customerId: { type: 'string' }, transactionRef: { type: 'string' }, redirectUrl: { type: 'string' }, currencyCode: { type: 'number', default: 566 }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['customerId', 'transactionRef', 'redirectUrl'] } },
    mode: 'write',
    risk: 'medium',
    handler: initializePayment,
  },
  { definition: { name: 'isw_get_transaction_status', description: 'Get Quickteller transaction status by transactionRef.', inputSchema: { type: 'object', properties: { transactionRef: { type: 'string' } }, required: ['transactionRef'] } }, mode: 'read', risk: 'low', handler: getTransactionStatus },
  { definition: { name: 'isw_get_transaction_by_reference', description: 'Get Quickteller transaction by transactionRef query.', inputSchema: { type: 'object', properties: { transactionRef: { type: 'string' } }, required: ['transactionRef'] } }, mode: 'read', risk: 'low', handler: getTransactionByReference },
  { definition: { name: 'isw_create_payment_link', description: 'Create a shareable payment link. Provide amountNaira or amountKobo explicitly; endpoint receives kobo. Requires confirm: true.', inputSchema: { type: 'object', properties: { ...amountProperties, merchantCode: { type: 'string' }, payableCode: { type: 'string' }, expiryDate: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['expiryDate'] } }, mode: 'write', risk: 'medium', handler: createPaymentLink },
  { definition: { name: 'isw_initiate_refund', description: 'Initiate a refund for a settled transaction. High-risk write operation; requires confirm: true.', inputSchema: { type: 'object', properties: { transactionRef: { type: 'string' }, refundRef: { type: 'string' }, reason: { type: 'string' }, ...amountProperties, merchantCode: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['transactionRef'] } }, mode: 'write', risk: 'high', handler: initiateRefund },
  { definition: { name: 'isw_get_refund_status', description: 'Get refund status by refundRef.', inputSchema: { type: 'object', properties: { refundRef: { type: 'string' } }, required: ['refundRef'] } }, mode: 'read', risk: 'low', handler: getRefundStatus },
  { definition: { name: 'isw_pay_bill', description: 'Pay a bill through the payment route. Provide amountNaira or amountKobo explicitly; endpoint receives kobo. Requires confirm: true.', inputSchema: { type: 'object', properties: { ...amountProperties, merchantCode: { type: 'string' }, payableCode: { type: 'string' }, customerId: { type: 'string' }, transactionRef: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['customerId', 'transactionRef'] } }, mode: 'write', risk: 'medium', handler: payBill },
  { definition: { name: 'isw_get_billers', description: 'List Quickteller billers, optionally filtered by categoryId.', inputSchema: { type: 'object', properties: { categoryId: { type: 'string' } } } }, mode: 'read', risk: 'low', handler: getBillers },
  { definition: { name: 'isw_get_biller_packages', description: 'List packages for a biller.', inputSchema: { type: 'object', properties: { billerId: { type: 'string' } }, required: ['billerId'] } }, mode: 'read', risk: 'low', handler: getBillerPackages },
];
