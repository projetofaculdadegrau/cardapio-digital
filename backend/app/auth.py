from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError # type: ignore
from app.db import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, LoginSchema, Token
from app.security import get_password_hash, verify_password, create_access_token, security
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Autenticação"])

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