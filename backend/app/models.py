import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum
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