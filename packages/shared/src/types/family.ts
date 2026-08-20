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

export interface FamilyMemberView {
  characterId: number;
  name: string;
  rankName: string;
  rankIndex: number;
  contribution: number;
  joinedAt: string;
}

export interface FamilyInvitationView {
  familyId: string;
  familyName: string;
  inviterCharacterId: number;
  expiresAt: string;
}

export interface FamilyInviteRequest {
  targetCharacterId: number;
}

export interface FamilyTreasuryRequest {
  amount: string;
}
