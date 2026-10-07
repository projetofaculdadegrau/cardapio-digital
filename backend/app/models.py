import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base

class UserRole(str, enum.Enum):
    CLIENTE = "CLIENTE"
    LOJA = "LOJA"
    ENTREGADOR = "ENTREGADOR"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole, native_enum=False), nullable=False, default=UserRole.CLIENTE)
    is_active = Column(Boolean, default=True)
    
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    veiculo = Column(String, nullable=True)
    placa_veiculo = Column(String, nullable=True)

    produtos = relationship("Product", back_populates="loja", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    loja_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    preco = Column(Float, nullable=False)
    categoria = Column(String, nullable=False)
    disponivel = Column(Boolean, default=True, nullable=False)

    loja = relationship("User", back_populates="produtos")


# Alias em português para compatibilidade
Produto = Product