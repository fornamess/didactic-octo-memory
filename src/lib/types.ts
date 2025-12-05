// Интерфейсы для API responses (CQ-001)

// Auth API
export interface LoginResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    nickname?: string;
    firstName?: string;
    lastName?: string;
    balance?: number;
  };
}

export interface RegisterResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    nickname?: string;
    firstName?: string;
    lastName?: string;
  };
}

// Video API
export interface GenerateVideoResponse {
  success: boolean;
  taskId: number;
  introTaskId?: number;
  outroTaskId?: number;
  orderNumber: string;
  orderId: number;
  message: string;
  childName: string;
  tasks: Array<{ type: string; taskId?: number }>;
  universalVideosExist: {
    intro: boolean;
    outro: boolean;
  };
  balance: number;
}

export interface CheckStatusResponse {
  isCompleted: boolean;
  isFailed: boolean;
  videoUrl?: string;
  statusDescription?: string;
  error?: string;
  introReady?: boolean;
}

export interface VideoHistoryResponse {
  orders: Array<{
    id: number;
    orderNumber: string;
    childName: string;
    status: string;
    statusDescription?: string;
    taskId?: number;
    videoUrl?: string;
    createdAt: string;
  }>;
}

// Payment API
export interface CreatePaymentResponse {
  success: boolean;
  invoiceId: string;
  invoiceUrl: string;
  amount: number;
  paymentCurrencies: string[];
  message: string;
  isDemoMode: boolean;
}

// User API
export interface BalanceResponse {
  balance: number;
}

export interface TransactionsResponse {
  transactions: Array<{
    id: number;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
    invoiceId?: string;
    invoiceUrl?: string;
  }>;
}

// Admin API
export interface AdminCheckResponse {
  success: boolean;
  isAdmin: boolean;
}

export interface AdminUsersResponse {
  users: Array<{
    id: number;
    email: string;
    nickname?: string;
    firstName?: string;
    lastName?: string;
    balance: number;
    createdAt: string;
  }>;
}

export interface AdminSettingsResponse {
  settings: {
    email_verification_required: string;
    user_agreement_text?: string;
    contacts_text?: string;
  };
}

export interface AdminInvoicesResponse {
  invoices: Array<{
    id: number;
    userId: number;
    amount: number;
    currency: string;
    status: string;
    invoiceId: string;
    invoiceUrl: string;
    createdAt: string;
    paidAt?: string;
  }>;
}

// Bitbanker API
export interface BitbankerInvoiceResponse {
  result: 'success' | 'error';
  id?: string;
  link?: string;
  message?: string;
  code?: string;
}

// Error Response
export interface ErrorResponse {
  error: string;
}
