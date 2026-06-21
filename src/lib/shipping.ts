// ============================================================================
// LOWKEY — Shipping Configuration
// ============================================================================

export interface ShippingOption {
  id: string;
  label: string;
  labelAr: string;
  price: number;
  estimate: string;
}

// Dynamic shipping — reads from CMS settings if available
function getSettingsPrice(key: string, fallback: number): number {
  try {
    const s = localStorage.getItem('lowkey-cms');
    if (s) {
      const cms = JSON.parse(s);
      const val = cms[key];
      if (val !== undefined && val !== '') return parseInt(val, 10) || 0;
    }
  } catch { /* ignore */ }
  return fallback;
}

export function getShippingOptions(): ShippingOption[] {
  return [
    {
      id: 'portsaid',
      label: 'Port Said (Local)',
      labelAr: 'بورسعيد',
      price: getSettingsPrice('shipping_portsaid', 0),
      estimate: '1-2 days',
    },
    {
      id: 'cairo',
      label: 'Cairo & Giza',
      labelAr: 'القاهرة والجيزة',
      price: getSettingsPrice('shipping_cairo', 60),
      estimate: '2-3 days',
    },
    {
      id: 'alex',
      label: 'Alexandria',
      labelAr: 'الإسكندرية',
      price: getSettingsPrice('shipping_alex', 60),
      estimate: '2-3 days',
    },
    {
      id: 'egypt',
      label: 'Rest of Egypt',
      labelAr: 'باقي المحافظات',
      price: getSettingsPrice('shipping_other', 80),
      estimate: '3-5 days',
    },
  ];
}

// Keep backward compat
export const shippingOptions = getShippingOptions();

export function getShippingOption(id: string): ShippingOption | undefined {
  return shippingOptions.find(o => o.id === id);
}
