
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import UserRole, OrderStatus


# =========================
# AUTENTICAÇÃO E USUÁRIOS
# =========================

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: UserRole = UserRole.CLIENTE
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    veiculo: Optional[str] = None
    placa_veiculo: Optional[str] = None


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


# =========================
# PRODUTOS
# =========================

class ProductCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float = Field(gt=0)
    categoria: str
    disponivel: bool = True


class ProductUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco: Optional[float] = Field(default=None, gt=0)
    categoria: Optional[str] = None
    disponivel: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    loja_id: int
    nome: str
    descricao: Optional[str] = None
    preco: float
    categoria: str
    disponivel: bool

    model_config = ConfigDict(from_attributes=True)


# =========================
# ITENS DOS PEDIDOS
# =========================

class OrderItemCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0)


class OrderItemResponse(BaseModel):
    id: int
    pedido_id: int
    produto_id: int
    nome_produto: str
    preco_unitario: float
    quantidade: int

    model_config = ConfigDict(from_attributes=True)


# =========================
# PEDIDOS
# =========================

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
    entregador_id: Optional[int] = None
    status: OrderStatus
    total: float
    endereco_entrega: Optional[str] = None
    observacao: Optional[str] = None
    criado_em: Optional[datetime] = None
    itens: List[OrderItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )