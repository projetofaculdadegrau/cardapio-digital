from typing import List
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.config import settings
from app.db import engine, Base, get_db
import app.models  # Garante que todos os modelos estejam registrados no Base
from app.models import User, UserRole
from app.schemas import LojaPublicaResponse
from app.auth import router as auth_router
from app.products import router as products_router
from app.orders import router as orders_router

# Cria as tabelas automaticamente no PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    # Configuração para habilitar o botão 'Authorize' com Bearer Token no Swagger UI
    swagger_ui_parameters={"persistAuthorization": True}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra as rotas
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(orders_router)

@app.get("/")
def home():
    return {"status": "API Cardápio Digital rodando com sucesso!"}


@app.get("/lojas", response_model=List[LojaPublicaResponse], tags=["Lojas / Estabelecimentos"])
def listar_lojas_publicas(db: Session = Depends(get_db)):
    return (
        db.query(User)
        .filter(User.role == UserRole.LOJA, User.is_active == True)
        .order_by(User.nome.asc())
        .all()
    )