from pydantic import BaseModel, EmailStr, Field
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