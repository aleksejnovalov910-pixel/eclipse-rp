export interface DocumentView{characterId:number;passportNumber:string;issuedAt:string;expiresAt:string|null;licenses:Record<string,string|null>}
export interface DocumentRequest{targetCharacterId:number}
export interface LicenseIssueRequest{targetCharacterId:number;license:'driver'|'weapon'|'business'|'air';expiresAt?:string|null}
export interface LicenseRevokeRequest{targetCharacterId:number;license:'driver'|'weapon'|'business'|'air'}
export interface DocumentShowRequest{targetPlayerId:number}
export interface DocumentShowResult{shown:true}
export interface VehicleDocumentView{model:string;vin:string;plate:string|null;insuranceUntil:string|null;ownerCharacterId:number}
export interface VehicleDocumentShowRequest{targetPlayerId:number}
