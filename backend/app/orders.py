
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import (
    User,
    Product,
    Order,
    OrderItem,
    UserRole,
    OrderStatus,
)
from app.schemas import OrderCreate, OrderResponse, OrderStatusUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


def get_current_cliente(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.CLIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas clientes podem fazer pedidos.",
        )
    return current_user


def get_current_loja(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.LOJA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas lojas podem realizar esta operação.",
        )
    return current_user


def get_current_entregador(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ENTREGADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas entregadores podem realizar esta operação.",
        )
    return current_user


# --------------------------------------------------
# CLIENTE: criar pedido
# --------------------------------------------------

@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_pedido(
    pedido_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_cliente),
):
    loja = db.query(User).filter(
        User.id == pedido_in.loja_id,
        User.role == UserRole.LOJA,
    ).first()

    if not loja:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loja não encontrada.",
        )

    try:
        novo_pedido = Order(
            cliente_id=current_user.id,
            loja_id=loja.id,
            endereco_entrega=(
                pedido_in.endereco_entrega or current_user.endereco
            ),
            observacao=pedido_in.observacao,
        )

        total = 0.0

        for item in pedido_in.itens:
            produto = db.query(Product).filter(
                Product.id == item.produto_id
            ).first()

            if not produto:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produto {item.produto_id} não encontrado.",
                )

            if produto.loja_id != loja.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="O produto não pertence à loja selecionada.",
                )

            if not produto.disponivel:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"O produto '{produto.nome}' está indisponível.",
                )

            total += produto.preco * item.quantidade

            novo_pedido.itens.append(
                OrderItem(
                    produto_id=produto.id,
                    nome_produto=produto.nome,
                    preco_unitario=produto.preco,
                    quantidade=item.quantidade,
                )
            )

        novo_pedido.total = round(total, 2)

        db.add(novo_pedido)
        db.commit()
        db.refresh(novo_pedido)

        return novo_pedido

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar pedido.",
        )


# --------------------------------------------------
# CLIENTE: listar seus pedidos
# --------------------------------------------------

@router.get("/meus-pedidos", response_model=List[OrderResponse])
def listar_meus_pedidos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_cliente),
):
    return (
        db.query(Order)
        .filter(Order.cliente_id == current_user.id)
        .order_by(Order.id.desc())
        .all()
    )


# --------------------------------------------------
# LOJA: listar pedidos da loja autenticada
# --------------------------------------------------

@router.get("/loja/recebidos", response_model=List[OrderResponse])
def listar_pedidos_da_loja(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_loja),
):
    return (
        db.query(Order)
        .filter(Order.loja_id == current_user.id)
        .order_by(Order.id.desc())
        .all()
    )


# --------------------------------------------------
# LOJA: atualizar status de preparação
# --------------------------------------------------

@router.patch("/{pedido_id}/status", response_model=OrderResponse)
def atualizar_status_pedido(
    pedido_id: int,
    dados: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_loja),
):
    pedido = db.query(Order).filter(
        Order.id == pedido_id,
        Order.loja_id == current_user.id,
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado para esta loja.",
        )

    transicoes_validas = {
        OrderStatus.PENDENTE: {OrderStatus.EM_PREPARO},
        OrderStatus.RECEBIDO: {OrderStatus.EM_PREPARO},
        OrderStatus.EM_PREPARO: {OrderStatus.PRONTO_PARA_ENVIO},
    }

    status_permitidos = transicoes_validas.get(pedido.status, set())

    if dados.status not in status_permitidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transição inválida: {pedido.status.value} "
                f"para {dados.status.value}."
            ),
        )

    pedido.status = dados.status

    try:
        db.commit()
        db.refresh(pedido)
        return pedido
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar o status do pedido.",
        )


# --------------------------------------------------
# ENTREGADOR: listar pedidos prontos e sem entregador
# --------------------------------------------------

@router.get("/disponiveis", response_model=List[OrderResponse])
def listar_pedidos_disponiveis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_entregador),
):
    return (
        db.query(Order)
        .filter(
            Order.status == OrderStatus.PRONTO_PARA_ENVIO,
            Order.entregador_id.is_(None),
        )
        .order_by(Order.id.asc())
        .all()
    )


# --------------------------------------------------
# ENTREGADOR: aceitar entrega
# --------------------------------------------------

@router.patch("/{pedido_id}/aceitar", response_model=OrderResponse)
def aceitar_entrega(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_entregador),
):
    # Atualização condicional: impede que dois entregadores
    # aceitem o mesmo pedido ao mesmo tempo.
    quantidade_atualizada = (
        db.query(Order)
        .filter(
            Order.id == pedido_id,
            Order.status == OrderStatus.PRONTO_PARA_ENVIO,
            Order.entregador_id.is_(None),
        )
        .update(
            {
                Order.entregador_id: current_user.id,
                Order.status: OrderStatus.A_CAMINHO,
            },
            synchronize_session=False,
        )
    )

    if quantidade_atualizada == 0:
        db.rollback()

        pedido_existe = db.query(Order.id).filter(
            Order.id == pedido_id
        ).first()

        if not pedido_existe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido não encontrado.",
            )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pedido indisponível ou já aceito por outro entregador.",
        )

    try:
        db.commit()
        pedido = db.query(Order).filter(
            Order.id == pedido_id
        ).first()
        return pedido
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao aceitar a entrega.",
        )


# --------------------------------------------------
# ENTREGADOR: finalizar entrega atribuída a ele
# --------------------------------------------------

@router.patch("/{pedido_id}/finalizar", response_model=OrderResponse)
def finalizar_entrega(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_entregador),
):
    pedido = db.query(Order).filter(
        Order.id == pedido_id,
        Order.entregador_id == current_user.id,
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado para este entregador.",
        )

    if pedido.status != OrderStatus.A_CAMINHO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Somente entregas em andamento podem ser finalizadas.",
        )

    try:
        pedido.status = OrderStatus.ENTREGUE
        db.commit()
        db.refresh(pedido)
        return pedido
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao finalizar a entrega.",
        )