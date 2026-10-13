
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Enum,
    Float,
    ForeignKey,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

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
    role = Column(
        Enum(UserRole, native_enum=False),
        nullable=False,
        default=UserRole.CLIENTE,
    )
    is_active = Column(Boolean, default=True)

    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    veiculo = Column(String, nullable=True)
    placa_veiculo = Column(String, nullable=True)

    produtos = relationship(
        "Product",
        back_populates="loja",
        cascade="all, delete-orphan",
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    loja_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    preco = Column(Float, nullable=False)
    categoria = Column(String, nullable=False)
    disponivel = Column(Boolean, default=True, nullable=False)

    loja = relationship("User", back_populates="produtos")


Produto = Product


class OrderStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    EM_PREPARO = "EM_PREPARO"
    PRONTO_PARA_ENVIO = "PRONTO_PARA_ENVIO"
    A_CAMINHO = "A_CAMINHO"
    ENTREGUE = "ENTREGUE"
    CANCELADO = "CANCELADO"
    RECEBIDO = "RECEBIDO"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    loja_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    entregador_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    status = Column(
        Enum(OrderStatus, native_enum=False),
        nullable=False,
        default=OrderStatus.PENDENTE,
    )
    total = Column(Float, nullable=False, default=0.0)
    endereco_entrega = Column(String, nullable=True)
    observacao = Column(String, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    cliente = relationship("User", foreign_keys=[cliente_id])
    loja = relationship("User", foreign_keys=[loja_id])
    entregador = relationship("User", foreign_keys=[entregador_id])

    itens = relationship(
        "OrderItem",
        back_populates="pedido",
        cascade="all, delete-orphan",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False,
        index=True,
    )
    produto_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )
    nome_produto = Column(String, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    quantidade = Column(Integer, nullable=False)

    pedido = relationship("Order", back_populates="itens")
    produto = relationship("Product")


Pedido = Order
ItemPedido = OrderItem