from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
from app.db import engine, Base
import app.models  # Garante que todos os modelos estejam registrados no Base
from app.auth import router as auth_router
from app.products import router as products_router

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

@app.get("/")
def home():
    return {"status": "API Burger Master rodando com sucesso!"}