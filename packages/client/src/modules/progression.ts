import { allowFromCef } from '../core/cefBridge';
export const registerProgressionModule=():void=>{allowFromCef('eclipse:progression:overview','eclipse:progression:claim','eclipse:progression:claimTier');};
