import { describe, it, expect } from 'vitest';
import { calculatePackagePrice } from '../utils/packageUtils';

describe('Package Utilities', () => {
  const mockServices = [
    { id: '1', selling_price: 100 },
    { id: '2', selling_price: 200 },
  ];

  describe('calculatePackagePrice', () => {
    it('should calculate total price without discount', () => {
      const selectedServices = ['1', '2'];
      const discountType = 'none';
      const discountValue = 0;

      const price = calculatePackagePrice(selectedServices, mockServices, discountType, discountValue);
      expect(price).toBe(300);
    });

    it('should apply percentage discount correctly', () => {
      const selectedServices = ['1', '2'];
      const discountType = 'percentage';
      const discountValue = 10;

      const price = calculatePackagePrice(selectedServices, mockServices, discountType, discountValue);
      expect(price).toBe(270); // 300 - 10%
    });

    it('should apply fixed discount correctly', () => {
      const selectedServices = ['1', '2'];
      const discountType = 'fixed';
      const discountValue = 50;

      const price = calculatePackagePrice(selectedServices, mockServices, discountType, discountValue);
      expect(price).toBe(250); // 300 - 50
    });

    it('should not allow negative prices', () => {
      const selectedServices = ['1'];
      const discountType = 'fixed';
      const discountValue = 150;

      const price = calculatePackagePrice(selectedServices, mockServices, discountType, discountValue);
      expect(price).toBe(0);
    });

    it('should handle empty service selection', () => {
      const selectedServices: string[] = [];
      const discountType = 'none';
      const discountValue = 0;

      const price = calculatePackagePrice(selectedServices, mockServices, discountType, discountValue);
      expect(price).toBe(0);
    });
  });
});