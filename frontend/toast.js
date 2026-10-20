/**
 * Sistema de Toasts Flutuantes Global
 * Padronizado para frontend/login, frontend/cliente, frontend/loja, frontend/entregador
 *
 * Cores e Tipos por Evento:
 *  - 'sucesso' / 'cadastro'  -> Verde (#26845b)
 *  - 'edicao'  / 'alteracao' -> Azul (#0284c7)
 *  - 'exclusao'/ 'erro'      -> Vermelho (#ba1a1a)
 *  - 'aviso'                 -> Amarelo (#ffc85e)
 */

(function () {
    let toastTimer = null;

    function obterOuCriarToastElemento() {
        let toast = document.getElementById('toast-flutuante');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-flutuante';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        return toast;
    }

    function escaparHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizarTipo(tipo) {
        if (!tipo) return 'sucesso';
        const t = String(tipo).toLowerCase().trim();
        if (t === 'cadastro' || t === 'success' || t === 'sucesso') return 'sucesso';
        if (t === 'edicao' || t === 'edição' || t === 'alteracao' || t === 'alteração' || t === 'info') return 'edicao';
        if (t === 'exclusao' || t === 'exclusão' || t === 'delete' || t === 'erro' || t === 'error') return 'erro';
        if (t === 'aviso' || t === 'warn' || t === 'warning') return 'aviso';
        return 'sucesso';
    }

    function obterIcone(tipoNormalizado) {
        switch (tipoNormalizado) {
            case 'sucesso':
                return '<span class="material-symbols-outlined" style="font-size:18px;line-height:1;display:inline-flex;align-items:center;">check_circle</span>';
            case 'edicao':
                return '<span class="material-symbols-outlined" style="font-size:18px;line-height:1;display:inline-flex;align-items:center;">edit</span>';
            case 'erro':
                return '<span class="material-symbols-outlined" style="font-size:18px;line-height:1;display:inline-flex;align-items:center;">error</span>';
            case 'aviso':
                return '<span class="material-symbols-outlined" style="font-size:18px;line-height:1;display:inline-flex;align-items:center;">warning</span>';
            default:
                return '<span class="material-symbols-outlined" style="font-size:18px;line-height:1;display:inline-flex;align-items:center;">info</span>';
        }
    }

    function mostrarToast(mensagem, tipo = 'sucesso', duracao = 3200) {
        const toast = obterOuCriarToastElemento();
        if (!toast) {
            console.log(`[Toast ${tipo}]:`, mensagem);
            return;
        }

        const tipoNorm = normalizarTipo(tipo);
        clearTimeout(toastTimer);

        // Aplica classe específica para o tipo estilizado (ex: toast-sucesso, toast-edicao, toast-erro, toast-aviso)
        toast.className = `toast-${tipoNorm}`;
        toast.innerHTML = `${obterIcone(tipoNorm)} <span>${escaparHtml(mensagem)}</span>`;

        // Reflow para reiniciar a animação suave de transição caso já estivesse visível
        void toast.offsetWidth;
        toast.classList.add('toast-visivel');

        toastTimer = setTimeout(() => {
            toast.classList.remove('toast-visivel');
        }, duracao);
    }

    function mostrarAlertaToast(mensagem, sucesso = false) {
        mostrarToast(mensagem, sucesso ? 'sucesso' : 'erro');
    }

    // Exporta globalmente
    window.mostrarToast = mostrarToast;
    window.mostrarAlertaToast = mostrarAlertaToast;
})();
