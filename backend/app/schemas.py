import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.models import UserRole, OrderStatus

# AUTENTICAÇÃO E USUÁRIOS
class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: UserRole = UserRole.CLIENTE
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    veiculo: Optional[str] = None
    placa_veiculo: Optional[str] = None

    @field_validator('senha')
    @classmethod
    def validar_forca_senha(cls, v: str) -> str:
        if len(v) < 6: # ou 8, conforme o nível de exigência
            raise ValueError('A senha deve ter pelo menos 6 caracteres.')
        if not re.search(r"[A-Z]", v): # pyright: ignore[reportUndefinedVariable]
            raise ValueError('A senha deve conter pelo menos uma letra maiúscula.')
        if not re.search(r"[a-z]", v): # pyright: ignore[reportUndefinedVariable]
            raise ValueError('A senha deve conter pelo menos uma letra minúscula.')
        if not re.search(r"\d", v): # pyright: ignore[reportUndefinedVariable]
            raise ValueError('A senha deve conter pelo menos um número.')
        return v


class LoginSchema(BaseModel):
    email: EmailStr
    senha: str


# Compatibilidade com código que utiliza o nome UserLogin.
UserLogin = LoginSchema


class UserResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    role: UserRole
    is_active: Optional[bool] = True
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    veiculo: Optional[str] = None
    placa_veiculo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# PRODUTOS
class ProductBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float = Field(gt=0) # pyright: ignore[reportUndefinedVariable]
    categoria: str
    imagem: Optional[str] = None
    disponivel: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco: Optional[float] = Field(default=None, gt=0) # pyright: ignore[reportUndefinedVariable]
    categoria: Optional[str] = None
    imagem: Optional[str] = None
    disponivel: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    loja_id: int
    loja_nome: Optional[str] = None
    nome: str
    descricao: Optional[str] = None
    preco: float
    categoria: str
    imagem: Optional[str] = None
    disponivel: bool

    model_config = ConfigDict(from_attributes=True)


class LojaPublicaResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    endereco: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ITENS DOS PEDIDOS
class OrderItemCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0) # pyright: ignore[reportUndefinedVariable]


class OrderItemResponse(BaseModel):
    id: int
    pedido_id: int
    produto_id: int
    nome_produto: str
    preco_unitario: float
    quantidade: int

    class Config:
        from_attributes = True



# PEDIDOS
class OrderCreate(BaseModel):
    loja_id: int
    itens: List[OrderItemCreate]
    endereco_entrega: Optional[str] = None
    observacao: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderResponse(BaseModel):
    id: int
    cliente_id: int
    loja_id: int
    loja_nome: Optional[str] = None  # <--- Adicionado aqui
    entregador_id: Optional[int] = None
    status: OrderStatus
    total: float
    endereco_entrega: str
    observacao: Optional[str] = None
    criado_em: Optional[datetime] = None
    itens: List[OrderItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )

# RECUPERAÇÃO DE SENHA
class ForgotPasswordSchema(BaseModel):
    email: EmailStr


class ResetPasswordSchema(BaseModel):
    token: str
    nova_senha: str

    @field_validator('nova_senha')
    @classmethod
    def validar_forca_nova_senha(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('A senha deve ter pelo menos 6 caracteres.')
        if not re.search(r"[A-Z]", v):
            raise ValueError('A senha deve conter pelo menos uma letra maiúscula.')
        if not re.search(r"[a-z]", v):
            raise ValueError('A senha deve conter pelo menos uma letra minúscula.')
        if not re.search(r"\d", v):
            raise ValueError('A senha deve conter pelo menos um número.')
        return v