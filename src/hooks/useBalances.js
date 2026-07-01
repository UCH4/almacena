import { useState, useEffect } from 'react';
import { computeFullBalanceFromPurchases, computeNetBalance } from '../services/balance';

export function useBalances(house, purchases, currentUid) {
  const [balances, setBalances] = useState({
    net: { fromUser: 'S', toUser: 'T', amount: 0, formattedAmount: '$0', fromName: '', toName: '' },
    summary: { currentPaid: 0, currentShouldPay: 0, otherPaid: 0, otherShouldPay: 0 },
    members: []
  });

  useEffect(() => {
    if (!house) return;

    const members = house.members || [];
    const membersInfo = house.membersInfo || {};
    const monthlyBalances = house.monthlyBalances || {};

    const reduceMonthlyBalance = (mb) => {
      const totals = {};
      members.forEach(uid => { totals[uid] = { paid: 0, shouldPay: 0, settlementsIn: 0, settlementsOut: 0 }; });
      Object.values(mb).forEach(month => {
        Object.entries(month.byMember || {}).forEach(([uid, v]) => {
          if (!totals[uid]) return;
          totals[uid].paid += v.paid || 0;
          totals[uid].shouldPay += v.shouldPay || 0;
          totals[uid].settlementsOut += v.settlementsOut || 0;
          totals[uid].settlementsIn += v.settlementsIn || 0;
        });
      });
      return totals;
    };

    let totals;
    if (Object.keys(monthlyBalances).length > 0) {
      totals = reduceMonthlyBalance(monthlyBalances);
    } else {
      totals = computeFullBalanceFromPurchases(purchases, members);
    }

    const { net, memberBalances } = computeNetBalance(totals, currentUid, members);
    const currentNet = currentUid && memberBalances[currentUid] ? currentUid : null;
    const otherUid = members.find(uid => uid !== currentNet);
    const currentBalance = currentNet ? memberBalances[currentNet] : null;
    const otherBalance = otherUid ? memberBalances[otherUid] : null;

    setBalances({
      net: {
        fromUser: net.fromUser,
        toUser: net.toUser,
        fromName: net.fromUser
          ? (net.fromUser === currentUid ? 'Vos' : memberBalances[net.fromUser]?.name || 'Compañero')
          : '',
        toName: net.toUser
          ? (net.toUser === currentUid ? 'Vos' : memberBalances[net.toUser]?.name || 'Compañero')
          : '',
        amount: net.amount,
        formattedAmount: `$${Math.round(net.amount).toLocaleString('es-AR')}`
      },
      summary: {
        currentPaid: currentBalance?.paid || 0,
        currentShouldPay: currentBalance?.shouldPay || 0,
        otherPaid: otherBalance?.paid || 0,
        otherShouldPay: otherBalance?.shouldPay || 0
      },
      members: members.map(uid => ({ ...memberBalances[uid], name: membersInfo[uid]?.name || membersInfo[uid]?.displayName || uid }))
    });
  }, [house, purchases, currentUid]);

  return { balances, setBalances };
}
