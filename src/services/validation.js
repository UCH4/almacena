import { z } from 'zod';

export const purchaseItemSchema = z.object({
  nombre: z.string().min(1, 'Nombre del producto requerido'),
  qty: z.number().positive('Cantidad debe ser mayor a 0'),
  unit: z.string().min(1, 'Unidad requerida'),
  precio: z.number().min(0, 'Precio debe ser positivo'),
  consumidores: z.array(z.string()).min(1, 'Al menos un consumidor'),
  shared: z.boolean()
});

export const purchaseSchema = z.object({
  fecha: z.string().min(1, 'Fecha requerida'),
  comercio: z.string().min(1, 'Comercio requerido'),
  quien: z.string().min(1, 'Comprador requerido'),
  items: z.array(purchaseItemSchema).min(1, 'Al menos un ítem'),
  total: z.number().min(0, 'Total debe ser positivo'),
  estado: z.enum(['confirmada', 'pendiente', 'anulada']).default('confirmada')
});

export const productSchema = z.object({
  nombre: z.string().min(1, 'Nombre del producto requerido'),
  cat: z.string().min(1, 'Categoría requerida'),
  unit: z.string().min(1, 'Unidad requerida'),
  stock: z.number().min(0, 'Stock no puede ser negativo'),
  minStock: z.number().min(0, 'Stock mínimo no puede ser negativo'),
  consumidores: z.array(z.string()).min(1, 'Al menos un consumidor')
});

export const houseSchema = z.object({
  name: z.string().min(1, 'Nombre del hogar requerido').max(50, 'Máximo 50 caracteres')
});

export const profileSchema = z.object({
  nickname: z.string().min(1, 'Nombre requerido').max(30, 'Máximo 30 caracteres'),
  emoji: z.string().optional()
});

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Validación: ${errors}`);
  }
  return result.data;
}
