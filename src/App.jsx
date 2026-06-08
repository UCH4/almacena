import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import Sidebar from './components/Sidebar';
import MobileTabs from './components/MobileTabs';
import Login from './components/Login';
import HouseSetup from './components/HouseSetup';
import Dashboard from './pages/Dashboard';
import Compras from './pages/Compras';
import Stock from './pages/Stock';
import Gastos from './pages/Gastos';
import Recetas from './pages/Recetas';
import Notificaciones from './pages/Notificaciones';
import { dbProvider, isFirebaseActive } from './db/dbProvider';
import { auth, googleProvider } from './db/firebase';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  
  // Estados de Autenticación y Hogar
  const [user, setUser] = useState(null);
  const [house, setHouse] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(isFirebaseActive);
  const [loginError, setLoginError] = useState('');

  // Estados de los datos sync
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [balances, setBalances] = useState({
    net: { fromUser: 'S', toUser: 'T', amount: 0, formattedAmount: '$0', fromName: '', toName: '' },
    summary: { totalPaidT: 0, totalPaidS: 0, totalShouldPayT: 0, totalShouldPayS: 0 }
  });
  
  const [toasts, setToasts] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. ESCUCHAR ESTADO DE AUTENTICACIÓN (SI FIREBASE ESTÁ ACTIVO)
  useEffect(() => {
    if (!isFirebaseActive) {
      // Modo local: simular usuario autenticado Tomas
      setUser({
        uid: 'T',
        displayName: 'Tomas',
        email: 'tomas@example.com',
        photoURL: ''
      });
      setHouse({
        id: 'local_house',
        name: 'Casa Tomas (Local)',
        inviteCode: 'LOCAL',
        members: ['T', 'S'],
        membersInfo: {
          'T': { name: 'Tomas' },
          'S': { name: 'Hermana' }
        },
        categories: ['lácteos', 'carnes', 'verduras', 'despensa', 'bebidas', 'limpieza', 'perfumería']
      });
      setLoadingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        // Guardar/Actualizar perfil de usuario básico en Firestore
        await dbProvider.saveUserProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL
        });

        // Obtener el hogar activo del usuario
        const profile = await dbProvider.getUserProfile(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          ...profile
        });

        if (profile?.activeHouseId) {
          const houseData = await dbProvider.getHouse(profile.activeHouseId);
          setHouse(houseData);
        } else {
          setHouse(null); // Debe crear o unirse a una casa
        }
      } else {
        setUser(null);
        setHouse(null);
      }
      setLoadingAuth(false);
    });

    return unsubscribe;
  }, []);

  // 2. SUBSCRIPCIONES A FIRESTORE (CUANDO HAY UNA CASA ACTIVA)
  useEffect(() => {
    if (!house?.id) return;

    showToast(`🏡 Cargando datos de: ${house.name}`, 'info');

    // Suscribirse a compras
    const unsubPurchases = dbProvider.subscribeToPurchases(house.id, (pList) => {
      setPurchases(pList);
    });

    // Suscribirse a productos
    const unsubProducts = dbProvider.subscribeToProducts(house.id, (pList) => {
      setProducts(pList);
    });

    // Suscribirse a notificaciones
    const unsubNotifs = dbProvider.subscribeToNotifications(house.id, (nList) => {
      setNotifications(nList);
    });

    return () => {
      unsubPurchases();
      unsubProducts();
      unsubNotifs();
    };
  }, [house?.id]);

  // 3. ACTUALIZAR BALANCES CUANDO CAMBIAN LAS COMPRAS O LA CASA
  useEffect(() => {
    if (!house) return;
    
    // Motor de cálculo financiero
    const calculateBalances = () => {
      const uids = house.members;
      const uidT = user?.uid || 'T'; // El usuario actual
      const uidS = uids.find(uid => uid !== uidT) || 'S'; // El acompañante

      let totalPaidT = 0;
      let totalPaidS = 0;
      let totalShouldPayT = 0;
      let totalShouldPayS = 0;
      let settlementT_to_S = 0;
      let settlementS_to_T = 0;

      purchases.forEach(p => {
        if (p.isSettlement) {
          if (p.quien === uidT) {
            settlementT_to_S += p.total;
          } else if (p.quien === uidS) {
            settlementS_to_T += p.total;
          }
        } else {
          if (p.estado === 'confirmada') {
            if (p.quien === uidT) totalPaidT += p.total;
            if (p.quien === uidS) totalPaidS += p.total;

            p.items.forEach(item => {
              const cost = item.precio * item.qty;
              const consumers = item.consumidores || [];
              if (item.shared || (consumers.includes(uidT) && consumers.includes(uidS))) {
                totalShouldPayT += cost / 2;
                totalShouldPayS += cost / 2;
              } else {
                if (consumers.includes(uidT)) totalShouldPayT += cost;
                if (consumers.includes(uidS)) totalShouldPayS += cost;
              }
            });
          }
        }
      });

      const netBalanceT = (totalPaidT - totalShouldPayT) + (settlementT_to_S - settlementS_to_T);

      // Si netBalanceT > 0, Sofia (S) debe a Tomas (T).
      // Si netBalanceT < 0, Tomas (T) debe a Sofia (S).
      const fromUser = netBalanceT < 0 ? uidT : uidS;
      const toUser = netBalanceT < 0 ? uidS : uidT;
      const amount = Math.abs(netBalanceT);

      const fromName = fromUser === uidT ? 'Vos' : (house.membersInfo[fromUser]?.name || 'Compañero');
      const toName = toUser === uidT ? 'Vos' : (house.membersInfo[toUser]?.name || 'Compañero');

      setBalances({
        net: {
          fromUser,
          toUser,
          fromName,
          toName,
          amount: Math.round(amount * 100) / 100,
          formattedAmount: `$${Math.round(amount).toLocaleString('es-AR')}`
        },
        summary: {
          totalPaidT: Math.round(totalPaidT),
          totalPaidS: Math.round(totalPaidS),
          totalShouldPayT: Math.round(totalShouldPayT),
          totalShouldPayS: Math.round(totalShouldPayS)
        }
      });
    };

    calculateBalances();
  }, [purchases, house, user?.uid]);

  // Toast System
  const showToast = (msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Google OAuth Log-In
  const handleLogin = async () => {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('🔑 Sesión iniciada con Google', 'success');
    } catch (err) {
      console.error(err);
      setLoginError('No se pudo iniciar sesión. Verificá tu conexión.');
    }
  };

  // Log-out
  const handleLogout = async () => {
    if (isFirebaseActive) {
      await signOut(auth);
    }
    setUser(null);
    setHouse(null);
    showToast('🔑 Sesión cerrada', 'info');
  };

  // Gestión de Casas
  const handleCreateHouse = async (houseName) => {
    if (!user) return;
    const newHouse = await dbProvider.createHouse(
      user.uid, 
      houseName, 
      user.displayName, 
      user.photoURL
    );
    setHouse(newHouse);
    showToast(`🏡 Casa "${houseName}" creada.`, 'success');
  };

  const handleJoinHouse = async (inviteCode) => {
    if (!user) return;
    const joinedHouse = await dbProvider.joinHouse(
      user.uid, 
      inviteCode, 
      user.displayName, 
      user.photoURL
    );
    setHouse(joinedHouse);
    showToast(`🏡 Te uniste a la casa: ${joinedHouse.name}`, 'success');
  };

  // Carga de compra confirmada
  const handleConfirmPurchase = async (purchaseData) => {
    try {
      await dbProvider.addPurchase(house.id, purchaseData);
      showToast(`✅ Compra de $${purchaseData.total.toLocaleString('es-AR')} cargada`, 'success');
    } catch (err) {
      showToast('❌ Error al guardar la compra', 'error');
    }
  };

  // Consumir stock
  const handleConsumeProduct = async (id, amount) => {
    try {
      await dbProvider.consumeProduct(house.id, id, amount);
      showToast('📦 Stock actualizado', 'success');
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    }
  };

  // Consumir múltiples ingredientes (de Recetas)
  const handleConsumeMultiple = async (consumptions) => {
    try {
      await dbProvider.consumeMultipleProducts(house.id, consumptions);
      showToast('🍳 Ingredientes descontados del stock', 'success');
    } catch (err) {
      showToast(`❌ Error al descontar ingredientes: ${err.message}`, 'error');
    }
  };

  // Agregar producto manualmente
  const handleAddProduct = async (productData) => {
    try {
      await dbProvider.addProduct(house.id, productData);
      showToast(`✅ Producto "${productData.nombre}" creado`, 'success');
    } catch (err) {
      showToast('❌ Error al crear producto', 'error');
    }
  };

  // Saldar cuentas
  const handleSaldarDeudas = async () => {
    try {
      const uids = house.members;
      const uidT = user.uid;
      const uidS = uids.find(uid => uid !== uidT);

      const payerUid = balances.net.fromUser;
      const receiverUid = balances.net.toUser;
      const payerName = payerUid === uidT ? user.displayName : (house.membersInfo[payerUid]?.name || 'Miembro');
      const receiverName = receiverUid === uidT ? user.displayName : (house.membersInfo[receiverUid]?.name || 'Miembro');

      await dbProvider.saldarDeudas(
        house.id, 
        balances.net.amount, 
        payerUid, 
        receiverUid, 
        payerName, 
        receiverName
      );
      showToast('✅ Balance liquidado exitosamente', 'success');
    } catch (err) {
      showToast('❌ Error al saldar deudas', 'error');
    }
  };

  // Marcar notificaciones leídas
  const handleMarkAllRead = async () => {
    try {
      await dbProvider.markNotificationsRead(house.id, notifications);
      showToast('✅ Notificaciones marcadas como leídas', 'success');
    } catch (err) {
      showToast('❌ Error al marcar notificaciones', 'error');
    }
  };

  // Actualizar categorías de la casa
  const handleUpdateCategories = async (newCategories) => {
    try {
      await dbProvider.updateHouseCategories(house.id, newCategories);
      setHouse(prev => ({ ...prev, categories: newCategories }));
      showToast('✅ Categorías del hogar actualizadas', 'success');
    } catch (err) {
      showToast('❌ Error al actualizar categorías', 'error');
    }
  };

  // Actualizar plan alimentario de la casa
  const handleUpdateMealPlan = async (newMealPlan) => {
    try {
      await dbProvider.saveMealPlan(house.id, newMealPlan);
      setHouse(prev => ({ ...prev, mealPlan: newMealPlan }));
      showToast('📅 Plan alimentario semanal guardado en Firestore', 'success');
    } catch (err) {
      showToast('❌ Error al guardar plan alimentario', 'error');
    }
  };

  // Visualizar detalle de una compra
  const handleViewPurchaseDetail = (purchase) => {
    setSelectedPurchase(purchase);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedPurchase(null);
    setIsDetailOpen(false);
  };

  // Carga de inicialización
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

  // Si no está autenticado, mostrar Login
  if (!user) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  // Si no tiene casa activa, mostrar HouseSetup
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
    <div className="app-container">
      {/* SIDEBAR NAVIGATION (DESKTOP) */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        unreadNotifs={unreadNotifs}
        pendingPurchases={pendingPurchases}
        currentUser={user.displayName}
      />

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileTabs 
        activePage={activePage} 
        setActivePage={setActivePage} 
        pendingPurchases={pendingPurchases}
      />

      {/* MAIN CONTENT AREA */}
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
          />
        )}

        {activePage === 'compras' && (
          <Compras 
            purchases={purchases} 
            onAddPurchase={handleConfirmPurchase}
            onViewPurchaseDetail={handleViewPurchaseDetail}
          />
        )}

        {activePage === 'stock' && (
          <Stock 
            products={products} 
            onAddProduct={handleAddProduct}
            onConsumeProduct={handleConsumeProduct}
            house={house}
            onUpdateCategories={handleUpdateCategories}
          />
        )}

        {activePage === 'gastos' && (
          <Gastos 
            purchases={purchases} 
            balances={balances} 
            onSaldarDeudas={handleSaldarDeudas}
            showToast={showToast}
            house={house}
            currentUserUid={user.uid}
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
          />
        )}
      </main>

      {/* TOAST SYSTEM */}
      <div id="toasts">
        {toasts.map(t => (
          <div className={`toast ${t.type}`} key={t.id}>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* MODAL DETALLE DE COMPRA */}
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
                  Pagado por {house.membersInfo[selectedPurchase.quien]?.name || 'Miembro'}
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
                          const hasT = item.consumidores.includes(user.uid);
                          const siblingUid = house.members.find(uid => uid !== user.uid);
                          const hasS = siblingUid ? item.consumidores.includes(siblingUid) : false;
                          const isShared = item.shared || (hasT && hasS);
                          return (
                            <tr key={idx}>
                              <td>
                                <div className="product-name">{item.nombre}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                  Consumidores: {item.consumidores.map(uid => house.membersInfo[uid]?.name || 'Miembro').join(', ')}
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
                          .filter(i => {
                            const c = i.consumidores || [];
                            return i.shared || (c.includes(user.uid) && c.some(uid => uid !== user.uid));
                          })
                          .reduce((acc, i) => acc + (i.precio * i.qty), 0)
                          .toLocaleString('es-AR')}
                      </div>
                    </div>
                    <div className="card" style={{ background: 'var(--surface2)', padding: '14px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Gastos exclusivos en esta compra</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--orange)', marginTop: '4px' }}>
                        ${selectedPurchase.items
                          .filter(i => {
                            const c = i.consumidores || [];
                            return !i.shared && !(c.includes(user.uid) && c.some(uid => uid !== user.uid));
                          })
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
  );
}
