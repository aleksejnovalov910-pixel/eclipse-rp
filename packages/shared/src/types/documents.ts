export interface DocumentView{characterId:number;passportNumber:string;issuedAt:string;expiresAt:string|null;licenses:Record<string,string|null>}
export interface DocumentRequest{targetCharacterId:number}
export interface LicenseIssueRequest{targetCharacterId:number;license:'driver'|'weapon'|'business'|'air';expiresAt?:string|null}
export interface LicenseRevokeRequest{targetCharacterId:number;license:'driver'|'weapon'|'business'|'air'}
