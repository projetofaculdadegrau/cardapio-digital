from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db import get_db
from app.models import User, Product, UserRole, OrderItem
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, LojaPublicaResponse
from app.auth import get_current_user

router = APIRouter(prefix="/produtos", tags=["Produtos / Cardápio"])


def get_current_loja(current_user: User = Depends(get_current_user)) -> User:
    """Valida se o usuário autenticado possui o perfil (role) LOJA."""
    if current_user.role != UserRole.LOJA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: apenas estabelecimentos (LOJA) têm permissão para gerenciar produtos."
        )
    return current_user


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def criar_produto(
    produto_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_loja)
):
    """
    Cria um novo produto no cardápio da loja autenticada.
    - Apenas usuários com role == LOJA.
    - O loja_id é vinculado automaticamente a partir do token JWT do usuário autenticado.
    """
    try:
        novo_produto = Product(
            loja_id=current_user.id,
            nome=produto_in.nome.strip(),
            descricao=produto_in.descricao.strip() if produto_in.descricao else None,
            preco=round(produto_in.preco, 2),
            categoria=produto_in.categoria.strip(),
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
    """
    Vitrine pública de produtos/cardápio:
    - Lista pratos de todas as lojas ou filtrados por loja_id.
    - Suporta busca textual e filtro por categoria.
    - Por padrão exibe produtos ativos (disponivel: true).
    """
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
    """
    Lista todos os estabelecimentos (lojas) parceiros ativos.
    """
    return (
        db.query(User)
        .filter(User.role == UserRole.LOJA, User.is_active == True)
        .order_by(User.nome.asc())
        .all()
    )


@router.get("/loja/{loja_id}", response_model=List[ProductResponse])
def listar_cardapio_loja(
    loja_id: int,
    apenas_disponiveis: Optional[bool] = Query(
        None,
        description="Filtrar por disponibilidade. Se True, traz apenas itens disponíveis. Se omitido, traz todos."
    ),
    db: Session = Depends(get_db)
):
    """
    Rota pública/aberta para listar o cardápio de uma loja específica.
    """
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
    """
    Lista todos os produtos cadastrados pelo estabelecimento (LOJA) atualmente autenticado.
    """
    produtos = db.query(Product).filter(Product.loja_id == current_user.id).order_by(Product.id.asc()).all()
    return produtos


@router.get("/{id}", response_model=ProductResponse)
def obter_produto_por_id(
    id: int,
    db: Session = Depends(get_db)
):
    """
    Rota pública para obter detalhes de um produto específico por ID.
    """
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
    """
    Atualiza os dados de um produto existente.
    - Exige perfil LOJA.
    - Garante que a LOJA só consiga editar produtos pertencentes a ela.
    """
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
    """
    Exclui um produto do cardápio definitivamente.
    Caso o produto esteja atrelado a itens de pedidos legados,
    desvincula as referências e conclui a exclusão do produto.
    """
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
        # Tenta a exclusão direta do produto
        db.delete(produto)
        db.commit()
        return {"message": "Produto removido definitivamente com sucesso.", "id": id}

    except IntegrityError:
        # Se falhar por estar associado a itens de pedidos (order_items),
        # desvincula os registros dependentes e conclui a exclusão física.
        db.rollback()
        db.query(OrderItem).filter(OrderItem.produto_id == id).delete(synchronize_session=False)
        
        # Apaga o produto definitivamente
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
