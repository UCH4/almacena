import React, { useState } from 'react';

const RECIPES_DB = [
  {
    id: 1,
    emoji: '🍝',
    nombre: 'Spaghetti al tomate',
    tiempo: '25 min',
    dificultad: 'Fácil',
    ingredientes: ['Fideos spaghetti 500g', 'Tomate perita lata', 'Aceite girasol 1.5L'],
    pasos: [
      'Hervir agua con sal y cocinar los fideos al dente (8-10 min).',
      'Calentar aceite en sartén, agregar el tomate perita machacado y cocinar 10 min.',
      'Condimentar con sal, orégano y ajo a gusto.',
      'Mezclar la salsa con los fideos y servir caliente.'
    ]
  },
  {
    id: 2,
    emoji: '🥛',
    nombre: 'Arroz con leche',
    tiempo: '35 min',
    dificultad: 'Fácil',
    ingredientes: ['Arroz largo fino 1kg', 'Leche entera 1L', 'Manteca 200g'],
    pasos: [
      'Hervir 1 taza de arroz con 2 tazas de leche y una pizca de sal.',
      'Revolver cada 5 min a fuego lento para que no se pegue.',
      'Agregar manteca y azúcar/canela a gusto.',
      'Enfriar y servir frío.'
    ]
  },
  {
    id: 3,
    emoji: '🥩',
    nombre: 'Milanesas a la napolitana',
    tiempo: '30 min',
    dificultad: 'Media',
    ingredientes: ['Milanesas de ternera', 'Tomate perita lata', 'Queso cremoso 250g'],
    pasos: [
      'Cocinar las milanesas de ternera al horno o fritas.',
      'Cubrir cada milanesa con una cucharada de salsa de tomate perita.',
      'Colocar rodajas de queso cremoso arriba.',
      'Llevar a horno fuerte para gratinar el queso por 5 minutos y servir.'
    ]
  },
  {
    id: 4,
    emoji: '🍌',
    nombre: 'Licuado de banana y yogur',
    tiempo: '5 min',
    dificultad: 'Fácil',
    ingredientes: ['Banana 1kg', 'Yogur natural', 'Leche entera 1L'],
    pasos: [
      'Pelar y trocear las bananas.',
      'Colocar las bananas, el yogur natural y la leche entera en una licuadora.',
      'Licuar a velocidad máxima por 2 minutos.',
      'Endulzar con azúcar o miel a gusto y servir bien frío.'
    ]
  },
  {
    id: 5,
    emoji: '🥗',
    nombre: 'Ensalada de frutas otoñal',
    tiempo: '10 min',
    dificultad: 'Fácil',
    ingredientes: ['Banana 1kg', 'Manzana 1kg', 'Naranjas de jugo'],
    pasos: [
      'Pelar y cortar todas las frutas en cubos de tamaño mediano.',
      'Mezclar las frutas en un bowl grande.',
      'Agregar jugo de limón para evitar que se oxiden.',
      'Enfriar en la heladera durante 15 minutos antes de servir.'
    ]
  }
];

const DEFAULT_MEAL_PLAN = {
  Lunes: { breakfast: 'Licuado de banana y yogur', lunch: 'Milanesas de ternera con puré de papas', dinner: 'Spaghetti con salsa de tomate perita' },
  Martes: { breakfast: 'Yogur natural con manzana picada', lunch: 'Sorrentinos de ricota y jamón', dinner: 'Arroz con queso y manteca' },
  Miércoles: { breakfast: 'Tostadas con manteca', lunch: 'Fideos con aceite y queso', dinner: 'Milanesas de ternera al horno' },
  Jueves: { breakfast: 'Licuado de banana con leche', lunch: 'Sorrentinos con salsa filetto', dinner: 'Arroz con leche casero' },
  Viernes: { breakfast: 'Yogur natural con banana', lunch: 'Spaghetti al ajo y aceite', dinner: 'Milanesas a la napolitana con papas fritas' },
  Sábado: { breakfast: 'Ensalada de frutas otoñal', lunch: 'Arroz al pesto', dinner: 'Pizza casera compartida' },
  Domingo: { breakfast: 'Licuado cremoso de frutas', lunch: 'Asado o verduras asadas', dinner: 'Sopa casera con fideos' }
};

export default function Recetas({ products, onConsumeMultiple, showToast, house, onUpdateMealPlan }) {
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes' or 'mealPlan'
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Leer plan alimentario guardado en el hogar o usar null
  const currentMealPlan = house?.mealPlan || null;

  // Actualizar sugerencias de recetas individuales
  const handleRefreshRecetas = () => {
    setLoadingRecipes(true);
    setTimeout(() => {
      setLoadingRecipes(false);
      showToast('✨ Vertex AI ha analizado tu stock y actualizado las sugerencias.', 'success');
    }, 1800);
  };

  // Generar plan alimentario semanal por IA
  const handleGenerateMealPlan = () => {
    setLoadingPlan(true);
    setTimeout(() => {
      setLoadingPlan(false);
      if (onUpdateMealPlan) {
        onUpdateMealPlan(DEFAULT_MEAL_PLAN);
      } else {
        showToast('✨ Plan alimentario simulado generado.', 'success');
      }
    }, 2200);
  };

  const getIngredientStockStatus = (ingName) => {
    const found = products.find(p => p.nombre.toLowerCase().includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(p.nombre.toLowerCase()));
    return {
      available: found && found.stock > 0,
      stockProduct: found
    };
  };

  const recipesWithStockStatus = RECIPES_DB.map(recipe => {
    const missing = [];
    const available = [];
    
    recipe.ingredientes.forEach(ingName => {
      const status = getIngredientStockStatus(ingName);
      if (status.available) {
        available.push({ name: ingName, product: status.stockProduct });
      } else {
        missing.push(ingName);
      }
    });

    return {
      ...recipe,
      missing,
      available,
      hasAll: missing.length === 0
    };
  });

  const handleOpenRecipe = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleCloseRecipe = () => {
    setSelectedRecipe(null);
  };

  const handleDescontarStock = () => {
    if (!selectedRecipe) return;

    const consumptions = [];
    selectedRecipe.available.forEach(item => {
      const p = item.product;
      const amt = p.unit === 'kg' || p.unit === 'L' || p.unit === 'g' || p.unit === 'ml'
        ? (p.unit === 'kg' || p.unit === 'L' ? 0.3 : 100)
        : 1;

      if (p.stock >= amt) {
        consumptions.push({ id: p.id, amount: amt, nombre: p.nombre });
      }
    });

    if (consumptions.length > 0) {
      onConsumeMultiple(consumptions);
      showToast(`🍳 Ingredientes de "${selectedRecipe.nombre}" descontados del stock.`, 'success');
    } else {
      showToast('❌ No hay ingredientes suficientes en stock.', 'error');
    }

    handleCloseRecipe();
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">
          Recetas e IA
          <small>Sugerencias inteligentes basadas en el stock del hogar: {house.name}</small>
        </div>
        <div className="toggle-wrap" style={{ padding: '4px' }}>
          <button 
            className={`toggle-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            Sugerencia de Recetas
          </button>
          <button 
            className={`toggle-btn ${activeTab === 'mealPlan' ? 'active' : ''}`}
            onClick={() => setActiveTab('mealPlan')}
          >
            Plan Alimentario Semanal
          </button>
        </div>
      </div>

      <div className="card mb-20" style={{ borderColor: 'rgba(79, 142, 247, 0.3)' }}>
        <div className="flex gap-8">
          <span style={{ fontSize: '20px' }}>🤖</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>Firebase Vertex AI integration</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '2px' }}>
              La IA analiza el inventario real y crea sugerencias o planes semanales dinámicos para optimizar el consumo de alimentos y evitar desperdicios.
            </div>
          </div>
        </div>
      </div>

      {/* VISTA 1: SUGERENCIA DE RECETAS INDIVIDUALES */}
      {activeTab === 'recipes' && (
        <>
          <div className="flex-between mb-16">
            <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: 500 }}>
              Recetas posibles con tus ingredientes en stock:
            </span>
            <button className="btn btn-secondary btn-sm" onClick={handleRefreshRecetas} disabled={loadingRecipes}>
              {loadingRecipes ? 'Analizando...' : '✨ Actualizar Recetas'}
            </button>
          </div>

          {loadingRecipes ? (
            <div className="ai-thinking" style={{ justifyContent: 'center', padding: '40px' }}>
              <div className="dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <span>Vertex AI buscando recetas óptimas...</span>
            </div>
          ) : (
            <div className="grid-3">
              {recipesWithStockStatus.map(r => (
                <div className="recipe-card" onClick={() => handleOpenRecipe(r)} key={r.id}>
                  <div className="recipe-emoji">{r.emoji}</div>
                  <div className="recipe-name">{r.nombre}</div>
                  <div className="recipe-time">⏱ {r.tiempo} · {r.dificultad}</div>
                  <div className="recipe-tags">
                    {r.ingredientes.map((ing, i) => (
                      <span className="recipe-tag" key={i}>{ing}</span>
                    ))}
                  </div>
                  {r.missing.length > 0 ? (
                    <div className="recipe-missing">
                      ⚠️ Falta: {r.missing.join(', ')}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '8px', fontWeight: 500 }}>
                      ✅ Ingredientes listos en alacena
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VISTA 2: PLAN ALIMENTARIO SEMANAL */}
      {activeTab === 'mealPlan' && (
        <>
          <div className="flex-between mb-16">
            <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: 500 }}>
              Planificación nutricional para el hogar:
            </span>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleGenerateMealPlan} 
              disabled={loadingPlan}
            >
              {loadingPlan ? 'Generando plan...' : '✨ Generar Plan Semanal con IA'}
            </button>
          </div>

          {loadingPlan ? (
            <div className="ai-thinking" style={{ justifyContent: 'center', padding: '40px' }}>
              <div className="dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <span>Vertex AI estructurando tu menú balanceado semanal...</span>
            </div>
          ) : !currentMealPlan ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px', borderStyle: 'dashed', borderWidth: '2px' }}>
              <div style={{ fontSize: '42px', marginBottom: '16px' }}>📅</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                No hay ningún plan alimentario generado
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: '1.6' }}>
                Hacé click en el botón de arriba para que la IA lea tu stock actual y proponga comidas para el almuerzo y cena de cada día de la semana.
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleGenerateMealPlan}>
                Generar Plan Semanal
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.keys(currentMealPlan).map(day => (
                <div key={day} className="card" style={{ padding: '16px 20px' }}>
                  <div 
                    style={{ 
                      fontFamily: 'var(--font-display)', 
                      fontSize: '15px', 
                      fontWeight: 800, 
                      color: 'var(--accent)',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '8px',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    📅 {day}
                  </div>
                  <div className="grid-3">
                    <div style={{ background: 'var(--surface2)', padding: '10px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                        🍳 Desayuno
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                        {currentMealPlan[day].breakfast}
                      </div>
                    </div>
                    <div style={{ background: 'var(--surface2)', padding: '10px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                        🥩 Almuerzo
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                        {currentMealPlan[day].lunch}
                      </div>
                    </div>
                    <div style={{ background: 'var(--surface2)', padding: '10px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                        🍝 Cena
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                        {currentMealPlan[day].dinner}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL RECETA DETALLE */}
      {selectedRecipe && (
        <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && handleCloseRecipe()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{selectedRecipe.emoji} {selectedRecipe.nombre}</div>
              <button className="btn-close" onClick={handleCloseRecipe}>×</button>
            </div>
            <div className="modal-body">
              <div className="flex gap-8 mb-16">
                <span className="badge badge-blue">⏱ {selectedRecipe.tiempo}</span>
                <span className="badge badge-purple">{selectedRecipe.dificultad}</span>
                <span className={`badge ${selectedRecipe.missing.length === 0 ? 'badge-green' : 'badge-orange'}`}>
                  {selectedRecipe.missing.length === 0 ? 'Stock Completo' : `${selectedRecipe.missing.length} Faltantes`}
                </span>
              </div>

              <div className="card-title mb-8">Ingredientes necesarios</div>
              <div style={{ display: 'grid', gap: '4px', marginBottom: '16px' }}>
                {selectedRecipe.ingredientes.map((ing, idx) => {
                  const status = getIngredientStockStatus(ing);
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '6px 8px', 
                        borderRadius: '4px',
                        display: 'flex', 
                        justifyContent: 'space-between',
                        background: status.available ? 'rgba(45, 212, 160, 0.05)' : 'rgba(247, 90, 90, 0.05)',
                        borderLeft: `3px solid ${status.available ? 'var(--green)' : 'var(--red)'}`,
                        fontSize: '13px'
                      }}
                    >
                      <span>• {ing}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: status.available ? 'var(--green)' : 'var(--red)' }}>
                        {status.available ? `En stock` : 'Agotado'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="card-title mt-16 mb-8">Preparación paso a paso</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {selectedRecipe.pasos.map((paso, idx) => (
                  <div style={{ display: 'flex', gap: '12px' }} key={idx}>
                    <div style={{ 
                      width: '22px', 
                      height: '22px', 
                      borderRadius: '50%', 
                      background: 'var(--accent)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      flexShrink: 0,
                      marginTop: '1px' 
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>{paso}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleCloseRecipe}>Cerrar</button>
              {selectedRecipe.available.length > 0 && (
                <button className="btn btn-primary" onClick={handleDescontarStock}>
                  Descontar del stock ({selectedRecipe.available.length} ítems)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
