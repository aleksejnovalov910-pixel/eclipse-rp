export interface JobProgressView {
  jobKey: string;
  name: string;
  level: number;
  experience: number;
  completed: number;
  nextLevelExperience: number;
}

export interface JobTarget {
  x: number;
  y: number;
  z: number;
}

export interface JobAssignmentView {
  jobKey: string;
  name: string;
  step: number;
  totalSteps: number;
  target: JobTarget;
  rewardCash: string;
  experienceReward: number;
}

export interface JobStepResult {
  completed: boolean;
  assignment: JobAssignmentView | null;
  payoutCash: string;
  progress: JobProgressView | null;
}
