import { NextResponse } from "next/server";
import { getSession } from "./session";
export function ok(data,status=200){return NextResponse.json(data,{status});}
export function fail(error,status=400){return NextResponse.json({error:typeof error==="string"?error:error.message||"Erro interno."},{status:error?.status||status});}
export async function session(){const s=await getSession();if(!s)throw Object.assign(new Error("Sessão inválida ou expirada."),{status:401});return s;}
export async function managerFor(db, userId, companyId){const {data,error}=await db.from("empresa_gerentes").select("id").eq("gerente_id",userId).eq("empresa_id",companyId).maybeSingle();if(error)throw error;if(!data)throw Object.assign(new Error("Sem permissão para gerir esta empresa."),{status:403});}
export async function memberFor(db,userId,companyId){const {data,error}=await db.from("empresa_funcionarios").select("id").eq("funcionario_id",userId).eq("empresa_id",companyId).eq("estado","aceite").maybeSingle();if(error)throw error;if(!data)throw Object.assign(new Error("Não és membro desta empresa."),{status:403});}
export function validId(v){const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw new Error("ID inválido.");return n;}
