import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db import get_db
from app.models import User, Product, UserRole, OrderItem
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, LojaPublicaResponse
from app.auth import get_current_user


router = APIRouter(prefix="/produtos", tags=["Produtos / Cardápio"])


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_current_loja(current_user: User = Depends(get_current_user)) -> User:
    """Valida se o usuário autenticado possui o perfil (role) LOJA."""
    if current_user.role != UserRole.LOJA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: apenas estabelecimentos (LOJA) têm permissão para gerenciar produtos."
        )
    return current_user


@router.post("/upload-imagem")
async def upload_imagem_produto(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_loja)
):
    """
    Recebe um arquivo de imagem, salva no servidor local e retorna a URL pública.
    """
    extensao = os.path.splitext(file.filename)[1].lower()
    if extensao not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de arquivo inválido. Envie apenas imagens (.jpg, .jpeg, .png, .webp)."
        )

    nome_arquivo_unico = f"{uuid.uuid4().hex}{extensao}"
    caminho_arquivo = os.path.join(UPLOAD_DIR, nome_arquivo_unico)

    try:
        conteudo = await file.read()
        with open(caminho_arquivo, "wb") as f:
            f.write(conteudo)

        url_imagem = f"http://127.0.0.1:8000/static/uploads/{nome_arquivo_unico}"
        return {"imagem_url": url_imagem}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar arquivo de imagem: {str(e)}"
        )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def criar_produto(
    produto_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_loja)
):
    try:
        novo_produto = Product(
            loja_id=current_user.id,
            nome=produto_in.nome.strip(),
            descricao=produto_in.descricao.strip() if produto_in.descricao else None,
            preco=round(produto_in.preco, 2),
            categoria=produto_in.categoria.strip(),
            imagem=produto_in.imagem.strip() if produto_in.imagem else None,
            disponivel=produto_in.disponivel
        )
        
        db.add(novo_produto)
        db.commit()
        db.refresh(novo_produto)
        return novo_produto

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao criar produto: {str(e)}"
        )


@router.get("", response_model=List[ProductResponse])
def listar_todos_produtos(
    loja_id: Optional[int] = Query(None, description="Filtrar por loja específica"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria"),
    busca: Optional[str] = Query(None, description="Buscar por nome ou descrição do prato"),
    apenas_disponiveis: bool = Query(True, description="Filtrar apenas pratos ativos (disponivel = True)"),
    db: Session = Depends(get_db)
):
    query = db.query(Product)

    if apenas_disponiveis:
        query = query.filter(Product.disponivel == True)

    if loja_id is not None:
        query = query.filter(Product.loja_id == loja_id)

    if categoria and categoria.strip():
        query = query.filter(func.lower(Product.categoria) == categoria.strip().lower())

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            (Product.nome.ilike(termo)) | (Product.descricao.ilike(termo))
        )

    return query.order_by(Product.categoria.asc(), Product.nome.asc()).all()


@router.get("/lojas", response_model=List[LojaPublicaResponse])
def listar_lojas_produtos(db: Session = Depends(get_db)):
    return (
        db.query(User)
        .filter(User.role == UserRole.LOJA, User.is_active == True)
        .order_by(User.nome.asc())
        .all()
    )


@router.get("/loja/{loja_id}", response_model=List[ProductResponse])
def listar_cardapio_loja(
    loja_id: int,
    apenas_disponiveis: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    loja = db.query(User).filter(User.id == loja_id, User.role == UserRole.LOJA).first()
    if not loja:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estabelecimento com ID {loja_id} não encontrado ou não possui perfil de LOJA."
        )

    query = db.query(Product).filter(Product.loja_id == loja_id)
    if apenas_disponiveis is not None:
        query = query.filter(Product.disponivel == apenas_disponiveis)

    return query.all()


@router.get("/meus-produtos", response_model=List[ProductResponse])
def listar_meus_produtos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_loja)
):
    produtos = db.query(Product).filter(Product.loja_id == current_user.id).order_by(Product.id.asc()).all()
    return produtos


@router.get("/{id}", response_model=ProductResponse)
def obter_produto_por_id(id: int, db: Session = Depends(get_db)):
    produto = db.query(Product).filter(Product.id == id).first()
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto com ID {id} não encontrado."
        )
    return produto


@router.put("/{id}", response_model=ProductResponse)
def atualizar_produto(
    id: int,
    produto_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_loja)
):
    produto = db.query(Product).filter(Product.id == id).first()
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto com ID {id} não encontrado."
        )

    if produto.loja_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para alterar produtos de outro estabelecimento."
        )

    try:
        update_data = produto_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if isinstance(value, str):
                value = value.strip()
            elif field == "preco" and value is not None:
                value = round(value, 2)
            if hasattr(produto, field):
                setattr(produto, field, value)

        db.commit()
        db.refresh(produto)
        return produto

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao atualizar produto: {str(e)}"
        )


@router.delete("/{id}")
def remover_produto(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_loja)
):
    produto = db.query(Product).filter(Product.id == id).first()
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto com ID {id} não encontrado."
        )

    if produto.loja_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para remover produtos de outro estabelecimento."
        )

    try:
        db.delete(produto)
        db.commit()
        return {"message": "Produto removido definitivamente com sucesso.", "id": id}

    except IntegrityError:
        db.rollback()
        db.query(OrderItem).filter(OrderItem.produto_id == id).delete(synchronize_session=False)
        
        produto_para_deletar = db.query(Product).filter(Product.id == id).first()
        if produto_para_deletar:
            db.delete(produto_para_deletar)
            db.commit()

        return {"message": "Produto e histórico associado removidos com sucesso.", "id": id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao remover produto: {str(e)}"
        )