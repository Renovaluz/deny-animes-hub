// ==========================================================================
// == ARQUIVO CENTRAL DE PROTEÇÃO DE CONTEÚDO E CÓDIGO-FONTE             ==
// == Este script bloqueia clique direito, atalhos de dev e cópia.         ==
// ==========================================================================

(function() {
    'use strict';

    // Para evitar que o script rode em loop ou cause problemas,
    // verificamos se ele já foi inicializado.
    if (window.protectionScriptLoaded) {
        return;
    }
    window.protectionScriptLoaded = true;

    const showWarning = (action) => {
        console.warn(`Ação bloqueada: ${action}. O conteúdo deste site é protegido.`);
        // Você pode adicionar um feedback visual aqui se desejar, como um toast.
        // Por exemplo: showToast('Ação não permitida.', 'warning');
    };

    // 1. Desabilitar o menu de contexto (clique direito do mouse)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showWarning("Menu de contexto");
    }, false);

    // 2. Desabilitar a seleção de texto e cópia via teclado
    // Para ser menos intrusivo, podemos desabilitar apenas a cópia.
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        showWarning("Cópia de conteúdo");
        return false;
    });

    // Desabilitar a seleção de texto via CSS (opcional, mas eficaz)
    const style = document.createElement('style');
    style.innerHTML = 'body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }';
    document.head.appendChild(style);

    // 3. Desabilitar atalhos de teclado comuns para ferramentas de desenvolvedor
    document.addEventListener('keydown', function(e) {
        // Bloquear F12
        if (e.key === "F12" || e.keyCode === 123) {
            e.preventDefault();
            showWarning("Tecla F12");
        }
        // Bloquear Ctrl+Shift+I (Inspecionar)
        if (e.ctrlKey && e.shiftKey && e.key === "I") {
            e.preventDefault();
            showWarning("Ctrl+Shift+I");
        }
        // Bloquear Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.key === "J") {
            e.preventDefault();
            showWarning("Ctrl+Shift+J");
        }
        // Bloquear Ctrl+U (Ver código-fonte)
        if (e.ctrlKey && e.key === "U") {
            e.preventDefault();
            showWarning("Ctrl+U");
        }
        // Bloquear Ctrl+S (Salvar página)
        if (e.ctrlKey && e.key === "S") {
            e.preventDefault();
            showWarning("Ctrl+S");
        }
    }, false);
    
    // 4. Detecção de abertura das Ferramentas de Desenvolvedor (DevTools)
    const devtools = {
        open: false,
        orientation: null
    };
    const threshold = 170;

    const checkDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
            if (!devtools.open) {
                showWarning("Ferramentas de desenvolvedor detectadas");
                // Ação opcional: Redirecionar ou limpar a página
                // window.location.href = "/";
            }
            devtools.open = true;
        } else {
            devtools.open = false;
        }
    };
    
    // Roda a verificação de DevTools em um intervalo
    // Desabilitado por padrão para não consumir recursos, mas pode ser ativado.
    // setInterval(checkDevTools, 1000);

    console.log("Módulo de proteção Akatsuki ativado.");

})();