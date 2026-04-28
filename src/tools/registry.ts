import type { RegisteredTool } from '../types/tool.js';
import { tools as paymentTools } from './payments.js';
import { tools as vasTools } from './vas.js';
import { tools as transferTools } from './transfers.js';
import { tools as cardlessTools } from './cardless.js';
import { tools as transactionSearchTools } from './transaction-search.js';
import { tools as card360Tools } from './card360.js';
import { tools as lendingTools } from './lending.js';
import { tools as transferServiceTools } from './transfer-service.js';
import { tools as payoutTools } from './payouts.js';
import { tools as fintechTools } from './fintech-card-processing.js';
import { tools as agencyTools } from './agency.js';

export const registeredTools: RegisteredTool[] = [
  ...paymentTools,
  ...vasTools,
  ...transferTools,
  ...cardlessTools,
  ...transactionSearchTools,
  ...card360Tools,
  ...lendingTools,
  ...transferServiceTools,
  ...payoutTools,
  ...fintechTools,
  ...agencyTools,
];

export const toolHandlers = Object.fromEntries(registeredTools.map((tool) => [tool.definition.name, tool.handler]));
