/**
 * Official Integration SDK Client for operational systems (e.g. gpcl-production)
 * to communicate with gpcl-finance-service.
 *
 * This client provides strongly typed methods to dispatch journal events,
 * create customer invoices, process payments, and check AR credit limits.
 */

export interface IntegrationClientConfig {
  baseUrl: string;
  authToken: string;
}

export class FinanceServiceClient {
  private baseUrl: string;
  private token: string;

  constructor(config: IntegrationClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.authToken;
  }

  private async request<T>(endpoint: string, method = 'GET', body?: any): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'Idempotency-Key': `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Finance Service request failed with status ${res.status}`);
    }
    return data as T;
  }

  /** Dispatch an operational transaction to post to the General Ledger. */
  async postJournalEvent(event: {
    sourceModule: 'STORE_GRN' | 'STORE_ADJUSTMENT' | 'JOB_COMPLETION' | 'GAZETTE' | 'CASHIER';
    sourceId: string | number;
    description: string;
    lines: Array<{ accountCode: string; description?: string; debit?: number; credit?: number }>;
    postedBy: number;
    entryDate?: string;
    reference?: string;
  }) {
    return this.request('/api/v1/journals/events', 'POST', event);
  }

  /** Create a customer invoice with Ghana statutory levies (15% VAT, 2.5% NHIS, 2.5% GETFund). */
  async createInvoice(invoice: {
    clientId: number;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    invoiceDate?: string;
    dueDate?: string;
    postedBy: number;
    applyGhanaLevies?: boolean;
  }) {
    return this.request('/api/v1/invoices', 'POST', invoice);
  }

  /** Process a customer payment receipt & settle open invoices. */
  async processPayment(payment: {
    clientId: number;
    amount: number;
    paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'MOMO';
    invoiceId?: number;
    reference?: string;
    postedBy: number;
  }) {
    return this.request('/api/v1/payments', 'POST', payment);
  }

  /** Query customer credit exposure & remaining credit limit. */
  async getClientCreditExposure(clientId: number) {
    return this.request<{
      status: string;
      clientId: number;
      creditLimit: number | null;
      outstandingAR: number;
      unappliedCredits: number;
      netExposure: number;
      availableCredit: number | null;
      isUnlimited: boolean;
    }>(`/api/v1/clients/${clientId}/credit-exposure`, 'GET');
  }
}
