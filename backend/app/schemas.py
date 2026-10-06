from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models import UserRole

# Contrato de Entrada: Cadastro de Usuário
class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: UserRole = UserRole.CLIENTE
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    veiculo: Optional[str] = None
    placa_veiculo: Optional[str] = None

# Contrato de Saída: Resposta dos dados do Usuário (sem a senha)
class UserResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    role: UserRole
    is_active: bool
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    veiculo: Optional[str] = None
    placa_veiculo: Optional[str] = None

    class Config:
        from_attributes = True
        use_enum_values = True

# Contrato para Login (Garante que este nome seja 'LoginSchema')
class LoginSchema(BaseModel):
    email: EmailStr
    senha: str

# Contrato de Retorno do Token
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse