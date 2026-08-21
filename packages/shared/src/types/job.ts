export interface JobProgressView { jobKey:string;name:string;description:string;level:number;experience:number;completed:number;nextLevelExperience:number;requiredCharacterLevel:number;unlocked:boolean; }
export interface JobTarget { x:number;y:number;z:number; }
export interface JobAssignmentView { jobKey:string;name:string;description:string;step:number;totalSteps:number;target:JobTarget;rewardCash:string;experienceReward:number;requiredCharacterLevel:number;currentAction:string;vehicleRequired:boolean;actionDurationMs:number; }
export interface JobStepResult { completed:boolean;assignment:JobAssignmentView|null;payoutCash:string;progress:JobProgressView|null; }
