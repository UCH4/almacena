import { describe, it, expect } from 'vitest';
import {
  computePurchaseDelta,
  applyDelta,
  computeFullBalanceFromPurchases,
  computeNetBalance
} from '../balance';

const makePurchase = (overrides = {}) => ({
  id: 'test-1',
  fecha: '15/06/2026',
  comercio: 'Test',
  quien: 'uid-1',
  total: 1000,
  estado: 'confirmada',
  items: [
    { nombre: 'Item compartido', qty: 2, unit: 'un', precio: 300, consumidores: ['uid-1', 'uid-2'], shared: true },
    { nombre: 'Item exclusivo', qty: 1, unit: 'un', precio: 400, consumidores: ['uid-1'], shared: false }
  ],
  ...overrides
});

const uid1 = 'uid-1';
const uid2 = 'uid-2';
const members = [uid1, uid2];

describe('computePurchaseDelta', () => {
  it('calcula delta para compra confirmada', () => {
    const delta = computePurchaseDelta(makePurchase());
    expect(delta.totalSpent).toBe(1000);
    expect(delta.byMember[uid1].paid).toBe(1000);
    expect(delta.byMember[uid1].shouldPay).toBe(700);
    expect(delta.byMember[uid2].shouldPay).toBe(300);
  });

  it('devuelve null para compra pendiente', () => {
    expect(computePurchaseDelta(makePurchase({ estado: 'pendiente' }))).toBeNull();
  });

  it('maneja settlement', () => {
    const delta = computePurchaseDelta({
      isSettlement: true,
      quien: uid1,
      total: 500,
      items: []
    });
    expect(delta.totalSpent).toBe(0);
    expect(delta.byMember[uid1].settlementsOut).toBe(500);
    expect(delta.byMember[uid1].paid).toBe(500);
  });

  it('maneja items sin consumidores', () => {
    const delta = computePurchaseDelta(makePurchase({
      items: [{ nombre: 'Test', qty: 1, unit: 'un', precio: 100, consumidores: [], shared: false }]
    }));
    expect(delta.byMember[uid1].shouldPay).toBe(0);
  });

  it('divide compartido entre N consumidores', () => {
    const delta = computePurchaseDelta(makePurchase({
      items: [{ nombre: 'Test', qty: 1, unit: 'un', precio: 300, consumidores: ['uid-1', 'uid-2', 'uid-3'], shared: true }]
    }));
    expect(delta.byMember['uid-1'].shouldPay).toBe(100);
    expect(delta.byMember['uid-2'].shouldPay).toBe(100);
    expect(delta.byMember['uid-3'].shouldPay).toBe(100);
  });
});

describe('applyDelta', () => {
  it('mergea delta en monthlyBalances vacío', () => {
    const delta = computePurchaseDelta(makePurchase());
    const result = applyDelta({}, '2026-06', delta);
    expect(result['2026-06'].totalSpent).toBe(1000);
    expect(result['2026-06'].byMember[uid1].paid).toBe(1000);
  });

  it('acumula en mes existente', () => {
    const existing = {
      '2026-06': {
        totalSpent: 500,
        byMember: { [uid1]: { paid: 500, shouldPay: 200, settlementsOut: 0, settlementsIn: 0 } }
      }
    };
    const delta = computePurchaseDelta(makePurchase());
    const result = applyDelta(existing, '2026-06', delta);
    expect(result['2026-06'].totalSpent).toBe(1500);
    expect(result['2026-06'].byMember[uid1].paid).toBe(1500);
  });
});

describe('computeFullBalanceFromPurchases', () => {
  it('calcula totals de multiple compras', () => {
    const purchases = [
      makePurchase({ quien: uid1, total: 1000, items: [
        { nombre: 'A', qty: 1, unit: 'un', precio: 1000, consumidores: [uid1, uid2], shared: true }
      ]}),
      makePurchase({ quien: uid2, total: 500, items: [
        { nombre: 'B', qty: 1, unit: 'un', precio: 500, consumidores: [uid2], shared: false }
      ]})
    ];
    const totals = computeFullBalanceFromPurchases(purchases, members);
    expect(totals[uid1].paid).toBe(1000);
    expect(totals[uid1].shouldPay).toBe(500);
    expect(totals[uid2].paid).toBe(500);
    expect(totals[uid2].shouldPay).toBe(1000);
  });

  it('ignora compras pendientes', () => {
    const purchases = [
      makePurchase({ estado: 'pendiente', quien: uid1, total: 5000 })
    ];
    const totals = computeFullBalanceFromPurchases(purchases, members);
    expect(totals[uid1].paid).toBe(0);
  });
});

describe('computeNetBalance', () => {
  it('calcula quien le debe a quien', () => {
    const totals = {
      [uid1]: { paid: 1000, shouldPay: 700, settlementsIn: 0, settlementsOut: 0 },
      [uid2]: { paid: 500, shouldPay: 800, settlementsIn: 0, settlementsOut: 0 }
    };
    const result = computeNetBalance(totals, uid1, members);
    expect(result.net.fromUser).toBe(uid2);
    expect(result.net.toUser).toBe(uid1);
    expect(result.net.amount).toBe(300);
    expect(result.memberBalances[uid1].net).toBe(300);
    expect(result.memberBalances[uid2].net).toBe(-300);
  });

  it('devuelve amount 0 cuando están al día', () => {
    const totals = {
      [uid1]: { paid: 500, shouldPay: 500, settlementsIn: 0, settlementsOut: 0 },
      [uid2]: { paid: 500, shouldPay: 500, settlementsIn: 0, settlementsOut: 0 }
    };
    const result = computeNetBalance(totals, uid1, members);
    expect(result.net.amount).toBe(0);
  });

  it('maneja 3 miembros', () => {
    const uid3 = 'uid-3';
    const totals = {
      [uid1]: { paid: 900, shouldPay: 500, settlementsIn: 0, settlementsOut: 0 },
      [uid2]: { paid: 300, shouldPay: 500, settlementsIn: 0, settlementsOut: 0 },
      [uid3]: { paid: 300, shouldPay: 500, settlementsIn: 0, settlementsOut: 0 }
    };
    const result = computeNetBalance(totals, uid1, [uid1, uid2, uid3]);
    expect(result.net.fromUser).toBeTruthy();
    expect(result.net.toUser).toBeTruthy();
    expect(result.memberBalances[uid1].net).toBe(400);
  });
});
