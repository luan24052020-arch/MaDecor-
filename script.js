// ======================================
// MA DECOR - SISTEMA DE CONTROLE
// ======================================

const listaVidros = document.getElementById("listaVidros");
const botaoAdicionar = document.getElementById("adicionarVidro");
const formulario = document.getElementById("formPedido");
const listaPedidos = document.getElementById("listaPedidos");
let listaConcluidos;
const pesquisaPedidos = document.getElementById("pesquisaPedidos");

const PRAZO_DIAS = 30;
const CHAVE = "pedidosMA";

const etapas = [
    "Recebido",
    "Em preparação",
    "Aguardando aprovação",
    "Aprovado",
    "Em produção",
    "Aguardando embalagem",
    "Em estoque",
    "Pronto para retirada",
    "Retirado"
];

// ======================================
// ARMAZENAMENTO
// ======================================

function buscarPedidos() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE)) || [];
    } catch {
        return [];
    }
}

function salvarPedidos(pedidos) {
    localStorage.setItem(CHAVE, JSON.stringify(pedidos));
}

function obterDataHoje() {
    const hoje = new Date();

    return [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0")
    ].join("-");
}

function formatarData(data) {
    if (!data) return "Não registrada";

    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
}

function somarDias(data, dias) {
    const [ano, mes, dia] = data.split("-").map(Number);

    const nova = new Date(ano, mes - 1, dia);
    nova.setDate(nova.getDate() + dias);

    return [
        nova.getFullYear(),
        String(nova.getMonth() + 1).padStart(2, "0"),
        String(nova.getDate()).padStart(2, "0")
    ].join("-");
}

// ======================================
// PRAZOS
// ======================================

function obterSituacaoPrazo(vidro) {
    if (["Pronto para retirada", "Retirado"].includes(vidro.status)) {
        return {
            texto: "Produto pronto",
            situacao: "finalizado"
        };
    }

    if (!vidro.dataAprovacao) {
        return {
            texto: "Prazo ainda não iniciado",
            situacao: "naoIniciado"
        };
    }

    const limite = somarDias(vidro.dataAprovacao, PRAZO_DIAS);

    if (obterDataHoje() > limite) {
        return {
            texto: "ATRASADO",
            situacao: "atrasado",
            data: limite
        };
    }

    return {
        texto: "Dentro do prazo",
        situacao: "noPrazo",
        data: limite
    };
}

function obterPrevisaoPedido(pedido) {
    const vidros = pedido.vidros || [];

    if (!vidros.length) return "Nenhum material cadastrado.";

    if (vidros.every(v =>
        ["Pronto para retirada", "Retirado"].includes(v.status)
    )) {
        return "Todos os produtos estão prontos para retirada.";
    }

    const aprovados = vidros.filter(v => v.dataAprovacao);

    if (!aprovados.length) {
        return "Aguardando aprovação das cores.";
    }

    const maiorPrazo = aprovados
        .map(v => somarDias(v.dataAprovacao, PRAZO_DIAS))
        .sort()
        .pop();

    if (aprovados.length < vidros.length) {
        return "Previsão parcial até " + formatarData(maiorPrazo) +
            ". Existem materiais aguardando aprovação.";
    }

    return "Previsão de retirada: até " + formatarData(maiorPrazo);
}

// ======================================
// CORES E RESUMOS
// ======================================

function obterCor(status) {
    const cores = {
        "Recebido": "#fef3c7",
        "Em preparação": "#dbeafe",
        "Aguardando aprovação": "#ffedd5",
        "Aprovado": "#dcfce7",
        "Em produção": "#ede9fe",
        "Aguardando embalagem": "#fce7f3",
        "Em estoque": "#e2e8f0",
        "Pronto para retirada": "#bbf7d0",
        "Retirado": "#d1d5db"
    };

    return cores[status] || "#e2e8f0";
}

function obterResumoPedido(pedido) {
    const status = [
        ...new Set((pedido.vidros || []).map(v => v.status))
    ];

    return status.length === 1 ? status[0] : "Etapas diferentes";
}

// ======================================
// ADICIONAR MATERIAIS
// ======================================

function adicionarCampoVidro() {
    const bloco = document.createElement("div");
    bloco.className = "item-vidro";

    bloco.innerHTML = `
        <div class="campo">
            <label>Tipo de material</label>
            <input type="text" class="tipoVidro"
                placeholder="Ex.: Vidro redondo" required>
        </div>

        <div class="campo">
            <label>Quantidade</label>
            <input type="number" class="quantidade"
                min="1" placeholder="Quantidade" required>
        </div>

        <div class="campo">
            <label>Cor solicitada</label>
            <input type="text" class="cor"
                placeholder="Ex.: Preto">
        </div>

        <div class="campo">
            <label>Código de barras</label>
            <input type="text" class="codigoBarras"
                placeholder="Código do material">
        </div>

        <button type="button" class="removerMaterial">
            Remover material
        </button>
    `;

    bloco.querySelector(".removerMaterial").addEventListener("click", () => {
        if (listaVidros.children.length > 1) {
            bloco.remove();
        } else {
            alert("O pedido precisa ter pelo menos um material.");
        }
    });

    listaVidros.appendChild(bloco);
}

botaoAdicionar.addEventListener("click", adicionarCampoVidro);

// ======================================
// CADASTRAR PEDIDO
// ======================================

formulario.addEventListener("submit", function(event) {
    event.preventDefault();

    const pedidos = buscarPedidos();

    const vidros = [
        ...listaVidros.querySelectorAll(".item-vidro")
    ].map(item => ({
        tipo: item.querySelector(".tipoVidro").value.trim(),
        quantidade: Number(item.querySelector(".quantidade").value),
        cor: item.querySelector(".cor").value.trim(),
        codigoBarras: item.querySelector(".codigoBarras").value.trim(),
        status: "Recebido",
        dataAprovacao: null,
        historico: [{
            status: "Recebido",
            data: new Date().toLocaleString("pt-BR")
        }]
    }));

    if (!vidros.length || vidros.some(v =>
        !v.tipo || !Number.isInteger(v.quantidade) || v.quantidade < 1
    )) {
        alert("Confira o tipo e a quantidade de todos os materiais.");
        return;
    }

    const maiorNumero = pedidos.reduce(
        (maior, p) => Math.max(maior, Number(p.numero) || 0), 0
    );

    pedidos.push({
        numero: maiorNumero + 1,
        cliente: document.getElementById("cliente").value.trim(),
        data: document.getElementById("dataEntrada").value,
        vidros,
        observacoes: document.getElementById("observacoes").value.trim()
    });

    salvarPedidos(pedidos);

    alert("Recebimento cadastrado com sucesso!");

    formulario.reset();
    listaVidros.innerHTML = "";
    adicionarCampoVidro();

    mostrarPedidos();
});

// ======================================
// LIMPAR HISTÓRICO
// ======================================

function limparHistoricoVidro(numero, indice) {
    if (!confirm("Deseja apagar o histórico deste material? O registro do recebimento será mantido.")) {
        return;
    }

    const pedidos = buscarPedidos();
    const pedido = pedidos.find(p => p.numero === numero);

    if (!pedido || !pedido.vidros[indice]) return;

    const vidro = pedido.vidros[indice];
    const historico = vidro.historico || [];

    const recebimento = historico.find(item => item.status === "Recebido");

    vidro.historico = recebimento ? [recebimento] : [{
        status: "Recebido",
        data: formatarData(pedido.data)
    }];

    salvarPedidos(pedidos);
    abrirDetalhes(numero);
}

// ======================================
// ALTERAR STATUS
// ======================================

function alterarStatusVidro(numero, indice, novoStatus) {
    const pedidos = buscarPedidos();
    const pedido = pedidos.find(p => p.numero === numero);

    if (!pedido || !pedido.vidros[indice]) return;

    const vidro = pedido.vidros[indice];

    if (vidro.status === novoStatus) return;

    vidro.status = novoStatus;

    if (novoStatus === "Aprovado") {
        vidro.dataAprovacao = obterDataHoje();
    }

    vidro.historico = vidro.historico || [];

    vidro.historico.push({
        status: novoStatus,
        data: new Date().toLocaleString("pt-BR")
    });

    salvarPedidos(pedidos);
    mostrarPedidos();
    abrirDetalhes(numero);
}

// ======================================
// CONTAGEM DE MATERIAIS
// ======================================

function contarMateriais(pedidos, status) {
    return pedidos.reduce((total, pedido) =>
        total + (pedido.vidros || []).filter(v => v.status === status).length, 0
    );
}

function contarUnidades(pedidos) {
    return pedidos.reduce((total, pedido) =>
        total + (pedido.vidros || []).reduce(
            (soma, vidro) => soma + (Number(vidro.quantidade) || 0), 0
        ), 0
    );
}

function dataHistoricoParaNumero(data) {
    if (!data) return 0;

    const partes = data.match(/(\d{2})\/(\d{2})\/(\d{4})(?:,?\s*(\d{2}):(\d{2}))?/);

    if (!partes) return 0;

    return new Date(
        Number(partes[3]),
        Number(partes[2]) - 1,
        Number(partes[1]),
        Number(partes[4] || 0),
        Number(partes[5] || 0)
    ).getTime();
}

// ======================================
// ESTILO DA TELA INICIAL
// ======================================

function criarEstiloPainel() {
    if (document.getElementById("estiloPainelMA")) return;

    const estilo = document.createElement("style");
    estilo.id = "estiloPainelMA";

    estilo.textContent = `
        #inicio .painel-boas-vindas {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:16px;
            flex-wrap:wrap;
            margin-bottom:24px;
        }

        #inicio .painel-boas-vindas h1 {
            margin:0 0 6px;
        }

        #inicio .painel-boas-vindas p {
            margin:0;
            color:#64748b;
        }

        #inicio .painel-grade {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(175px,1fr));
            gap:14px;
            margin:18px 0 26px;
        }

        #inicio .painel-card {
            background:#fff;
            border:1px solid #e2e8f0;
            border-radius:14px;
            padding:18px;
            box-shadow:0 3px 12px rgba(15,23,42,.04);
        }

        #inicio .painel-card .painel-rotulo {
            color:#64748b;
            font-size:13px;
            margin:0 0 10px;
        }

        #inicio .painel-card .painel-numero {
            font-size:30px;
            font-weight:750;
            margin:0;
            color:#172033;
        }

        #inicio .painel-card .painel-icone {
            font-size:20px;
            margin-bottom:10px;
        }

        #inicio .painel-duas-colunas {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
            gap:18px;
            margin-bottom:20px;
        }

        #inicio .painel-bloco {
            background:#fff;
            border:1px solid #e2e8f0;
            border-radius:14px;
            padding:20px;
            margin-bottom:18px;
        }

        #inicio .painel-bloco h2 {
            font-size:18px;
            margin:0 0 18px;
        }

        #inicio .barra-linha {
            margin:13px 0;
        }

        #inicio .barra-topo {
            display:flex;
            justify-content:space-between;
            gap:10px;
            font-size:13px;
            margin-bottom:7px;
        }

        #inicio .barra-fundo {
            height:9px;
            background:#e9edf3;
            border-radius:20px;
            overflow:hidden;
        }

        #inicio .barra-preenchida {
            height:100%;
            background:#3478c8;
            border-radius:20px;
        }

        #inicio .painel-lista {
            display:flex;
            flex-direction:column;
            gap:12px;
        }

        #inicio .painel-atividade {
            border-bottom:1px solid #edf0f4;
            padding-bottom:10px;
            font-size:13px;
        }

        #inicio .painel-atividade:last-child {
            border:0;
            padding-bottom:0;
        }

        #inicio .painel-alerta {
            padding:11px 12px;
            border-radius:9px;
            margin:9px 0;
            font-size:13px;
            background:#fff7ed;
            color:#9a3412;
        }

        #inicio .painel-alerta.atraso {
            background:#fef2f2;
            color:#b91c1c;
        }

        #inicio .painel-acoes {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(145px,1fr));
            gap:10px;
        }

        #inicio .painel-acao {
            display:block;
            text-align:center;
            text-decoration:none;
            color:#1e293b;
            background:#f8fafc;
            border:1px solid #e2e8f0;
            border-radius:10px;
            padding:14px 10px;
            font-weight:600;
            cursor:pointer;
        }

        #inicio .painel-acao:hover {
            background:#eff6ff;
            border-color:#93c5fd;
        }

        #inicio .painel-vazio {
            color:#64748b;
            font-size:13px;
        }

        @media(max-width:600px) {
            #inicio .painel-card {
                padding:14px;
            }

            #inicio .painel-card .painel-numero {
                font-size:25px;
            }
        }
    `;

    document.head.appendChild(estilo);
}

// ======================================
// PAINEL INICIAL
// ======================================

function atualizarPainelInicial(pedidos) {
    const inicio = document.getElementById("inicio");

    if (!inicio) return;

    criarEstiloPainel();

    if (!document.getElementById("painelMA")) {
        inicio.innerHTML = `
            <div id="painelMA">

                <div class="painel-boas-vindas">
                    <div>
                        <h1>Painel de controle</h1>
                        <p>Acompanhe os pedidos e a produção da MA Decor.</p>
                    </div>

                    <div id="painelData" style="color:#64748b;font-size:13px"></div>
                </div>

                <div class="painel-grade">

                    <div class="painel-card">
                        <div class="painel-icone">📋</div>
                        <p class="painel-rotulo">Pedidos ativos</p>
                        <p class="painel-numero" id="painelAtivos">0</p>
                    </div>

                    <div class="painel-card">
                        <div class="painel-icone">🎨</div>
                        <p class="painel-rotulo">Materiais em produção</p>
                        <p class="painel-numero" id="painelProducao">0</p>
                    </div>

                    <div class="painel-card">
                        <div class="painel-icone">⏳</div>
                        <p class="painel-rotulo">Aguardando aprovação</p>
                        <p class="painel-numero" id="painelAprovacao">0</p>
                    </div>

                    <div class="painel-card">
                        <div class="painel-icone">📦</div>
                        <p class="painel-rotulo">Prontos para retirada</p>
                        <p class="painel-numero" id="painelProntos">0</p>
                    </div>

                    <div class="painel-card">
                        <div class="painel-icone">✅</div>
                        <p class="painel-rotulo">Pedidos concluídos</p>
                        <p class="painel-numero" id="painelConcluidos">0</p>
                    </div>

                    <div class="painel-card">
                        <div class="painel-icone">🪟</div>
                        <p class="painel-rotulo">Unidades recebidas</p>
                        <p class="painel-numero" id="painelUnidades">0</p>
                    </div>

                </div>

                <div class="painel-duas-colunas">

                    <div class="painel-bloco">
                        <h2>Produção por etapa</h2>
                        <div id="painelEtapas"></div>
                    </div>

                    <div class="painel-bloco">
                        <h2>Alertas e pendências</h2>
                        <div id="painelAlertas"></div>
                    </div>

                </div>

                <div class="painel-duas-colunas">

                    <div class="painel-bloco">
                        <h2>Últimas movimentações</h2>
                        <div id="painelAtividades" class="painel-lista"></div>
                    </div>

                    <div class="painel-bloco">
                        <h2>Resumo do mês</h2>
                        <div id="painelMes"></div>
                    </div>

                </div>

                <div class="painel-bloco">
                    <h2>Acessos rápidos</h2>
                    <div id="painelAcessos" class="painel-acoes"></div>
                </div>

            </div>
        `;
    }

    const ativos = pedidos.filter(p => !pedidoConcluido(p));
    const concluidos = pedidos.filter(p => pedidoConcluido(p));

    const materiais = pedidos.flatMap(p => p.vidros || []);

    const etapasPainel = [
        "Recebido",
        "Em preparação",
        "Aguardando aprovação",
        "Aprovado",
        "Em produção",
        "Aguardando embalagem",
        "Em estoque",
        "Pronto para retirada"
    ];

    const totalMateriais = materiais.length;

    document.getElementById("painelData").textContent =
        new Date().toLocaleDateString("pt-BR", {
            weekday:"long",
            day:"2-digit",
            month:"long",
            year:"numeric"
        });

    document.getElementById("painelAtivos").textContent = ativos.length;

    document.getElementById("painelProducao").textContent =
        contarMateriais(pedidos, "Em produção");

    document.getElementById("painelAprovacao").textContent =
        contarMateriais(pedidos, "Aguardando aprovação");

    document.getElementById("painelProntos").textContent =
        contarMateriais(pedidos, "Pronto para retirada");

    document.getElementById("painelConcluidos").textContent =
        concluidos.length;

    document.getElementById("painelUnidades").textContent =
        contarUnidades(pedidos);

    // PRODUÇÃO POR ETAPA

    const areaEtapas = document.getElementById("painelEtapas");

    areaEtapas.innerHTML = "";

    etapasPainel.forEach(etapa => {
        const quantidade = contarMateriais(pedidos, etapa);

        const percentual = totalMateriais
            ? Math.round(quantidade / totalMateriais * 100)
            : 0;

        const linha = document.createElement("div");

        linha.className = "barra-linha";

        linha.innerHTML = `
            <div class="barra-topo">
                <span>${etapa}</span>
                <strong>${quantidade}</strong>
            </div>

            <div class="barra-fundo">
                <div class="barra-preenchida"
                    style="width:${percentual}%">
                </div>
            </div>
        `;

        areaEtapas.appendChild(linha);
    });

    // ALERTAS E PENDÊNCIAS

    const atrasados = materiais.filter(v =>
        obterSituacaoPrazo(v).situacao === "atrasado"
    );

    const aguardando = contarMateriais(
        pedidos,
        "Aguardando aprovação"
    );

    const prontos = contarMateriais(
        pedidos,
        "Pronto para retirada"
    );

    const areaAlertas = document.getElementById("painelAlertas");

    areaAlertas.innerHTML = "";

    const alertas = [];

    if (aguardando) {
        alertas.push({
            texto: `${aguardando} material(is) aguardando aprovação do cliente.`,
            classe: ""
        });
    }

    if (atrasados.length) {
        alertas.push({
            texto: `${atrasados.length} material(is) com prazo de 30 dias vencido.`,
            classe: "atraso"
        });
    }

    if (prontos) {
        alertas.push({
            texto: `${prontos} material(is) pronto(s) aguardando retirada.`,
            classe: ""
        });
    }

    if (!alertas.length) {
        areaAlertas.innerHTML =
            '<p class="painel-vazio">Nenhuma pendência no momento. Tudo em ordem!</p>';
    }

    alertas.forEach(alerta => {
        const item = document.createElement("div");

        item.className = "painel-alerta " + alerta.classe;
        item.textContent = "• " + alerta.texto;

        areaAlertas.appendChild(item);
    });

    // ÚLTIMAS MOVIMENTAÇÕES

    const atividades = [];

    pedidos.forEach(pedido => {
        (pedido.vidros || []).forEach(vidro => {
            (vidro.historico || []).forEach(item => {
                atividades.push({
                    pedido: pedido.numero,
                    cliente: pedido.cliente,
                    material: vidro.tipo,
                    status: item.status,
                    data: item.data,
                    ordem: dataHistoricoParaNumero(item.data)
                });
            });
        });
    });

    atividades.sort((a, b) => b.ordem - a.ordem);

    const areaAtividades = document.getElementById("painelAtividades");

    areaAtividades.innerHTML = "";

    if (!atividades.length) {
        areaAtividades.innerHTML =
            '<p class="painel-vazio">Ainda não existem movimentações.</p>';
    }

    atividades.slice(0, 6).forEach(atividade => {
        const linha = document.createElement("div");

        linha.className = "painel-atividade";

        linha.textContent =
            `Pedido #${String(atividade.pedido).padStart(4,"0")} • ${atividade.material}: ${atividade.status} — ${atividade.data}`;

        areaAtividades.appendChild(linha);
    });

    // RESUMO DO MÊS

    const agora = new Date();

    const mes = agora.getMonth();
    const ano = agora.getFullYear();

    const pedidosMes = pedidos.filter(p => {
        if (!p.data) return false;

        const [a, m] = p.data.split("-").map(Number);

        return a === ano && m - 1 === mes;
    });

    const concluidosMes = concluidos.filter(p =>
        (p.vidros || []).some(v =>
            (v.historico || []).some(h =>
                h.status === "Retirado" &&
                dataHistoricoParaNumero(h.data) >=
                new Date(ano, mes, 1).getTime()
            )
        )
    );

    document.getElementById("painelMes").innerHTML = `
        <p style="margin:10px 0">
            <strong>${pedidosMes.length}</strong>
            pedidos recebidos neste mês
        </p>

        <p style="margin:10px 0">
            <strong>${concluidosMes.length}</strong>
            pedidos concluídos neste mês
        </p>

        <p style="margin:10px 0">
            <strong>${contarUnidades(pedidosMes)}</strong>
            unidades recebidas neste mês
        </p>
    `;

    // ACESSOS RÁPIDOS

    const areaAcessos = document.getElementById("painelAcessos");

    areaAcessos.innerHTML = "";

    const atalhos = [
        {
            texto: "＋ Novo recebimento",
            destino: "recebimento"
        },
        {
            texto: "▤ Ver pedidos",
            destino: "pedidos"
        },
        {
            texto: "✓ Concluídos",
            destino: "concluidos"
        }
    ];

    atalhos.forEach(atalho => {
        const link = document.createElement("a");

        link.className = "painel-acao";
        link.href = "#" + atalho.destino;
        link.textContent = atalho.texto;

        link.addEventListener("click", event => {
            event.preventDefault();

            if (document.getElementById(atalho.destino)) {
                abrirTela(atalho.destino);

                history.replaceState(
                    null,
                    "",
                    "#" + atalho.destino
                );
            } else {
                const linkMenu = [
                    ...document.querySelectorAll(".sidebar nav a")
                ].find(a =>
                    a.getAttribute("href") === "#" + atalho.destino
                );

                if (linkMenu) {
                    linkMenu.click();
                } else {
                    alert("A tela de recebimento não foi encontrada no menu.");
                }
            }
        });

        areaAcessos.appendChild(link);
    });
}

// ======================================
// INDICADORES
// ======================================

function atualizarIndicadores(pedidos) {
    const totalPedidos = document.getElementById("totalPedidos");
    const pedidosProducao = document.getElementById("pedidosProducao");
    const pedidosAprovacao = document.getElementById("pedidosAprovacao");
    const pedidosProntos = document.getElementById("pedidosProntos");

    if (totalPedidos) {
        totalPedidos.textContent =
            pedidos.filter(p => !pedidoConcluido(p)).length;
    }

    if (pedidosProducao) {
        pedidosProducao.textContent =
            contarMateriais(pedidos, "Em produção");
    }

    if (pedidosAprovacao) {
        pedidosAprovacao.textContent =
            contarMateriais(pedidos, "Aguardando aprovação");
    }

    if (pedidosProntos) {
        pedidosProntos.textContent =
            contarMateriais(pedidos, "Pronto para retirada");
    }

    atualizarPainelInicial(pedidos);
}

// ======================================
// FILTRO DE ETAPAS
// ======================================

const filtroStatus = document.createElement("select");

filtroStatus.style.maxWidth = "500px";
filtroStatus.style.marginBottom = "20px";

["Todas as etapas", ...etapas].forEach(etapa => {
    const opcao = document.createElement("option");

    opcao.value = etapa;
    opcao.textContent = etapa;

    filtroStatus.appendChild(opcao);
});

pesquisaPedidos.parentElement.insertBefore(
    filtroStatus,
    pesquisaPedidos
);

// ======================================
// PEDIDOS CONCLUÍDOS
// ======================================

function pedidoConcluido(pedido) {
    return (pedido.vidros || []).length > 0 &&
        pedido.vidros.every(vidro => vidro.status === "Retirado");
}

function criarCartaoPedido(pedido, concluido = false) {
    const cartao = document.createElement("div");

    cartao.className = "card-pedido";

    const titulo = document.createElement("h3");

    titulo.textContent =
        "Pedido #" + String(pedido.numero).padStart(4, "0");

    const cliente = document.createElement("p");

    cliente.textContent = "Cliente: " + pedido.cliente;

    const data = document.createElement("p");

    data.textContent =
        "Data de recebimento: " + formatarData(pedido.data);

    const situacao = document.createElement("p");

    situacao.textContent = concluido
        ? "Situação: Concluído"
        : "Situação: " + obterResumoPedido(pedido);

    situacao.style.background = obterCor(
        concluido ? "Retirado" : obterResumoPedido(pedido)
    );

    situacao.style.padding = "10px";
    situacao.style.borderRadius = "8px";

    const detalhes = document.createElement("button");

    detalhes.textContent = "Ver detalhes";

    detalhes.addEventListener("click", () => {
        abrirDetalhes(pedido.numero);
    });

    cartao.append(titulo, cliente, data, situacao, detalhes);

    if (!concluido) {
        const previsao = document.createElement("p");

        previsao.textContent = obterPrevisaoPedido(pedido);

        const editar = document.createElement("button");

        editar.textContent = "Editar pedido";

        editar.addEventListener("click", () => {
            editarPedido(pedido.numero);
        });

        const excluir = document.createElement("button");

        excluir.textContent = "Excluir pedido";
        excluir.style.background = "#dc2626";

        excluir.addEventListener("click", () => {
            excluirPedido(pedido.numero);
        });

        cartao.insertBefore(previsao, detalhes);
        cartao.append(editar, excluir);
    }

    return cartao;
}

function mostrarPedidos() {
    const pedidos = buscarPedidos();

    const termo = pesquisaPedidos.value.trim().toLowerCase();
    const statusSelecionado = filtroStatus.value;

    atualizarIndicadores(pedidos);

    listaPedidos.innerHTML = "";
    listaConcluidos.innerHTML = "";

    const ativos = pedidos.filter(pedido => !pedidoConcluido(pedido));

    const concluidos = pedidos.filter(pedido => pedidoConcluido(pedido));

    const filtrados = ativos.filter(pedido => {
        const correspondeTexto =
            String(pedido.cliente).toLowerCase().includes(termo) ||
            String(pedido.numero).includes(termo);

        const correspondeStatus =
            statusSelecionado === "Todas as etapas" ||
            pedido.vidros.some(vidro =>
                vidro.status === statusSelecionado
            );

        return correspondeTexto && correspondeStatus;
    });

    if (!filtrados.length) {
        listaPedidos.textContent = ativos.length
            ? "Nenhum pedido encontrado."
            : "Nenhum pedido em andamento.";
    } else {
        filtrados.forEach(pedido => {
            listaPedidos.appendChild(criarCartaoPedido(pedido));
        });
    }

    const concluidosFiltrados = concluidos.filter(pedido =>
        String(pedido.cliente).toLowerCase().includes(termo) ||
        String(pedido.numero).includes(termo)
    );

    if (!concluidosFiltrados.length) {
        listaConcluidos.textContent = "Nenhum pedido concluído.";
    } else {
        concluidosFiltrados.forEach(pedido => {
            listaConcluidos.appendChild(
                criarCartaoPedido(pedido, true)
            );
        });
    }
}

pesquisaPedidos.addEventListener("input", mostrarPedidos);
filtroStatus.addEventListener("change", mostrarPedidos);

// ======================================
// DETALHES DO PEDIDO
// ======================================

function abrirDetalhes(numero) {
    const pedido = buscarPedidos().find(p => p.numero === numero);

    if (!pedido) return;

    const modal = document.getElementById("modalDetalhes");
    const area = document.getElementById("informacoesDetalhes");

    area.innerHTML = "";

    const titulo = document.createElement("h2");

    titulo.textContent =
        "Pedido #" + String(numero).padStart(4, "0");

    area.appendChild(titulo);

    const cliente = document.createElement("p");

    cliente.textContent = "Cliente: " + pedido.cliente;

    area.appendChild(cliente);

    const data = document.createElement("p");

    data.textContent = "Data: " + formatarData(pedido.data);

    area.appendChild(data);

    const previsao = document.createElement("p");

    previsao.textContent = obterPrevisaoPedido(pedido);
    previsao.style.margin = "15px 0";

    area.appendChild(previsao);

    pedido.vidros.forEach((vidro, indice) => {
        const bloco = document.createElement("div");

        bloco.className = "bloco-detalhe";

        const tituloVidro = document.createElement("h3");

        tituloVidro.textContent = vidro.tipo;

        const quantidade = document.createElement("p");

        quantidade.textContent = "Quantidade: " + vidro.quantidade;

        const cor = document.createElement("p");

        cor.textContent = "Cor: " + (vidro.cor || "Não informada");

        const codigo = document.createElement("p");

        codigo.textContent =
            "Código de barras: " + (vidro.codigoBarras || "Não informado");

        const status = document.createElement("p");

        status.textContent = "Etapa atual: " + vidro.status;

        const prazo = document.createElement("p");

        const situacaoPrazo = obterSituacaoPrazo(vidro);

        prazo.textContent = situacaoPrazo.texto +
            (situacaoPrazo.data
                ? " — Limite: " + formatarData(situacaoPrazo.data)
                : "");

        // NOTA FISCAL

        const campoNota = document.createElement("div");

        campoNota.style.margin = "12px 0";

        const labelNota = document.createElement("label");

        labelNota.textContent = "Nota fiscal (PDF ou imagem): ";

        const arquivoNota = document.createElement("input");

        arquivoNota.type = "file";
        arquivoNota.accept = ".pdf,image/*";
        arquivoNota.style.display = "block";
        arquivoNota.style.marginTop = "6px";

        const notaAtual = document.createElement("p");

        notaAtual.textContent = vidro.notaFiscal
            ? "Anexada: " + vidro.notaFiscal.nome
            : "Nenhuma nota fiscal anexada.";

        if (vidro.notaFiscal && vidro.notaFiscal.dados) {
            const linkNota = document.createElement("a");

            linkNota.href = vidro.notaFiscal.dados;
            linkNota.download = vidro.notaFiscal.nome;
            linkNota.textContent = "Abrir / baixar nota fiscal";
            linkNota.style.display = "block";

            campoNota.appendChild(linkNota);
        }

        arquivoNota.addEventListener("change", () => {
            const arquivo = arquivoNota.files[0];

            if (!arquivo) return;

            if (arquivo.size > 2 * 1024 * 1024) {
                alert("O arquivo deve ter no máximo 2 MB para não sobrecarregar o sistema.");
                arquivoNota.value = "";
                return;
            }

            const leitor = new FileReader();

            leitor.onload = () => {
                const pedidosAtualizados = buscarPedidos();

                const pedidoAtualizado = pedidosAtualizados.find(
                    p => p.numero === numero
                );

                if (!pedidoAtualizado || !pedidoAtualizado.vidros[indice]) {
                    return;
                }

                pedidoAtualizado.vidros[indice].notaFiscal = {
                    nome: arquivo.name,
                    tipo: arquivo.type || "application/octet-stream",
                    dados: leitor.result
                };

                salvarPedidos(pedidosAtualizados);

                alert("Nota fiscal anexada com sucesso!");

                abrirDetalhes(numero);
            };

            leitor.readAsDataURL(arquivo);
        });

        labelNota.appendChild(arquivoNota);
        campoNota.append(labelNota, notaAtual);

        // SELETOR DE STATUS

        const seletor = document.createElement("select");

        etapas.forEach(etapa => {
            const opcao = document.createElement("option");

            opcao.value = etapa;
            opcao.textContent = etapa;
            opcao.selected = etapa === vidro.status;

            seletor.appendChild(opcao);
        });

        seletor.addEventListener("change", () => {
            const novoStatus = seletor.value;

            if (
                novoStatus === "Em produção" &&
                !confirm("Tem certeza que deseja iniciar a produção deste material?")
            ) {
                seletor.value = vidro.status;
                return;
            }

            alterarStatusVidro(numero, indice, novoStatus);
        });

        // HISTÓRICO

        const historico = document.createElement("div");

        historico.className = "historico";

        const tituloHistorico = document.createElement("h4");

        tituloHistorico.textContent = "Histórico";

        historico.appendChild(tituloHistorico);

        (vidro.historico || []).forEach(item => {
            const linha = document.createElement("p");

            linha.textContent = item.status + " — " + item.data;

            historico.appendChild(linha);
        });

        const botaoLimparHistorico = document.createElement("button");

        botaoLimparHistorico.type = "button";
        botaoLimparHistorico.textContent = "Limpar histórico";
        botaoLimparHistorico.style.background = "#dc2626";

        botaoLimparHistorico.addEventListener("click", () => {
            limparHistoricoVidro(numero, indice);
        });

        bloco.append(
            tituloVidro,
            quantidade,
            cor,
            codigo,
            status,
            prazo,
            campoNota,
            seletor,
            historico,
            botaoLimparHistorico
        );

        area.appendChild(bloco);
    });

    const obs = document.createElement("p");

    obs.textContent =
        "Observações: " + (pedido.observacoes || "Nenhuma");

    area.appendChild(obs);

    modal.style.display = "block";
}

// ======================================
// JANELA DE DETALHES
// ======================================

const modalDetalhes = document.createElement("div");

modalDetalhes.id = "modalDetalhes";

modalDetalhes.innerHTML = `
    <div id="conteudoDetalhes">

        <button type="button" id="fecharDetalhes"
            style="float:right;background:#dc2626">
            Fechar
        </button>

        <div id="informacoesDetalhes" style="margin-top:35px"></div>

        <button type="button" id="imprimirDetalhes"
            style="margin-top:20px">
            Imprimir pedido
        </button>

    </div>
`;

document.body.appendChild(modalDetalhes);

document.getElementById("fecharDetalhes").addEventListener("click", () => {
    modalDetalhes.style.display = "none";
});

document.getElementById("imprimirDetalhes").addEventListener("click", () => {
    window.print();
});

modalDetalhes.addEventListener("click", event => {
    if (event.target === modalDetalhes) {
        modalDetalhes.style.display = "none";
    }
});

// ======================================
// EDITAR PEDIDO
// ======================================

function editarPedido(numero) {
    const pedidos = buscarPedidos();

    const pedido = pedidos.find(p => p.numero === numero);

    if (!pedido) return;

    const cliente = prompt("Nome do cliente:", pedido.cliente);

    if (cliente === null || !cliente.trim()) return;

    const observacoes = prompt(
        "Observações:",
        pedido.observacoes || ""
    );

    if (observacoes === null) return;

    pedido.cliente = cliente.trim();
    pedido.observacoes = observacoes;

    salvarPedidos(pedidos);
    mostrarPedidos();

    alert("Pedido atualizado.");
}

// ======================================
// EXCLUIR PEDIDO
// ======================================

function excluirPedido(numero) {
    if (!confirm("Deseja excluir o pedido #" + numero + "?")) return;

    const pedidos = buscarPedidos().filter(p => p.numero !== numero);

    salvarPedidos(pedidos);
    mostrarPedidos();
}

// ======================================
// BACKUP DOS PEDIDOS
// ======================================

const botaoBackup = document.createElement("button");

botaoBackup.textContent = "Baixar backup dos pedidos";
botaoBackup.style.marginBottom = "15px";

listaPedidos.parentElement.insertBefore(botaoBackup, listaPedidos);

botaoBackup.addEventListener("click", () => {
    const arquivo = new Blob(
        [JSON.stringify(buscarPedidos(), null, 2)],
        { type: "application/json" }
    );

    const link = document.createElement("a");

    link.href = URL.createObjectURL(arquivo);
    link.download = "backup-MA-Decor.json";

    link.click();

    URL.revokeObjectURL(link.href);
});

// ======================================
// NAVEGAÇÃO
// ======================================

// Área de pedidos concluídos

const areaConteudo = document.querySelector(".conteudo");
const menuNavegacao = document.querySelector(".sidebar nav");

const secaoConcluidos = document.createElement("section");

secaoConcluidos.id = "concluidos";
secaoConcluidos.hidden = true;

const tituloConcluidos = document.createElement("h1");

tituloConcluidos.textContent = "Pedidos concluídos";

const descricaoConcluidos = document.createElement("p");

descricaoConcluidos.textContent =
    "Pedidos em que todos os materiais foram marcados como retirados.";

listaConcluidos = document.createElement("div");
listaConcluidos.id = "listaConcluidos";

secaoConcluidos.append(
    tituloConcluidos,
    descricaoConcluidos,
    listaConcluidos
);

areaConteudo.appendChild(secaoConcluidos);

const linkConcluidos = document.createElement("a");

linkConcluidos.href = "#concluidos";
linkConcluidos.textContent = "Concluídos";

menuNavegacao.appendChild(linkConcluidos);

// ======================================
// CONTROLE DAS TELAS
// ======================================

let secoes = document.querySelectorAll(".conteudo section");
let linksMenu = document.querySelectorAll(".sidebar nav a");

function abrirTela(id) {
    secoes = document.querySelectorAll(".conteudo section");
    linksMenu = document.querySelectorAll(".sidebar nav a");

    secoes.forEach(secao => {
        secao.hidden = secao.id !== id;
    });

    linksMenu.forEach(link => {
        link.classList.toggle(
            "menu-ativo",
            link.getAttribute("href") === "#" + id
        );
    });

    window.scrollTo(0, 0);
}

linksMenu.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const destino = link.getAttribute("href").substring(1);

        abrirTela(destino);

        history.replaceState(null, "", "#" + destino);
    });
});

// ======================================
// INICIALIZAÇÃO
// ======================================

if (
    !listaVidros ||
    !botaoAdicionar ||
    !formulario ||
    !listaPedidos ||
    !pesquisaPedidos
) {
    alert("Não foi possível localizar os elementos do sistema.");
} else {
    adicionarCampoVidro();

    document.getElementById("dataEntrada").value = obterDataHoje();

    const telaInicial =
        window.location.hash.replace("#", "") || "inicio";

    abrirTela(
        document.getElementById(telaInicial)
            ? telaInicial
            : "inicio"
    );

    mostrarPedidos();
}