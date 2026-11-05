import webpush from "web-push";
export function configurePush(){if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY||!process.env.VAPID_SUBJECT)return false;webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);return true;}
export async function sendPush(subscription,payload){if(!configurePush())throw new Error("VAPID não configurado.");return webpush.sendNotification(subscription,JSON.stringify(payload));}
