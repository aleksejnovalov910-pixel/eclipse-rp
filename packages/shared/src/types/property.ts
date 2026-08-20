export type PropertyKind = 'house' | 'apartment';

export interface PropertyPoint {
  x: number;
  y: number;
  z: number;
  heading: number;
  dimension: number;
}

export interface PropertyView {
  id: string;
  kind: PropertyKind;
  name: string;
  price: string;
  owned: boolean;
  ownedByMe: boolean;
  exterior: PropertyPoint;
}

export interface PropertyOwnedView extends PropertyView {
  interior: PropertyPoint;
}

export interface PropertyActionRequest {
  propertyId: string;
}

export interface PropertyPurchaseResult {
  property: PropertyOwnedView;
  bank: string;
}

export interface PropertySaleResult {
  propertyId: string;
  refund: string;
  bank: string;
}
