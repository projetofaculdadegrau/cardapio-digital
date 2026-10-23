import secrets
import os
import resend
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError # type: ignore
from app.db import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, LoginSchema, Token, ForgotPasswordSchema, ResetPasswordSchema
from app.security import get_password_hash, verify_password, create_access_token, security
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Autenticação"])
resend.api_key = settings.RESEND_API_KEY

# Função utilitária para extrair o usuário autenticado do Bearer Token
def get_current_user(credentials = Depends(security), db: Session = Depends(get_db)) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/cadastrar", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def registrar_usuario(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        user_exist = db.query(User).filter(User.email == user_in.email).first()
        if user_exist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este e-mail já está cadastrado no sistema."
            )

        new_user = User(
            nome=user_in.nome,
            email=user_in.email,
            senha_hash=get_password_hash(user_in.senha),
            role=user_in.role,
            telefone=user_in.telefone,
            endereco=user_in.endereco,
            veiculo=user_in.veiculo,
            placa_veiculo=user_in.placa_veiculo
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao cadastrar usuário: {str(e)}"
        )


@router.post("/login", response_model=Token)
def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo no sistema"
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


# Rota protegida: Retorna os dados do usuário logado
@router.get("/me", response_model=UserResponse)
def obter_perfil_logado(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/esqueci-senha")
def esqueci_senha(payload: ForgotPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    
    # Por segurança, mesmo se o e-mail não existir, retornamos sucesso para evitar enumeração de usuários
    if not user:
        return {"message": "As instruções de recuperação foram enviadas para o email informado. Verifique sua caixa de entrada e spam."}

    # Gera um token seguro único
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    # Link que direcionará para a página dedicada no frontend
    link_redefinicao = f"http://127.0.0.1:5500/frontend/login/redefinir.html?token={token}"

    print(f"\n--- [LINK DE RECUPERAÇÃO DE SENHA] ---\n{link_redefinicao}\n---------------------------------------\n")

    # Montagem do E-mail com identidade visual
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Recuperação de Senha - Cardápio Digital</title></head>
    <body style="margin: 0; padding: 0; background-color: #fff8f3; font-family: 'DM Sans', 'Manrope', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f1b17;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #efe7df; overflow: hidden; box-shadow: 0 4px 24px rgba(36,33,31,0.06);">
            <tr>
                <td align="center" style="padding: 40px 30px 20px 30px;">
                    <div style="font-family: 'Manrope', 'Segoe UI', sans-serif; font-size: 14px; font-weight: 800; color: #ac2d00; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Cardápio Digital</div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1f1b17; font-family: 'Manrope', sans-serif;">Recuperação de Senha</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px 40px; font-size: 14px; line-height: 1.6; color: #5b4039;">
                    <p style="margin: 0 0 16px 0;">Olá, <strong style="color: #1f1b17;">{user.nome}</strong>!</p>
                    <p style="margin: 0 0 24px 0;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Cardápio Digital</strong>. Clique no botão abaixo para prosseguir com segurança:</p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td align="center" style="padding: 10px 0 30px 0;">
                                <a href="{link_redefinicao}" target="_blank" style="background-color: #ac2d00; color: #ffffff; padding: 14px 32px; border-radius: 14px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(172, 45, 0, 0.3);">Redefinir Minha Senha</a>
                            </td>
                        </tr>
                    </table>
                    <p style="margin: 0; font-size: 12px; color: #8f7067; text-align: center;">Este link expira em 15 minutos por motivos de segurança.</p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 30px 40px 30px; border-top: 1px solid #efe7df;">
                    <p style="margin: 0; font-size: 11px; color: #8f7067;">© 2026 Cardápio Digital. Todos os direitos reservados.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    try:
        params: resend.Emails.SendParams = {
            "from": "Cardápio Digital <onboarding@resend.dev>",
            "to": [user.email],
            "subject": "Recuperação de Senha - Cardápio Digital",
            "html": html_content
        }
        r = resend.Emails.send(params)
        print(f"E-mail disparado com sucesso via Resend! ID: {r}")
    except Exception as e:
        print(f"ERRO DETALHADO DO RESEND: {str(e)}")

    return {"message": "As instruções de recuperação foram enviadas para o email informado. Verifique sua caixa de entrada e spam."}

@router.post("/redefinir-senha")
def redefinir_senha(payload: ResetPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()

    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido ou expirado.")

    # Verifica expiração (garantindo timezone UTC)
    exp_utc = user.reset_token_expires
    if exp_utc.tzinfo is None:
        exp_utc = exp_utc.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > exp_utc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O token de recuperação expirou.")

    # Atualiza a senha e limpa o token
    user.senha_hash = get_password_hash(payload.nova_senha)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Senha redefinida com sucesso! Você já pode fazer login."}