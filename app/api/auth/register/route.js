
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { signSession, sessionCookie } from '@/lib/session';
import { NextResponse } from 'next/server';

async function uploadLogoToImgBB(file) {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error('IMGBB_API_KEY não está configurada.');
  }

  if (!file || !file.size) return null;

  if (!file.type?.startsWith('image/')) {
    throw new Error('O logótipo deve ser uma imagem.');
  }

  if (file.size > 3 * 1024 * 1024) {
    throw new Error('O logótipo deve ter até 3 MB.');
  }

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const formData = new FormData();
      formData.append('image', file, file.name || 'logo.png');

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(60000),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message =
          result.error?.message ||
          `Erro HTTP ${response.status} no ImgBB.`;

        // Não repetir erros de autenticação ou de imagem inválida.
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          throw new Error(message);
        }

        throw new Error(message);
      }

      return result.data.display_url || result.data.url;

    } catch (error) {
      console.error(
        `IMGBB ATTEMPT ${attempt}/${maxAttempts}:`,
        error.message
      );

      if (attempt === maxAttempts) {
        throw error;
      }

      // Esperar antes de tentar novamente.
      await new Promise(resolve =>
        setTimeout(resolve, attempt * 2000)
      );
    }
  }

  return null;
}

export async function POST(req) {
  let userId = null;
  let companyId = null;

  try {
    const db = getSupabase();

    let body;
    let logo = null;

    if (
      req.headers.get('content-type')?.includes('multipart/form-data')
    ) {
      const form = await req.formData();

      body = Object.fromEntries(
        ['full_name', 'username', 'password', 'company_name', 'role']
          .map(key => [key, form.get(key)])
      );

      logo = form.get('logo');
    } else {
      body = await req.json();
    }

    const fullName = String(body.full_name || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const role = String(body.role || 'gerente');
    const companyName = String(body.company_name || '').trim();

    if (
      !fullName ||
      !username ||
      password.length < 10 ||
      !['gerente', 'funcionario'].includes(role)
    ) {
      return NextResponse.json(
        {
          error: 'Preenche os campos corretamente. A palavra-passe deve ter pelo menos 10 caracteres.',
        },
        { status: 400 }
      );
    }

    if (role === 'gerente' && !companyName) {
      return NextResponse.json(
        { error: 'Indica o nome da empresa.' },
        { status: 400 }
      );
    }

    if (role === 'gerente' && logo?.size > 0) {
      if (!logo.type?.startsWith('image/')) {
        return NextResponse.json(
          { error: 'O logótipo deve ser uma imagem.' },
          { status: 400 }
        );
      }

      if (logo.size > 3 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'O logótipo deve ter até 3 MB.' },
          { status: 400 }
        );
      }
    }

    // Verificar username
    const { data: existing, error: searchError } = await db
      .from('contas')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (searchError) throw searchError;

    if (existing) {
      return NextResponse.json(
        { error: 'Este nome de utilizador já está em uso.' },
        { status: 409 }
      );
    }

    // Upload opcional do logótipo
    let logoUrl = null;
    let logoWarning = null;

    if (role === 'gerente' && logo?.size > 0) {
      try {
        logoUrl = await uploadLogoToImgBB(logo);
      } catch (uploadError) {
        console.error('IMGBB FINAL ERROR:', uploadError);

        logoWarning =
          'A empresa foi criada, mas não foi possível carregar o logótipo. Podes tentar novamente mais tarde.';
      }
    }

    // Criar conta
    const { data: user, error: userError } = await db
      .from('contas')
      .insert({
        full_name: fullName,
        username,
        password_hash: await bcrypt.hash(password, 12),
        role,
      })
      .select('id, full_name, username, role, created_at')
      .single();

    if (userError) throw userError;

    userId = user.id;

    let company = null;

    // Criar empresa
    if (role === 'gerente') {
      const { data: createdCompany, error: companyError } = await db
        .from('empresas')
        .insert({
          nome: companyName,
          logo: logoUrl,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      company = createdCompany;
      companyId = company.id;

      // Associar gerente
      const { error: managerError } = await db
        .from('empresa_gerentes')
        .insert({
          empresa_id: company.id,
          gerente_id: user.id,
        });

      if (managerError) throw managerError;
    }

    // Criar sessão
    const res = NextResponse.json({
      user,
      company,
      warning: logoWarning,
      message: logoWarning
        ? 'Conta e empresa criadas. O logótipo precisa de ser carregado novamente.'
        : 'Registo realizado com sucesso.',
    });

    res.cookies.set(
      sessionCookie.name,
      signSession({
        id: user.id,
        role: user.role,
      }),
      sessionCookie.options
    );

    return res;

  } catch (error) {
    console.error('NUCLEO REGISTER ERROR:', error);

    // Limpar registos parciais em caso de falha.
    try {
      const db = getSupabase();

      if (companyId) {
        await db
          .from('empresa_gerentes')
          .delete()
          .eq('empresa_id', companyId);

        await db
          .from('empresas')
          .delete()
          .eq('id', companyId);
      }

      if (userId) {
        await db
          .from('contas')
          .delete()
          .eq('id', userId);
      }
    } catch (cleanupError) {
      console.error('REGISTER CLEANUP ERROR:', cleanupError);
    }

    return NextResponse.json(
      {
        error: error?.message || 'Erro interno durante o registo.',
      },
      { status: 500 }
    );
  }
}
