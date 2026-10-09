from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, Product, Order, OrderItem, UserRole
from app.schemas import OrderCreate, OrderResponse
from app.auth import get_current_user

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


def get_current_cliente(current_user: User = Depends(get_current_user)) -> User:
    """Valida se o usuário autenticado possui o perfil (role) CLIENTE."""
    if current_user.role != UserRole.CLIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: apenas clientes (CLIENTE) podem fazer pedidos."
        )
    return current_user


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def criar_pedido(
    pedido_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_cliente)
):
    """
    Cria um novo pedido com múltiplos itens, vinculado a uma loja.
    - Apenas CLIENTE autenticado.
    - Todos os itens precisam pertencer à mesma loja.
    - O preço de cada item é 'congelado' no momento do pedido.
    """
    # 1. Valida a loja
    loja = db.query(User).filter(User.id == pedido_in.loja_id, User.role == UserRole.LOJA).first()
    if not loja:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loja com ID {pedido_in.loja_id} não encontrada."
        )

    try:
        novo_pedido = Order(
            cliente_id=current_user.id,
            loja_id=loja.id,
            endereco_entrega=(pedido_in.endereco_entrega or current_user.endereco),
            observacao=pedido_in.observacao,
        )

        total = 0.0
        for item in pedido_in.itens:
            produto = db.query(Product).filter(Product.id == item.produto_id).first()
            if not produto:
                raise HTTPException(status.HTTP_404_NOT_FOUND,
                                    f"Produto {item.produto_id} não encontrado.")
            if produto.loja_id != loja.id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                    f"O produto '{produto.nome}' não pertence à loja selecionada.")
            if not produto.disponivel:
                raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                    f"O produto '{produto.nome}' está indisponível.")

            total += produto.preco * item.quantidade
            novo_pedido.itens.append(OrderItem(
                produto_id=produto.id,
                nome_produto=produto.nome,
                preco_unitario=produto.preco,
                quantidade=item.quantidade,
            ))

        novo_pedido.total = round(total, 2)

        db.add(novo_pedido)
        db.commit()
        db.refresh(novo_pedido)
        return novo_pedido

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao criar pedido: {str(e)}"
        )


@router.get("/meus-pedidos", response_model=List[OrderResponse])
def listar_meus_pedidos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_cliente)
):
    """Lista os pedidos do cliente autenticado (útil pra testar e pro histórico)."""
    return db.query(Order).filter(Order.cliente_id == current_user.id).order_by(Order.id.desc()).all()