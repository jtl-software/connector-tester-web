export const CONTROLLERS = [
  'category', 'connector', 'core', 'crossSelling', 'customer',
  'customerOrder', 'deliveryNote', 'globalData', 'image', 'manufacturer',
  'payment', 'product', 'productPrice', 'productStockLevel', 'specific',
  'statusChange'
] as const

export type ControllerName = (typeof CONTROLLERS)[number]

export type Action =
  | 'Pull' | 'Push' | 'Delete' | 'Stats'
  | 'Finish' | 'Identify' | 'Clear' | 'Features' | 'Init'

/**
 * Record<ControllerName, …> is deliberate: adding a controller without giving it
 * actions becomes a compile error. The old Vue code had 18 options in the select
 * but only 16 entries here, which crashed at runtime.
 */
export const ACTIONS: Record<ControllerName, readonly Action[]> = {
  category: ['Pull', 'Push', 'Delete', 'Stats'],
  connector: ['Finish', 'Identify'],
  core: ['Clear', 'Features', 'Init'],
  crossSelling: ['Pull', 'Push', 'Delete', 'Stats'],
  customer: ['Pull', 'Push', 'Stats'],
  customerOrder: ['Pull', 'Stats'],
  deliveryNote: ['Push'],
  globalData: ['Pull', 'Stats'],
  image: ['Pull', 'Delete', 'Stats'],
  manufacturer: ['Pull', 'Push', 'Delete', 'Stats'],
  payment: ['Pull', 'Stats'],
  product: ['Pull', 'Push', 'Delete', 'Stats'],
  productPrice: ['Pull', 'Push', 'Stats'],
  productStockLevel: ['Pull', 'Push', 'Stats'],
  specific: ['Pull', 'Push', 'Delete', 'Stats'],
  statusChange: ['Push']
}

export const CONTROLLER_LABELS: Record<ControllerName, string> = {
  category: 'Category',
  connector: 'Connector',
  core: 'Core',
  crossSelling: 'Cross Selling',
  customer: 'Customer',
  customerOrder: 'Customer Order',
  deliveryNote: 'Delivery Note',
  globalData: 'Global Data',
  image: 'Image',
  manufacturer: 'Manufacturer',
  payment: 'Payment',
  product: 'Product',
  productPrice: 'Product Price',
  productStockLevel: 'Product Stock Level',
  specific: 'Specific',
  statusChange: 'Status Change'
}

/** Linking tables that are not connector-core controllers. */
export const EXTRA_LINKING_TABLES = ['productVariation', 'productVariationValue'] as const

export const LINKING_TARGETS = [...CONTROLLERS, ...EXTRA_LINKING_TABLES] as const

export type LinkingTarget = (typeof LINKING_TARGETS)[number]

export interface Connection {
  name: string
  url: string
  token: string
}

export interface RequestParams {
  connectorUrl: string
  connectorToken: string
  controller: string
  action: string
  payload: string
  limit: number
  results?: string
}

export interface ApiResult {
  ok: boolean
  httpStatus: number
  durationMs: number
  data: unknown
  errorMessage?: string
}
