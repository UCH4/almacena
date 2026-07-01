import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MobileTabs from './components/MobileTabs';
import Login from './components/Login';
import HouseSetup from './components/HouseSetup';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Compras from './pages/Compras';
import Stock from './pages/Stock';
import Gastos from './pages/Gastos';
import Recetas from './pages/Recetas';
import Notificaciones from './pages/Notificaciones';
import Actividad from './pages/Actividad';
import UpdateBanner from './components/UpdateBanner';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectivityIndicator from './components/ConnectivityIndicator';
import { dbProvider } from './db/dbProvider';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useHouse } from './hooks/useHouse';
import { useDataSync } from './hooks/useDataSync';
import { useBalances } from './hooks/useBalances';
import { usePushInit } from './hooks/usePushInit';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { toasts, showToast } = useToast();
  const { user, setUser, loadingAuth, loginError, handleLogin, handleLogout } = useAuth(showToast);
  const { house, setHouse, userHouses, inviteCode, handleCreateHouse, handleCloseInviteModal, handleJoinHouse, handleLeaveHouse, handleSwitchHouse } = useHouse(user, showToast);
  const { purchases, products, notifications } = useDataSync(house?.id, showToast);
  const { balances } = useBalances(house, purchases, user?.uid);
  usePushInit(house?.id, user?.uid);

  const handleSaveProfile = async (nickname, emoji, birthDate) => {
    if (!user) return;
    const age = birthDate ? Math.floor((new Date() - new Date(birthDate)) / 31557600000) : null;
    const profileData = { nickname, emoji };
    if (birthDate) profileData.birthDate = birthDate;
    if (age) profileData.age = age;
    await dbProvider.saveUserProfile(user.uid, profileData);
    if (house) {
      await dbProvider.updateMemberInfo(house.id, user.uid, { nickname, emoji, age });
      setHouse(prev => ({
        ...prev,
        membersInfo: {
          ...prev.membersInfo,
          [user.uid]: { ...prev.membersInfo[user.uid], nickname, emoji, age, name: nickname }
        }
      }));
    }
    setUser(prev => ({ ...prev, ...profileData }));
    const ageText = age ? ` (${age} años)` : '';
    showToast(`✅ Perfil guardado como ${emoji} ${nickname}${ageText}`, 'success');
  };

  const handleConfirmPurchase = async (purchaseData) => {
    try {
      await dbProvider.addPurchase(house.id, purchaseData);
      showToast(`✅ Compra de $${purchaseData.total.toLocaleString('es-AR')} cargada`, 'success');
    } catch (err) {
      showToast('❌ Error al guardar la compra', 'error');
    }
  };

  const handleEditPurchase = async (purchaseId, data) => {
    try {
      await dbProvider.updatePurchase(house.id, purchaseId, data);
      showToast('✅ Compra actualizada', 'success');
    } catch (err) {
      showToast(`❌ Error al editar compra: ${err.message}`, 'error');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    try {
      await dbProvider.deletePurchase(house.id, purchaseId);
      showToast('✅ Compra anulada', 'success');
    } catch (err) {
      showToast(`❌ Error al anular compra: ${err.message}`, 'error');
    }
  };

  const handleConsumeProduct = async (id, amount) => {
    try {
      await dbProvider.consumeProduct(house.id, id, amount);
      showToast('📦 Stock actualizado', 'success');
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    }
  };

  const handleConsumeMultiple = async (consumptions) => {
    try {
      await dbProvider.consumeMultipleProducts(house.id, consumptions);
      showToast('🍳 Ingredientes descontados del stock', 'success');
    } catch (err) {
      showToast(`❌ Error al descontar ingredientes: ${err.message}`, 'error');
    }
  };

  const handleAddProduct = async (productData) => {
    try {
      await dbProvider.addProduct(house.id, productData);
      showToast(`✅ Producto "${productData.nombre}" creado`, 'success');
    } catch (err) {
      showToast('❌ Error al crear producto', 'error');
    }
  };

  const handleEditProduct = async (productId, data) => {
    try {
      await dbProvider.updateProduct(house.id, productId, data);
      showToast('✅ Producto actualizado', 'success');
    } catch (err) {
      showToast(`❌ Error al editar producto: ${err.message}`, 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await dbProvider.deleteProduct(house.id, productId);
      showToast('✅ Producto eliminado', 'success');
    } catch (err) {
      showToast(`❌ Error al eliminar producto: ${err.message}`, 'error');
    }
  };

  const handleSaldarDeudas = async () => {
    try {
      const payerUid = balances.net.fromUser;
      const receiverUid = balances.net.toUser;
      if (!payerUid || !receiverUid) {
        showToast('⚠️ No hay deudas que saldar', 'info');
        return;
      }
      const payerName = payerUid === user.uid ? user.displayName : (house.membersInfo[payerUid]?.name || 'Miembro');
      const receiverName = receiverUid === user.uid ? user.displayName : (house.membersInfo[receiverUid]?.name || 'Miembro');
      await dbProvider.saldarDeudas(house.id, balances.net.amount, payerUid, receiverUid, payerName, receiverName);
      showToast('✅ Balance liquidado exitosamente', 'success');
    } catch (err) {
      showToast('❌ Error al saldar deudas', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await dbProvider.markNotificationsRead(house.id, notifications);
      showToast('✅ Notificaciones marcadas como leídas', 'success');
    } catch (err) {
      showToast('❌ Error al marcar notificaciones', 'error');
    }
  };

  const handleUpdateCategories = async (newCategories) => {
    try {
      await dbProvider.updateHouseCategories(house.id, newCategories);
      setHouse(prev => ({ ...prev, categories: newCategories }));
      showToast('✅ Categorías del hogar actualizadas', 'success');
    } catch (err) {
      showToast('❌ Error al actualizar categorías', 'error');
    }
  };

  const handleUpdateMealPlan = async (newMealPlan) => {
    try {
      await dbProvider.saveMealPlan(house.id, newMealPlan);
      setHouse(prev => ({ ...prev, mealPlan: newMealPlan }));
      showToast('📅 Plan alimentario semanal guardado en Firestore', 'success');
    } catch (err) {
      showToast('❌ Error al guardar plan alimentario', 'error');
    }
  };

  const handleViewPurchaseDetail = (purchase) => {
    setSelectedPurchase(purchase);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedPurchase(null);
    setIsDetailOpen(false);
  };

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text2)' }}>
        <div className="ai-thinking">
          <div className="dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
          <span>Cargando perfil de AlacenaApp...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  if (!user.nickname) {
    return (
      <ProfileSetup
        user={user}
        onSave={handleSaveProfile}
        onLogout={handleLogout}
      />
    );
  }

  if (!house) {
    return (
      <HouseSetup
        onCreateHouse={handleCreateHouse}
        onJoinHouse={handleJoinHouse}
        onLogout={handleLogout}
        user={user}
      />
    );
  }

  const unreadNotifs = notifications.filter(n => !n.leida).length;
  const pendingPurchases = purchases.filter(p => p.estado === 'pendiente').length;

  return (
    <ErrorBoundary>
    <div className="app-container">
      <ConnectivityIndicator />
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        unreadNotifs={unreadNotifs}
        pendingPurchases={pendingPurchases}
        currentUser={user.nickname + (user.emoji ? ' ' + user.emoji : '')}
        userEmoji={user.emoji}
        inviteCode={house?.inviteCode}
        onCopyInvite={() => { navigator.clipboard?.writeText(house?.inviteCode || ''); showToast('📋 Código copiado', 'success'); }}
        house={house}
        onLeaveHouse={handleLeaveHouse}
        user={user}
        userHouses={userHouses}
        onSwitchHouse={handleSwitchHouse}
        onJoinHouse={handleJoinHouse}
        onLogout={handleLogout}
      />

      <MobileTabs
        activePage={activePage}
        setActivePage={setActivePage}
        pendingPurchases={pendingPurchases}
      />

      <main>
        {activePage === 'dashboard' && (
          <Dashboard
            purchases={purchases}
            products={products}
            balances={balances}
            onOpenNewPurchase={() => setActivePage('compras')}
            onViewPurchaseDetail={handleViewPurchaseDetail}
            activePage={activePage}
            setActivePage={setActivePage}
            house={house}
            user={user}
          />
        )}
        {activePage === 'compras' && (
          <Compras
            purchases={purchases}
            onAddPurchase={handleConfirmPurchase}
            onEditPurchase={handleEditPurchase}
            onDeletePurchase={handleDeletePurchase}
            onViewPurchaseDetail={handleViewPurchaseDetail}
            house={house}
            user={user}
          />
        )}
        {activePage === 'stock' && (
          <Stock
            products={products}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onConsumeProduct={handleConsumeProduct}
            house={house}
            onUpdateCategories={handleUpdateCategories}
          />
        )}
        {activePage === 'gastos' && (
          <Gastos
            purchases={purchases}
            products={products}
            balances={balances}
            onSaldarDeudas={handleSaldarDeudas}
            showToast={showToast}
            house={house}
            user={user}
          />
        )}
        {activePage === 'recetas' && (
          <Recetas
            products={products}
            onConsumeMultiple={handleConsumeMultiple}
            showToast={showToast}
            house={house}
            onUpdateMealPlan={handleUpdateMealPlan}
          />
        )}
        {activePage === 'notificaciones' && (
          <Notificaciones
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            house={house}
            user={user}
          />
        )}
        {activePage === 'actividad' && (
          <Actividad house={house} />
        )}
      </main>

      <div id="toasts" aria-live="polite">
        {toasts.map(t => (
          <div className={`toast ${t.type}`} key={t.id} role="alert">
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      <UpdateBanner />

      {inviteCode && (
        <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && handleCloseInviteModal()}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="modal-title">🏡 Casa creada</div>
              <button className="btn-close" onClick={handleCloseInviteModal}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: 'var(--text2)', marginBottom: '16px' }}>
                Compartí este código para que otros miembros se unan:
              </p>
              <div
                style={{
                  fontSize: '36px', fontWeight: 800, letterSpacing: '8px',
                  fontFamily: 'monospace', color: 'var(--accent)',
                  background: 'var(--surface2)', padding: '20px',
                  borderRadius: '12px', marginBottom: '16px',
                  cursor: 'pointer', userSelect: 'all'
                }}
                onClick={() => { navigator.clipboard?.writeText(inviteCode); showToast('📋 Copiado', 'success'); }}
              >
                {inviteCode}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
                Tocá el código para copiarlo automáticamente
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={handleCloseInviteModal}>Listo, ya lo copié</button>
            </div>
          </div>
        </div>
      )}

      {isDetailOpen && selectedPurchase && (
        <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && handleCloseDetail()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                {selectedPurchase.comercio} · {selectedPurchase.fecha}
              </div>
              <button className="btn-close" onClick={handleCloseDetail}>×</button>
            </div>
            <div className="modal-body">
              <div className="flex-between mb-16">
                <span className={`badge ${selectedPurchase.quien === user.uid ? 'badge-blue' : 'badge-purple'}`}>
                  Pagado por {(house.membersInfo[selectedPurchase.quien]?.emoji || '') + (house.membersInfo[selectedPurchase.quien]?.name || 'Miembro')}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>
                  Total: ${selectedPurchase.total.toLocaleString('es-AR')}
                </span>
              </div>

              {selectedPurchase.isSettlement ? (
                <div style={{ color: 'var(--text2)', fontSize: '14px', padding: '10px 0', textAlign: 'center' }}>
                  Esta transacción corresponde a un pago de liquidación directa para saldar el balance pendiente.
                </div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ítem</th>
                          <th>Cant.</th>
                          <th>Precio Total</th>
                          <th>División</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchase.items.map((item, idx) => {
                          const cost = item.precio * item.qty;
                          const hasCurrent = item.consumidores.includes(user.uid);
                          const otherUid = house.members.find(uid => uid !== user.uid);
                          const hasOther = otherUid ? item.consumidores.includes(otherUid) : false;
                          const isShared = item.shared || (hasCurrent && hasOther);
                          return (
                            <tr key={idx}>
                              <td>
                                <div className="product-name">{item.nombre}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                  Consumidores: {item.consumidores.map(uid => (house.membersInfo[uid]?.emoji || '') + (house.membersInfo[uid]?.name || 'Miembro')).join(', ')}
                                </div>
                              </td>
                              <td>{item.qty} {item.unit}</td>
                              <td>${cost.toLocaleString('es-AR')}</td>
                              <td>
                                <span className={`badge ${isShared ? 'badge-green' : 'badge-orange'}`}>
                                  {isShared ? '50/50 compartido' : 'Consumo exclusivo'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <hr className="sep" />
                  <div className="grid-2 mt-12">
                    <div className="card" style={{ background: 'var(--surface2)', padding: '14px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Gastos compartidos en esta compra</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>
                        ${selectedPurchase.items
                          .filter(i => { const c = i.consumidores || []; return i.shared || (c.includes(user.uid) && c.some(uid => uid !== user.uid)); })
                          .reduce((acc, i) => acc + (i.precio * i.qty), 0)
                          .toLocaleString('es-AR')}
                      </div>
                    </div>
                    <div className="card" style={{ background: 'var(--surface2)', padding: '14px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Gastos exclusivos en esta compra</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--orange)', marginTop: '4px' }}>
                        ${selectedPurchase.items
                          .filter(i => { const c = i.consumidores || []; return !i.shared && !(c.includes(user.uid) && c.some(uid => uid !== user.uid)); })
                          .reduce((acc, i) => acc + (i.precio * i.qty), 0)
                          .toLocaleString('es-AR')}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleCloseDetail}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
