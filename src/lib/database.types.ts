// ============================================================================
// LOWKEY — Database Types
// Generated types for Supabase tables
// ============================================================================

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string;
          created_at: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          customer_address: string;
          items: OrderItem[];
          subtotal: number;
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      subscribers: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          source: string;
        };
        Insert: Omit<Database['public']['Tables']['subscribers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subscribers']['Insert']>;
      };
    };
  };
}

export interface OrderItem {
  slug: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

export interface Order {
  id?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
}

export interface Subscriber {
  email: string;
  source: string;
}
