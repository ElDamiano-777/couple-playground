import { test, expect } from '@playwright/test';
import { recognizeVisibleText } from '../src/shared/productRecognition';

test('recognizes clear product text from a photo or screenshot', () => {
  expect(recognizeVisibleText('LAVAZZA CREMA E AROMA COFFEE 1 kg')).toMatchObject({
    brand: 'Lavazza', name: 'Coffee', flavor: 'Crema E Aroma', quantity: '1 kg',
  });
  expect(recognizeVisibleText('unreadable packaging')).toEqual({ name: '', brand: '', flavor: '', size: '', quantity: '', notes: '' });
  expect(recognizeVisibleText('GÜNSTIG\nPUTENWURST\n200 g')).toMatchObject({ name: 'Putenwurst', quantity: '200 g' });
});
