from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models import UserRole, OrderStatus

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


# Contratos de Produtos
class ProductCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=150, description="Nome do produto")
    descricao: Optional[str] = Field(None, description="Descrição detalhada do produto")
    preco: float = Field(..., gt=0, description="Preço do produto em reais")
    categoria: str = Field(..., min_length=1, max_length=100, description="Ex: Lanches, Bebidas, Sobremesas")
    disponivel: bool = Field(True, description="Indica se o produto está disponível no cardápio")

    model_config = {
        "json_schema_extra": {
            "example": {
                "nome": "Pizza Margherita",
                "descricao": "Molho de tomate artesanal, mussarela e manjericão fresco",
                "preco": 39.90,
                "categoria": "Pizzas",
                "disponivel": True
            }
        }
    }


class ProductUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=150, description="Nome do produto")
    descricao: Optional[str] = Field(None, description="Descrição detalhada do produto")
    preco: Optional[float] = Field(None, gt=0, description="Preço do produto em reais")
    categoria: Optional[str] = Field(None, min_length=1, max_length=100, description="Ex: Lanches, Bebidas, Sobremesas")
    disponivel: Optional[bool] = Field(None, description="Disponibilidade do produto")

    model_config = {
        "json_schema_extra": {
            "example": {
                "nome": "Pizza Margherita Especial",
                "descricao": "Molho especial, mussarela de búfala e manjericão fresco",
                "preco": 44.90,
                "categoria": "Pizzas",
                "disponivel": True
            }
        }
    }


class ProductResponse(BaseModel):
    id: int
    loja_id: int
    nome: str
    descricao: Optional[str] = None
    preco: float
    categoria: str
    disponivel: bool

    class Config:
        from_attributes = True


# Contratos de Pedidos
class OrderItemCreate(BaseModel):
    produto_id: int = Field(..., gt=0)
    quantidade: int = Field(..., gt=0, description="Quantidade do produto")


class OrderCreate(BaseModel):
    loja_id: int = Field(..., gt=0, description="ID da loja onde o pedido será feito")
    itens: List[OrderItemCreate] = Field(..., min_length=1, description="Itens do pedido")
    endereco_entrega: Optional[str] = Field(None, description="Endereço de entrega")
    observacao: Optional[str] = Field(None, description="Observações gerais do pedido")

    model_config = {
        "json_schema_extra": {
            "example": {
                "loja_id": 1,
                "itens": [
                    {"produto_id": 1, "quantidade": 2},
                    {"produto_id": 3, "quantidade": 1}
                ],
                "endereco_entrega": "Rua das Flores, 123",
                "observacao": "Caprichar no molho!"
            }
        }
    }


class OrderItemResponse(BaseModel):
    produto_id: int
    nome_produto: str
    preco_unitario: float
    quantidade: int

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    cliente_id: int
    loja_id: int
    status: OrderStatus
    total: float
    endereco_entrega: Optional[str] = None
    observacao: Optional[str] = None
    criado_em: datetime
    itens: List[OrderItemResponse]

    class Config:
        from_attributes = True
        use_enum_values = True


