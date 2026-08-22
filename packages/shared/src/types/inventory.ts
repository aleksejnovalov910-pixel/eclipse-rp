export interface InventoryItemView {
  id: string;
  itemKey: string;
  name: string;
  category: string;
  slot: number;
  quantity: number;
  weightEach: string;
  stackSize: number;
  metadata: unknown;
}

export interface InventoryView {
  inventoryId: string;
  capacityWeight: string;
  usedWeight: string;
  slots: number;
  items: InventoryItemView[];
}

export interface InventoryMoveRequest {
  itemId: string;
  toSlot: number;
}

export interface InventorySplitRequest {
  itemId: string;
  quantity: number;
  toSlot: number;
}
