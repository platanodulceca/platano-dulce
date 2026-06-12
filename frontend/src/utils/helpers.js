export const fmtBs = (val) =>
  'Bs. ' + Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtUsd = (val) =>
  '$ ' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (str) => {
  if (!str) return ''
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtDatetime = (str) => {
  if (!str) return ''
  return new Date(str).toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const todayStr = () => new Date().toISOString().split('T')[0]

export const weekday = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export const PAYMENT_LABELS = {
  efectivo_bs:   'Efectivo Bs',
  efectivo_usd:  'Efectivo $',
  pago_movil:    'Pago Móvil',
  punto_venta:   'Punto de Venta',
  zelle:         'Zelle',
  transferencia: 'Transferencias',
  delivery:      'Delivery',
  propina:       'Propina',
  vuelto:        'Vuelto',
  credito: 'Crédito / Fiado'
}

export const PAYMENT_CURRENCY = {
  efectivo_bs:   'bs',
  efectivo_usd:  'usd',
  pago_movil:    'bs',
  punto_venta:   'bs',
  zelle:         'usd',
  transferencia: 'bs',
  delivery:      'bs',
  propina:       'bs',
  vuelto:        'bs',
  credito:       'bs'
}

export const PAYMENT_METHODS = Object.keys(PAYMENT_LABELS)

export const calcTotals = (pagos, tasa) => {
  let totalBs = 0
  pagos?.forEach(p => {
    const monto = Number(p.monto) || 0
    const moneda = p.moneda || PAYMENT_CURRENCY[p.metodo] || 'bs'
    if (moneda === 'usd') totalBs += monto * (tasa || 1)
    else totalBs += monto
  })
  const totalUsd = tasa > 0 ? totalBs / tasa : 0
  return { totalBs, totalUsd }
}

export const ROLE_LABELS = {
  admin:  'Administrador',
  cajero: 'Cajero',
  chef:   'Chef',
  dueno:  'Dueño',
  mesero: 'Mesero'
}

export const ROLE_MODULES = {
  admin:  ['dashboard','caja','mesero','cocina','inventario','recetario','compras','cuentas','historial'],
  cajero: ['caja','cuentas'],
  chef:   ['cocina','inventario','recetario','compras'],
  dueno:  ['dashboard','caja','mesero','cocina','inventario','recetario','compras','cuentas','historial'],
  mesero: ['mesero']
}

export const ORDER_STATUS_LABELS = {
  borrador:       'Borrador',
  pendiente:      'En espera',
  en_preparacion: 'Preparando',
  listo:          'Lista 🔔',
  entregado:      'Entregada',
  pagado:         'Cobrada',
  cancelada:      'Cancelada'
}

export const ORDER_STATUS_COLORS = {
  borrador:       'var(--gray-300)',
  pendiente:      'var(--warning)',
  en_preparacion: '#1565c0',
  listo:          'var(--success)',
  entregado:      'var(--brown)',
  pagado:         'var(--gray-500)',
  cancelada:      'var(--coral)'
}

export const ITEM_STATUS_LABELS = {
  pendiente:      'Pendiente',
  en_preparacion: 'Preparando',
  listo:          'Listo ✓',
  entregado:      'Entregado'
}

export const TABLE_STATUS_COLORS = {
  disponible: 'var(--success)',
  ocupada:    'var(--coral)',
  reservada:  'var(--warning)'
}

export const CATEGORY_LABELS = {
  viveres_barra_bebidas:    'Víveres / Barra / Bebidas',
  frutas_vegetales:         'Frutas y Vegetales',
  carniceria_frigorifico:   'Carnicería / Frigorífico'
}

export const DISH_CATEGORY_LABELS = {
  plato:   'Plato',
  bebida:  'Bebida',
  postre:  'Postre',
  entrada: 'Entrada',
  otro:    'Otro'
}
