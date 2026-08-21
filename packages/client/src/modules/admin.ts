import { allowFromCef } from '../core/cefBridge';
export const registerAdminModule=():void=>{allowFromCef('eclipse:admin:access','eclipse:admin:online','eclipse:admin:kick','eclipse:admin:heal','eclipse:admin:goto','eclipse:admin:bring','eclipse:admin:ban','eclipse:admin:audit');};
