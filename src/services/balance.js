function getMonthKey(fecha) {
  if (!fecha) return null;
  const parts = fecha.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}`;
  return fecha.slice(0, 7);
}

function computeItemSplit(item) {
  const cost = item.precio * item.qty;
  const consumers = item.consumidores || [];
  const active = consumers.filter(Boolean);
  const count = active.length;

  if (item.shared || count >= 2) {
    const share = cost / count;
    const byConsumer = {};
    active.forEach(c => { byConsumer[c] = (byConsumer[c] || 0) + share; });
    return { cost, byConsumer };
  }

  if (count === 1) {
    return { cost, byConsumer: { [active[0]]: cost } };
  }

  return { cost: 0, byConsumer: {} };
}

export function computePurchaseDelta(purchase) {
  if (purchase.isSettlement) {
    const payer = purchase.quien;
    const total = purchase.total || 0;
    return {
      totalSpent: 0,
      byMember: {
        [payer]: { paid: total, shouldPay: 0, settlementsOut: total, settlementsIn: 0 }
      },
      byStore: {},
      byCategory: {}
    };
  }

  if (purchase.estado !== 'confirmada') return null;

  const delta = {
    totalSpent: 0,
    byMember: {},
    byStore: {},
    byCategory: {}
  };

  delta.totalSpent = purchase.total || 0;

  delta.byMember[purchase.quien] = {
    paid: purchase.total || 0,
    shouldPay: 0,
    settlementsOut: 0,
    settlementsIn: 0
  };

  (purchase.items || []).forEach(item => {
    const { byConsumer } = computeItemSplit(item);
    Object.entries(byConsumer).forEach(([uid, amount]) => {
      if (!delta.byMember[uid]) {
        delta.byMember[uid] = { paid: 0, shouldPay: 0, settlementsOut: 0, settlementsIn: 0 };
      }
      delta.byMember[uid].shouldPay += amount;
    });
  });

  return delta;
}

export function applyDelta(existing, yearMonth, delta) {
  if (!delta) return existing;

  const bal = { ...existing };
  const month = bal[yearMonth] || {
    totalSpent: 0,
    byMember: {},
    byStore: {},
    lastPurchaseDate: null
  };

  month.totalSpent = Math.round((month.totalSpent + delta.totalSpent) * 100) / 100;

  Object.entries(delta.byMember).forEach(([uid, values]) => {
    if (!month.byMember[uid]) {
      month.byMember[uid] = { paid: 0, shouldPay: 0, settlementsOut: 0, settlementsIn: 0 };
    }
    month.byMember[uid].paid = Math.round((month.byMember[uid].paid + values.paid) * 100) / 100;
    month.byMember[uid].shouldPay = Math.round((month.byMember[uid].shouldPay + values.shouldPay) * 100) / 100;
    month.byMember[uid].settlementsOut = Math.round((month.byMember[uid].settlementsOut + (values.settlementsOut || 0)) * 100) / 100;
    month.byMember[uid].settlementsIn = Math.round((month.byMember[uid].settlementsIn + (values.settlementsIn || 0)) * 100) / 100;
  });

  month.lastPurchaseDate = new Date().toISOString().slice(0, 10);

  bal[yearMonth] = month;
  return bal;
}

export function computeFullBalanceFromPurchases(purchases, members) {
  const totals = {};
  members.forEach(uid => {
    totals[uid] = { paid: 0, shouldPay: 0, settlementsIn: 0, settlementsOut: 0 };
  });

  purchases.forEach(p => {
    const delta = computePurchaseDelta(p);
    if (!delta) return;
    Object.entries(delta.byMember).forEach(([uid, values]) => {
      if (!totals[uid]) return;
      totals[uid].paid += values.paid;
      totals[uid].shouldPay += values.shouldPay;
      totals[uid].settlementsOut += values.settlementsOut || 0;
      totals[uid].settlementsIn += values.settlementsIn || 0;
    });
  });

  return totals;
}

export function computeNetBalance(totals, currentUid, members) {
  const memberBalances = {};
  members.forEach(uid => {
    const t = totals[uid] || { paid: 0, shouldPay: 0, settlementsIn: 0, settlementsOut: 0 };
    memberBalances[uid] = {
      paid: Math.round(t.paid),
      shouldPay: Math.round(t.shouldPay),
      settlementsIn: Math.round(t.settlementsIn),
      settlementsOut: Math.round(t.settlementsOut),
      net: Math.round(t.paid - t.shouldPay + t.settlementsIn - t.settlementsOut)
    };
  });

  let netAmount = 0;
  let fromUser = null;
  let toUser = null;

  if (currentUid && memberBalances[currentUid]) {
    const currentNet = memberBalances[currentUid].net;
    if (currentNet < 0) {
      netAmount = -currentNet;
      fromUser = currentUid;
      toUser = members.find(uid => uid !== currentUid && memberBalances[uid]?.net > 0) || members.find(uid => uid !== currentUid);
    } else if (currentNet > 0) {
      netAmount = currentNet;
      fromUser = members.find(uid => uid !== currentUid && memberBalances[uid]?.net < 0) || members.find(uid => uid !== currentUid);
      toUser = currentUid;
    }
  }

  if (!fromUser && members.length >= 2) {
    const first = members[0];
    const second = members[1];
    const firstNet = memberBalances[first]?.net || 0;
    if (firstNet < 0) { fromUser = first; toUser = second; netAmount = -firstNet; }
    else if (firstNet > 0) { fromUser = second; toUser = first; netAmount = firstNet; }
  }

  return { net: { fromUser, toUser, amount: netAmount }, memberBalances };
}
