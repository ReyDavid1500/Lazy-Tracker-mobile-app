// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  userName: string;
  role: 'manager' | 'worker';
  businessId: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Scan ──────────────────────────────────────────────────────────────────

export interface ScanIdentification {
  name: string;
  brand: string | null;
  sku: string | null;
  description: string | null;
  rawNote: string;
}

export interface MatchedProduct {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  currentStock: number;
  lowStockThreshold: number;
}

export interface ScanResponse {
  identification: ScanIdentification;
  matchedProduct: MatchedProduct | null;
}

// ─── Stock ─────────────────────────────────────────────────────────────────

export interface RecordStockResponse {
  id: string;
  productId: string;
  quantity: number;
  alertFired: boolean;
  createdAt: string;
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export interface InventoryItem {
  productId: string;
  name: string;
  brand: string | null;
  sku: string | null;
  currentStock: number;
  lowStockThreshold: number;
  isLow: boolean;
}
