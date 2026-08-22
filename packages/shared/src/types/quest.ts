export interface QuestView {
  key: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  rewardCash: string;
  rewardBank: string;
}
