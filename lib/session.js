import { cookies } from "next/headers";
import crypto from "node:crypto";
const COOKIE = "nucleo_session";
function secret(){if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32) throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres."); return process.env.SESSION_SECRET;}
export function signSession(payload){const data=Buffer.from(JSON.stringify({...payload,exp:Date.now()+1000*60*60*24*14})).toString("base64url");const sig=crypto.createHmac("sha256",secret()).update(data).digest("base64url");return `${data}.${sig}`;}
export function verifyToken(token){try{const [data,sig]=token.split(".");const expected=crypto.createHmac("sha256",secret()).update(data).digest();const actual=Buffer.from(sig,"base64url");if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;const p=JSON.parse(Buffer.from(data,"base64url").toString());if(p.exp<Date.now())return null;return p;}catch{return null;}}
export async function getSession(){const jar=await cookies();const token=jar.get(COOKIE)?.value;return token?verifyToken(token):null;}
export const sessionCookie={name:COOKIE,options:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*14}};
export async function requireSession(){const s=await getSession();if(!s)throw Object.assign(new Error("Sessão inválida ou expirada."),{status:401});return s;}
