export function guessCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('leche') || n.includes('yogur') || n.includes('queso') || n.includes('manteca') || n.includes('crema')) return 'lácteos';
  if (n.includes('carne') || n.includes('milanesa') || n.includes('pollo') || n.includes('medallon')) return 'carnes';
  if (n.includes('banana') || n.includes('manzana') || n.includes('tomate') || n.includes('papa') || n.includes('verdura')) return 'verduras';
  if (n.includes('fideo') || n.includes('arroz') || n.includes('aceite') || n.includes('salsa') || n.includes('harina') || n.includes('lata') || n.includes('proteína') || n.includes('whey')) return 'despensa';
  if (n.includes('detergente') || n.includes('esponja') || n.includes('limón') || n.includes('lavavajilla') || n.includes('limpieza')) return 'limpieza';
  if (n.includes('shampoo') || n.includes('acondicionador') || n.includes('jabón') || n.includes('dove') || n.includes('sedal')) return 'perfumería';
  if (n.includes('agua') || n.includes('gaseosa') || n.includes('jugo') || n.includes('cerveza') || n.includes('vino') || n.includes('soda') || n.includes('bebida')) return 'bebidas';
  return 'despensa';
}
