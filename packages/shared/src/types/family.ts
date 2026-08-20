export interface FamilyView {
  id: string;
  name: string;
  balance: string;
  reputation: number;
  level: number;
  rankName: string;
  memberCount: number;
}

export interface FamilyCreateRequest {
  name: string;
}
