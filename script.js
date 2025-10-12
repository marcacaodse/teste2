let allData = [];
let filteredData = [];
let charts = {};
let dataTable;

// URL corrigida para acessar a planilha como CSV
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Gtan6GhpDO5ViVuNMiT0AGm3F5I5iZSIYhWHVJ3ga6E/export?format=csv&gid=64540129';

// Unidades de Saúde predefinidas
const UNIDADES_SAUDE = [
    'Agua Branca', 'Jardim Bandeirantes', 'Unidade XV', 'Csu Eldorado', 
    'Novo Eldorado', 'Jardim Eldorado', 'Santa Cruz', 'Perobas', 'Parque São João'
];

// Laboratórios de Coleta predefinidos  
const LABORATORIOS_COLETA = ['Eldorado', 'Agua Branca', 'Parque São João'];

// Mapeamento CORRETO de Laboratórios por Unidade de Saúde
const LABORATORIO_POR_UNIDADE = {
    'Agua Branca': 'Agua Branca',
    'Jardim Bandeirantes': 'Agua Branca',
    'Perobas': 'Parque São João',
    'Parque São João': 'Parque São João',
    'Csu Eldorado': 'Eldorado',
    'Unidade XV': 'Eldorado',
    'Novo Eldorado': 'Eldorado',
    'Jardim Eldorado': 'Eldorado',
    'Santa Cruz': 'Eldorado'
};

// Cores para os cards das unidades (agendadas)
const CORES_UNIDADES = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
    'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
];

// NOVO: Cores específicas para os cards de vagas livres
const CORES_VAGAS_LIVRES = [
    'bg-emerald-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500', 
    'bg-violet-500', 'bg-rose-500', 'bg-sky-500', 'bg-green-600', 'bg-blue-600'
];

// 🏥 Ícones para vagas agendadas
const ICONES_UNIDADES = {
  'Agua Branca': 'fas fa-hospital',
  'Jardim Bandeirantes': 'fas fa-hospital',
  'Unidade XV': 'fas fa-hospital',
  'Csu Eldorado': 'fas fa-hospital',
  'Novo Eldorado': 'fas fa-hospital',
  'Jardim Eldorado': 'fas fa-hospital',
  'Santa Cruz': 'fas fa-hospital',
  'Perobas': 'fas fa-tree',       // 🌳
  'Parque São João': 'fas fa-leaf' // 🍃
};

// 📅 Ícones para vagas livres
const ICONES_VAGAS_LIVRES = {
  'Agua Branca': 'fas fa-calendar-plus',
  'Jardim Bandeirantes': 'fas fa-calendar-plus',
  'Unidade XV': 'fas fa-calendar-plus',
  'Csu Eldorado': 'fas fa-calendar-plus',
  'Novo Eldorado': 'fas fa-calendar-plus',
  'Jardim Eldorado': 'fas fa-calendar-plus',
  'Santa Cruz': 'fas fa-calendar-plus',
  'Perobas': 'fas fa-tree',
  'Parque São João': 'fas fa-leaf'
};

// FUNÇÃO CENTRAL: Verificar se um paciente está agendado baseado na coluna F
function isPacienteAgendado(nomePaciente) {
    if (!nomePaciente || typeof nomePaciente !== 'string') {
        return false;
    }
    const nome = nomePaciente.trim().toLowerCase();
    return nome !== '' && nome !== 'preencher';
}

// FUNÇÃO CENTRAL: Verificar se uma vaga está livre baseado na coluna F
function isVagaLivre(nomePaciente) {
    return !isPacienteAgendado(nomePaciente);
}

// Função para atualizar a página
function refreshPage() {
    location.reload();
}

async function loadData() {
    try {
        document.getElementById('connectionStatus').className = 'status-indicator status-online';
        document.getElementById('connectionText').textContent = 'Carregando...';

        const response = await fetch(SHEET_URL);
        const csvText = await response.text();

        if (!csvText || csvText.length < 100) {
            throw new Error('CSV vazio ou inválido');
        }

        const lines = csvText.split('\n');
        allData = [];

        // Os dados começam na linha 6 (índice 5) e as colunas são C a K (índices 2 a 10)
        for (let i = 5; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCSVLine(line);
                // As colunas de interesse são C a K (índices 2 a 10)
                if (values.length >= 11) {
                    let row = {
                        unidadeSaude: normalizeUnidadeSaude((values[2] || '').trim()), // Coluna C
                        dataAgendamento: (values[3] || '').trim(), // Coluna D
                        horarioAgendamento: (values[4] || '').trim(), // Coluna E
                        nomePaciente: (values[5] || '').trim(), // Coluna F - REFERÊNCIA PRINCIPAL
                        telefone: (values[6] || '').trim(), // Coluna G
                        prontuarioVivver: (values[7] || '').trim(), // Coluna H
                        observacaoUnidadeSaude: (values[8] || '').trim(), // Coluna I
                        perfilPacienteExame: (values[9] || '').trim(), // Coluna J
                        laboratorioColeta: '' // Será definido abaixo
                    };

                    // CORREÇÃO: Definir laboratório de coleta baseado na unidade de saúde
                    if (row.unidadeSaude && LABORATORIO_POR_UNIDADE[row.unidadeSaude]) {
                        row.laboratorioColeta = LABORATORIO_POR_UNIDADE[row.unidadeSaude];
                    } else {
                        // Fallback para o valor da coluna K se existir
                        row.laboratorioColeta = normalizeLaboratorio((values[10] || '').trim());
                    }

                    // Só adiciona se tiver pelo menos unidade de saúde E data válida
                    if (row.unidadeSaude !== '' && row.dataAgendamento !== '' && isValidDate(row.dataAgendamento)) {
                        allData.push(row);
                    }
                }
            }
        }

        console.log('Dados carregados:', allData.length, 'registros');

        if (allData.length === 0) {
            console.warn('Nenhum dado encontrado, carregando dados de exemplo...');
            loadSampleData();
            return;
        }

        // Filtrar dados a partir de 01/11/2025
        const dataMinima = new Date('2025-11-01');
        allData = allData.filter(item => {
            const dataItem = parseDate(item.dataAgendamento);
            return dataItem && dataItem >= dataMinima;
        });

        filteredData = [...allData];
        updateFilters();
        updateDashboard();
        updateStats();

        document.getElementById('connectionStatus').className = 'status-indicator status-online';
        document.getElementById('connectionText').textContent = 'Conectado';
        document.getElementById('lastUpdate').textContent = `Última atualização: ${new Date().toLocaleString('pt-BR')}`;
        document.getElementById('lastUpdateDate').textContent = new Date().toLocaleDateString('pt-BR');

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('connectionStatus').className = 'status-indicator status-offline';
        document.getElementById('connectionText').textContent = 'Erro de conexão';
        loadSampleData(); // Fallback para dados de exemplo
    }
}

function normalizeUnidadeSaude(unidade) {
    if (!unidade) return '';
    const upper = unidade.toUpperCase();
    
    // Normalize common variations
    if (upper.includes('AGUA BRANCA') || upper.includes('ÁGUA BRANCA')) return 'Agua Branca';
    if (upper.includes('JARDIM BANDEIRANTES')) return 'Jardim Bandeirantes';
    if (upper.includes('UNIDADE XV') || upper.includes('UNIDADE 15')) return 'Unidade XV';
    if (upper.includes('CSU ELDORADO') || upper.includes('ELDORADO CSU')) return 'Csu Eldorado';
    if (upper.includes('NOVO ELDORADO')) return 'Novo Eldorado';
    if (upper.includes('JARDIM ELDORADO')) return 'Jardim Eldorado';
    if (upper.includes('SANTA CRUZ')) return 'Santa Cruz';
    if (upper.includes('PEROBAS')) return 'Perobas';
    if (upper.includes('PARQUE SAO JOAO') || upper.includes('PARQUE SÃO JOÃO') || upper.includes('PARQUE S JOÃO')) return 'Parque São João';
    
    return unidade;
}

function normalizeLaboratorio(lab) {
    if (!lab) return '';
    const upper = lab.toUpperCase();
    
    if (upper.includes('ELDORADO')) return 'Eldorado';
    if (upper.includes('AGUA BRANCA') || upper.includes('ÁGUA BRANCA')) return 'Agua Branca';
    if (upper.includes('PARQUE SAO JOAO') || upper.includes('PARQUE SÃO JOÃO') || upper.includes('PARQUE S JOÃO')) return 'Parque São João';
    
    return lab;
}

function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = parseDate(dateStr);
    return date && !isNaN(date.getTime());
}

function loadSampleData() {
    // Dados de exemplo com mapeamento CORRETO dos laboratórios
    allData = [
        { 
            unidadeSaude: 'Agua Branca', 
            dataAgendamento: '11/11/2025', 
            horarioAgendamento: '8h10', 
            nomePaciente: 'João Silva', 
            telefone: '(11) 99999-9999',
            prontuarioVivver: '12345',
            observacaoUnidadeSaude: 'Paciente regular',
            perfilPacienteExame: 'Exame de rotina',
            laboratorioColeta: 'Agua Branca' 
        },
        { 
            unidadeSaude: 'Jardim Bandeirantes', 
            dataAgendamento: '12/11/2025', 
            horarioAgendamento: '7h10', 
            nomePaciente: 'Maria Santos', 
            telefone: '(11) 88888-8888',
            prontuarioVivver: '54321',
            observacaoUnidadeSaude: 'Primeira consulta',
            perfilPacienteExame: 'Exame preventivo',
            laboratorioColeta: 'Agua Branca' 
        },
        { 
            unidadeSaude: 'Csu Eldorado', 
            dataAgendamento: '25/12/2025', 
            horarioAgendamento: '8h10', 
            nomePaciente: '', 
            telefone: '',
            prontuarioVivver: '',
            observacaoUnidadeSaude: 'Preencher',
            perfilPacienteExame: 'Preencher',
            laboratorioColeta: 'Eldorado' 
        },
        { 
            unidadeSaude: 'Perobas', 
            dataAgendamento: '15/12/2025', 
            horarioAgendamento: '7h10', 
            nomePaciente: '', 
            telefone: '',
            prontuarioVivver: '',
            observacaoUnidadeSaude: 'Preencher',
            perfilPacienteExame: 'Preencher',
            laboratorioColeta: 'Parque São João'
        },
        { 
            unidadeSaude: 'Santa Cruz', 
            dataAgendamento: '20/12/2025', 
            horarioAgendamento: '9h30', 
            nomePaciente: 'Ana Costa', 
            telefone: '(11) 77777-7777',
            prontuarioVivver: '98765',
            observacaoUnidadeSaude: 'Retorno',
            perfilPacienteExame: 'Exame de sangue',
            laboratorioColeta: 'Eldorado' 
        }
    ];
    filteredData = [...allData];
    updateFilters();
    updateDashboard();
    updateStats();
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

function updateFilters() {
    // Horários únicos dos dados
    const horariosSet = new Set();
    allData.forEach(item => {
        if (item.horarioAgendamento && item.horarioAgendamento.trim()) {
            horariosSet.add(item.horarioAgendamento.trim());
        }
    });

    // Mês/Ano únicos dos dados
    const mesAnoSet = new Set();
    allData.forEach(item => {
        if (item.dataAgendamento) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                mesAnoSet.add(monthYear);
            }
        }
    });

    updateSelectOptions('unidadeSaudeFilter', UNIDADES_SAUDE);
    updateSelectOptions('laboratorioColetaFilter', LABORATORIOS_COLETA);
    updateSelectOptions('mesAnoFilter', Array.from(mesAnoSet).sort());
    updateSelectOptions('horarioFilter', Array.from(horariosSet).sort());

    // Reinicializar Select2 com eventos personalizados
    $('.filter-select').select2({
        placeholder: 'Selecione uma ou mais opções',
        allowClear: true
    }).off('change').on('change', function() {
        applyFilters();
        updateFilterDisplays();
    });

    // Aplicar evento ao filtro de data
    document.getElementById('dataFilter').removeEventListener('change', handleDateFilterChange);
    document.getElementById('dataFilter').addEventListener('change', handleDateFilterChange);

    // Atualizar exibições dos filtros inicialmente
    updateFilterDisplays();
}

function handleDateFilterChange() {
    applyFilters();
    updateFilterDisplays();
}

function updateSelectOptions(selectId, options) {
    const select = $(`#${selectId}`);
    select.empty();
    options.forEach(option => {
        select.append(new Option(option, option, false, false));
    });
    select.trigger('change');
}

// NOVA FUNÇÃO: Atualizar exibições dos filtros selecionados
function updateFilterDisplays() {
    // Unidades de Saúde
    const unidadeSelecionadas = $('#unidadeSaudeFilter').val() || [];
    updateFilterDisplay('unidadeSaudeSelected', unidadeSelecionadas, 'Unidades selecionadas');

    // Laboratórios
    const labsSelecionados = $('#laboratorioColetaFilter').val() || [];
    updateFilterDisplay('laboratorioColetaSelected', labsSelecionados, 'Laboratórios selecionados');

    // Mês/Ano
    const mesAnoSelecionados = $('#mesAnoFilter').val() || [];
    updateFilterDisplay('mesAnoSelected', mesAnoSelecionados, 'Meses selecionados');

    // Data
    const dataSelecionada = document.getElementById('dataFilter').value;
    const dataTexto = dataSelecionada ? [new Date(dataSelecionada).toLocaleDateString('pt-BR')] : [];
    updateFilterDisplay('dataSelected', dataTexto, 'Data selecionada');

    // Horários
    const horariosSelecionados = $('#horarioFilter').val() || [];
    updateFilterDisplay('horarioSelected', horariosSelecionados, 'Horários selecionados');
}

function updateFilterDisplay(containerId, selectedItems, labelText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (selectedItems.length === 0) {
        container.innerHTML = '';
        return;
    }

    const truncatedItems = selectedItems.length > 3 
        ? [...selectedItems.slice(0, 3), `+${selectedItems.length - 3} mais`]
        : selectedItems;

    container.innerHTML = `
        <div class="text-xs text-gray-600 mt-1">
            <span class="font-medium">${labelText}:</span>
            <div class="flex flex-wrap gap-1 mt-1">
                ${truncatedItems.map(item => `
                    <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        ${item}
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}

function applyFilters() {
    const unidadeSaudeFilter = $('#unidadeSaudeFilter').val() || [];
    const laboratorioColetaFilter = $('#laboratorioColetaFilter').val() || [];
    const mesAnoFilter = $('#mesAnoFilter').val() || [];
    const dataFilter = document.getElementById('dataFilter').value;
    const horarioFilter = $('#horarioFilter').val() || [];

    // FILTRAR POR DADOS REAIS (allData) APLICANDO TODOS OS FILTROS
    filteredData = allData.filter(item => {
        let inUnidade = unidadeSaudeFilter.length === 0 || unidadeSaudeFilter.includes(item.unidadeSaude);
        let inLaboratorio = laboratorioColetaFilter.length === 0 || laboratorioColetaFilter.includes(item.laboratorioColeta);
        let inHorario = horarioFilter.length === 0 || horarioFilter.includes(item.horarioAgendamento);
        
        let inMesAno = true;
        if (mesAnoFilter.length > 0) {
            const itemDate = item.dataAgendamento ? parseDate(item.dataAgendamento) : null;
            if (itemDate) {
                const itemMesAno = `${String(itemDate.getMonth() + 1).padStart(2, '0')}/${itemDate.getFullYear()}`;
                inMesAno = mesAnoFilter.includes(itemMesAno);
            } else {
                inMesAno = false;
            }
        }
        
        let inDate = true;
        if (dataFilter) {
            const itemDate = item.dataAgendamento ? parseDate(item.dataAgendamento) : null;
            const filterDate = new Date(dataFilter);
            inDate = itemDate && itemDate.toDateString() === filterDate.toDateString();
        }

        return inUnidade && inLaboratorio && inMesAno && inDate && inHorario;
    });

    updateDashboard();
    updateStats();
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
}

// FUNÇÃO ATUALIZADA: updateStats - usando função central para verificar coluna F
function updateStats() {
    const totalVagas = filteredData.length;
    // CORREÇÃO: Usar função central para verificar pacientes agendados baseado na coluna F
    const vagasOcupadas = filteredData.filter(item => isPacienteAgendado(item.nomePaciente)).length;
    const vagasLivres = totalVagas - vagasOcupadas;
    const taxaOcupacao = totalVagas > 0 ? (vagasOcupadas / totalVagas * 100).toFixed(1) + '%' : '0.0%';

    document.getElementById('totalVagas').textContent = totalVagas.toLocaleString();
    document.getElementById('vagasOcupadas').textContent = vagasOcupadas.toLocaleString();
    document.getElementById('vagasLivres').textContent = vagasLivres.toLocaleString();
    document.getElementById('taxaOcupacao').textContent = taxaOcupacao;
}

Chart.register(ChartDataLabels);

function updateDashboard() {
    updateVagasUnidadeCards(); // Função existente
    updateVagasLivresUnidadeCards(); // NOVA FUNÇÃO
    updateCharts();
    updateTable();
    updateSummaryTables();
}

// FUNÇÃO CORRIGIDA: updateVagasUnidadeCards - Garantindo que os ícones apareçam
function updateVagasUnidadeCards() {
    const container = document.getElementById('vagasUnidadeContainer');
    if (!container) return;

    // Determinar qual dataset usar baseado nos filtros ativos
    const datasetBase = hasActiveFilters() ? filteredData : allData;
    
    // Calcular total de vagas AGENDADAS (usando função central baseada na coluna F) por unidade
    const vagasPorUnidade = {};
    
    // Inicializar todas as unidades com 0
    UNIDADES_SAUDE.forEach(unidade => {
        vagasPorUnidade[unidade] = 0;
    });
    
    // CORREÇÃO: Contar apenas as vagas AGENDADAS usando função central
    datasetBase.forEach(item => {
        if (item.unidadeSaude && UNIDADES_SAUDE.includes(item.unidadeSaude)) {
            if (isPacienteAgendado(item.nomePaciente)) {
                vagasPorUnidade[item.unidadeSaude]++;
            }
        }
    });

    // Gerar HTML dos cards com ícones corrigidos
    const cardsHTML = UNIDADES_SAUDE.map((unidade, index) => {
        const total = vagasPorUnidade[unidade] || 0;
        const cor = CORES_UNIDADES[index % CORES_UNIDADES.length];
        
        // CORREÇÃO: Usar os ícones corretos baseados no mapeamento
        const icone = ICONES_UNIDADES[unidade] || 'fas fa-hospital';
        
        return `
            <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-l-teal-500 hover:shadow-lg transition-shadow duration-200">
                <div class="flex items-center">
                    <div class="stats-icon ${cor}">
                        <i class="${icone} text-white"></i>
                    </div>
                    <div class="ml-4 flex-1">
                        <p class="text-sm font-medium text-gray-600 truncate" title="${unidade}">${unidade}</p>
                        <p class="text-2xl font-bold text-gray-900">${total.toLocaleString()}</p>
                        <p class="text-xs text-gray-500">vagas agendadas</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHTML;
}

// FUNÇÃO CORRIGIDA: updateVagasLivresUnidadeCards - Garantindo que os ícones apareçam
function updateVagasLivresUnidadeCards() {
    const container = document.getElementById('vagasLivresUnidadeContainer');
    if (!container) return;

    // Determinar qual dataset usar baseado nos filtros ativos
    const datasetBase = hasActiveFilters() ? filteredData : allData;
    
    // Calcular total de vagas LIVRES (usando função central baseada na coluna F) por unidade
    const vagasLivresPorUnidade = {};
    
    // Inicializar todas as unidades com 0
    UNIDADES_SAUDE.forEach(unidade => {
        vagasLivresPorUnidade[unidade] = 0;
    });
    
    // Contar apenas as vagas LIVRES usando função central
    datasetBase.forEach(item => {
        if (item.unidadeSaude && UNIDADES_SAUDE.includes(item.unidadeSaude)) {
            if (isVagaLivre(item.nomePaciente)) {
                vagasLivresPorUnidade[item.unidadeSaude]++;
            }
        }
    });

    // Gerar HTML dos cards com ícones corrigidos
    const cardsHTML = UNIDADES_SAUDE.map((unidade, index) => {
        const total = vagasLivresPorUnidade[unidade] || 0;
        const cor = CORES_VAGAS_LIVRES[index % CORES_VAGAS_LIVRES.length];
        
        // CORREÇÃO: Usar os ícones corretos baseados no mapeamento para vagas livres
        const icone = ICONES_VAGAS_LIVRES[unidade] || 'fas fa-calendar-plus';
        
        return `
            <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow duration-200">
                <div class="flex items-center">
                    <div class="stats-icon ${cor}">
                        <i class="${icone} text-white"></i>
                    </div>
                    <div class="ml-4 flex-1">
                        <p class="text-sm font-medium text-gray-600 truncate" title="${unidade}">${unidade}</p>
                        <p class="text-2xl font-bold text-gray-900">${total.toLocaleString()}</p>
                        <p class="text-xs text-gray-500">vagas livres</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHTML;
}

function updateCharts() {
    updateChartProximosAgendamentosUnidade();
    updateChartProximosAgendamentosLaboratorio();
    updateChartPacientesAgendadosLab(); // NOVO GRÁFICO
    updateChartVagasLivresLab(); // NOVO GRÁFICO
    updateChartVagasConcedidasTempo(); // GRÁFICO CORRIGIDO - Total de vagas por mês
}

// FUNÇÃO ATUALIZADA: updateChartProximosAgendamentosUnidade - usando função central para verificar coluna F
function updateChartProximosAgendamentosUnidade() {
    const proximosAgendamentosPorUnidade = {};
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const datasetBase = filteredData.length > 0 ? filteredData : allData;
    
    // Para cada unidade, encontrar o próximo agendamento disponível (vaga livre)
    UNIDADES_SAUDE.forEach(unidade => {
        // CORREÇÃO: Usar função central para verificar vagas livres baseado na coluna F
        const vagasLivresUnidade = datasetBase.filter(item => 
            item.unidadeSaude === unidade && isVagaLivre(item.nomePaciente)
        );
        
        if (vagasLivresUnidade.length > 0) {
            // Encontrar a data mais próxima no futuro
            const datasOrdenadas = vagasLivresUnidade
                .map(item => parseDate(item.dataAgendamento))
                .filter(date => date && date >= hoje)
                .sort((a, b) => a - b);
            
            if (datasOrdenadas.length > 0) {
                const proximaData = datasOrdenadas[0];
                const diasAteProximoAgendamento = Math.ceil((proximaData - hoje) / (1000 * 60 * 60 * 24));
                proximosAgendamentosPorUnidade[unidade] = diasAteProximoAgendamento;
            }
        }
    });

    const dadosOrdenados = Object.entries(proximosAgendamentosPorUnidade)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 10);

    const ctx = document.getElementById('chartUltimaDataUnidade').getContext('2d');
    if (charts.ultimaDataUnidade) charts.ultimaDataUnidade.destroy();

    charts.ultimaDataUnidade = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dadosOrdenados.map(item => item[0]),
            datasets: [{
                label: 'Dias até próximo agendamento',
                data: dadosOrdenados.map(item => item[1]),
                backgroundColor: '#dc2626',
                borderColor: '#b91c1c',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 12 },
                    anchor: 'center',
                    align: 'center',
                    formatter: (value) => `${value} dias`
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Dias até próximo agendamento'
                    }
                },
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades de Saúde'
                    }
                }
            }
        }
    });
}

// FUNÇÃO ATUALIZADA: updateChartProximosAgendamentosLaboratorio - usando função central para verificar coluna F
function updateChartProximosAgendamentosLaboratorio() {
    const proximosAgendamentosPorLab = {};
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const datasetBase = filteredData.length > 0 ? filteredData : allData;
    
    // Para cada laboratório, encontrar o próximo agendamento disponível (vaga livre)
    LABORATORIOS_COLETA.forEach(lab => {
        // CORREÇÃO: Usar função central para verificar vagas livres baseado na coluna F
        const vagasLivresLab = datasetBase.filter(item => 
            item.laboratorioColeta === lab && isVagaLivre(item.nomePaciente)
        );
        
        if (vagasLivresLab.length > 0) {
            // Encontrar a data mais próxima no futuro
            const datasOrdenadas = vagasLivresLab
                .map(item => parseDate(item.dataAgendamento))
                .filter(date => date && date >= hoje)
                .sort((a, b) => a - b);
            
            if (datasOrdenadas.length > 0) {
                const proximaData = datasOrdenadas[0];
                const diasAteProximoAgendamento = Math.ceil((proximaData - hoje) / (1000 * 60 * 60 * 24));
                proximosAgendamentosPorLab[lab] = diasAteProximoAgendamento;
            }
        }
    });

    const dadosOrdenados = Object.entries(proximosAgendamentosPorLab)
        .sort((a, b) => a[1] - b[1]);

    const ctx = document.getElementById('chartUltimaDataLaboratorio').getContext('2d');
    if (charts.ultimaDataLaboratorio) charts.ultimaDataLaboratorio.destroy();

    charts.ultimaDataLaboratorio = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dadosOrdenados.map(item => item[0]),
            datasets: [{
                label: 'Dias até próximo agendamento',
                data: dadosOrdenados.map(item => item[1]),
                backgroundColor: '#ea580c',
                borderColor: '#f97316',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 12 },
                    anchor: 'center',
                    align: 'center',
                    formatter: (value) => `${value} dias`
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Dias até próximo agendamento'
                    }
                },
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Laboratórios de Coleta'
                    }
                }
            }
        }
    });
}

// NOVA FUNÇÃO: Gráfico de Pacientes Agendados por Laboratório (Barras Verticais Verde Escuro)
function updateChartPacientesAgendadosLab() {
    const datasetBase = hasActiveFilters() ? filteredData : allData;
    
    // Calcular total de pacientes AGENDADOS por laboratório usando função central
    const pacientesPorLab = {};
    
    // Inicializar todos os laboratórios com 0
    LABORATORIOS_COLETA.forEach(lab => {
        pacientesPorLab[lab] = 0;
    });
    
    // Contar apenas pacientes agendados (baseado na coluna F)
    datasetBase.forEach(item => {
        if (item.laboratorioColeta && LABORATORIOS_COLETA.includes(item.laboratorioColeta)) {
            if (isPacienteAgendado(item.nomePaciente)) {
                pacientesPorLab[item.laboratorioColeta]++;
            }
        }
    });

    const dadosOrdenados = Object.entries(pacientesPorLab)
        .sort((a, b) => b[1] - a[1]); // Ordem decrescente

    const ctx = document.getElementById('chartPacientesAgendadosLab').getContext('2d');
    if (charts.pacientesAgendadosLab) charts.pacientesAgendadosLab.destroy();

    charts.pacientesAgendadosLab = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dadosOrdenados.map(item => item[0]),
            datasets: [{
                label: 'Pacientes Agendados',
                data: dadosOrdenados.map(item => item[1]),
                backgroundColor: '#1f5f3f', // Verde escuro
                borderColor: '#166f36',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#ffffff', // Branco
                    font: { weight: 'bold', size: 14 },
                    anchor: 'center',
                    align: 'center',
                    formatter: (value) => value.toString()
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Laboratórios de Coleta'
                    }
                },
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total de Pacientes Agendados'
                    }
                }
            }
        }
    });
}

// NOVA FUNÇÃO: Gráfico de Vagas Livres por Laboratório (Barras Verticais Azul Escuro)
function updateChartVagasLivresLab() {
    const datasetBase = hasActiveFilters() ? filteredData : allData;
    
    // Calcular total de vagas LIVRES por laboratório usando função central
    const vagasLivresPorLab = {};
    
    // Inicializar todos os laboratórios com 0
    LABORATORIOS_COLETA.forEach(lab => {
        vagasLivresPorLab[lab] = 0;
    });
    
    // Contar apenas vagas livres (baseado na coluna F)
    datasetBase.forEach(item => {
        if (item.laboratorioColeta && LABORATORIOS_COLETA.includes(item.laboratorioColeta)) {
            if (isVagaLivre(item.nomePaciente)) {
                vagasLivresPorLab[item.laboratorioColeta]++;
            }
        }
    });

    const dadosOrdenados = Object.entries(vagasLivresPorLab)
        .sort((a, b) => b[1] - a[1]); // Ordem decrescente

    const ctx = document.getElementById('chartVagasLivresLab').getContext('2d');
    if (charts.vagasLivresLab) charts.vagasLivresLab.destroy();

    charts.vagasLivresLab = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dadosOrdenados.map(item => item[0]),
            datasets: [{
                label: 'Vagas Livres',
                data: dadosOrdenados.map(item => item[1]),
                backgroundColor: '#1e3a8a', // Azul escuro
                borderColor: '#1e40af',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#ffffff', // Branco
                    font: { weight: 'bold', size: 14 },
                    anchor: 'center',
                    align: 'center',
                    formatter: (value) => value.toString()
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Laboratórios de Coleta'
                    }
                },
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total de Vagas Livres'
                    }
                }
            }
        }
    });
}

// FUNÇÃO CORRIGIDA: Gráfico de Linha do Tempo com TOTAL DE VAGAS por Mês (agendadas + livres)
function updateChartVagasConcedidasTempo() {
    const datasetBase = hasActiveFilters() ? filteredData : allData;
    
    // CORREÇÃO: Calcular TOTAL DE VAGAS por mês (independente se agendadas ou livres)
    const vagasPorMes = {};
    
    datasetBase.forEach(item => {
        if (item.dataAgendamento) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                // CORREÇÃO: Contar TODAS as vagas (agendadas + livres)
                vagasPorMes[monthYear] = (vagasPorMes[monthYear] || 0) + 1;
            }
        }
    });

    // Ordenar os meses cronologicamente
    const mesesOrdenados = Object.keys(vagasPorMes).sort((a, b) => {
        const [mesA, anoA] = a.split('/').map(Number);
        const [mesB, anoB] = b.split('/').map(Number);
        
        if (anoA !== anoB) return anoA - anoB;
        return mesA - mesB;
    });

    // Preparar dados para o gráfico
    const labels = mesesOrdenados.map(mesAno => {
        const [mes, ano] = mesAno.split('/');
        const nomes = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${nomes[parseInt(mes)]}/${ano}`;
    });
    
    const dados = mesesOrdenados.map(mesAno => vagasPorMes[mesAno] || 0);

    const ctx = document.getElementById('chartVagasConcedidasTempo').getContext('2d');
    if (charts.vagasConcedidasTempo) charts.vagasConcedidasTempo.destroy();

    charts.vagasConcedidasTempo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Vagas Disponibilizadas',
                data: dados,
                borderColor: '#f97316', // Laranja (cor similar à imagem)
                backgroundColor: 'rgba(249, 115, 22, 0.2)', // Laranja com transparência
                borderWidth: 3,
                fill: true,
                tension: 0.4, // Suavizar a linha (similar à imagem)
                pointBackgroundColor: '#f97316',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    position: 'top'
                },
                datalabels: {
                    color: '#f97316',
                    font: { weight: 'bold', size: 11 },
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value > 0 ? value.toString() : ''
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Período (Mês/Ano)',
                        font: { size: 12 }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        maxRotation: 45,
                        font: { size: 10 }
                    }
                },
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade Total de Vagas',
                        font: { size: 12 }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        stepSize: 1,
                        font: { size: 10 }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                line: {
                    tension: 0.4 // Linha suave como na imagem
                }
            }
        }
    });
}

// TABELA CORRIGIDA: Removidas as colunas Nome do Paciente e Telefone
function updateTable() {
    // Destruir a tabela anterior se existir
    if (dataTable) {
        dataTable.destroy();
        dataTable = null;
    }
    
    const tableBody = document.querySelector('#agendamentosTable tbody');
    if (!tableBody) {
        console.error('Elemento tbody da tabela não encontrado');
        return;
    }
    
    // Limpar o conteúdo anterior
    tableBody.innerHTML = '';
    
    // Inserir os dados filtrados (SEM as colunas Nome do Paciente e Telefone)
    tableBody.innerHTML = filteredData.map(item => `
        <tr>
            <td>${item.unidadeSaude || ''}</td>
            <td>${item.dataAgendamento || ''}</td>
            <td>${item.horarioAgendamento || ''}</td>
            <td>${item.prontuarioVivver || ''}</td>
            <td>${item.observacaoUnidadeSaude || ''}</td>
            <td>${item.perfilPacienteExame || ''}</td>
            <td>${item.laboratorioColeta || ''}</td>
        </tr>
    `).join('');
    
    // Inicializar o DataTable
    dataTable = $('#agendamentosTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json'
        },
        pageLength: 15,
        responsive: true,
        order: [[1, 'asc']], // Ordenar por data
        columnDefs: [
            { 
                targets: [0, 4, 5, 6], // Colunas que podem ter texto longo
                render: function(data, type, row) {
                    if (type === 'display' && data && data.length > 30) {
                        return `<span title="${data}">${data.substr(0, 30)}...</span>`;
                    }
                    return data;
                }
            }
        ]
    });
}

// FUNÇÃO ATUALIZADA: updateSummaryTables - usando funções centrais para verificar coluna F
function updateSummaryTables() {
    // Determinar qual dataset usar baseado nos filtros ativos
    const datasetBase = hasActiveFilters() ? filteredData : allData;
    
    // 1. Pacientes Agendados por Dia/Unidade (usando função central baseada na coluna F)
    const pacientesDiaUnidade = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && isPacienteAgendado(item.nomePaciente)) {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            pacientesDiaUnidade[key] = (pacientesDiaUnidade[key] || 0) + 1;
        }
    });
    const totalPacientesDiaUnidade = updateSummaryTableWithTotal('tablePacientesDiaUnidade', Object.entries(pacientesDiaUnidade).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalPacientesDiaUnidade').textContent = totalPacientesDiaUnidade;

    // 2. Pacientes Agendados por Mês/Unidade (usando função central baseada na coluna F)
    const pacientesMesUnidade = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && isPacienteAgendado(item.nomePaciente)) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                pacientesMesUnidade[key] = (pacientesMesUnidade[key] || 0) + 1;
            }
        }
    });
    const totalPacientesMesUnidade = updateSummaryTableWithTotal('tablePacientesMesUnidade', Object.entries(pacientesMesUnidade).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalPacientesMesUnidade').textContent = totalPacientesMesUnidade;

    // 3. Pacientes Agendados por Dia/Laboratório (usando função central baseada na coluna F)
    const pacientesDiaLab = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && isPacienteAgendado(item.nomePaciente)) {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            pacientesDiaLab[key] = (pacientesDiaLab[key] || 0) + 1;
        }
    });
    const totalPacientesDiaLab = updateSummaryTableWithTotal('tablePacientesDiaLab', Object.entries(pacientesDiaLab).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalPacientesDiaLab').textContent = totalPacientesDiaLab;

    // 4. Pacientes Agendados por Mês/Laboratório (usando função central baseada na coluna F)
    const pacientesMesLab = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && isPacienteAgendado(item.nomePaciente)) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                pacientesMesLab[key] = (pacientesMesLab[key] || 0) + 1;
            }
        }
    });
    const totalPacientesMesLab = updateSummaryTableWithTotal('tablePacientesMesLab', Object.entries(pacientesMesLab).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalPacientesMesLab').textContent = totalPacientesMesLab;

    // 5. Vagas Livres por Dia/Unidade (usando função central baseada na coluna F)
    const vagasLivresDiaUnidade = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && isVagaLivre(item.nomePaciente)) {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            vagasLivresDiaUnidade[key] = (vagasLivresDiaUnidade[key] || 0) + 1;
        }
    });
    const totalVagasLivresDiaUnidade = updateSummaryTableWithTotal('tableVagasLivresDiaUnidade', Object.entries(vagasLivresDiaUnidade).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalVagasLivresDiaUnidade').textContent = totalVagasLivresDiaUnidade;

    // 6. Vagas Livres por Mês/Unidade (usando função central baseada na coluna F)
    const vagasLivresMesUnidade = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && isVagaLivre(item.nomePaciente)) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                vagasLivresMesUnidade[key] = (vagasLivresMesUnidade[key] || 0) + 1;
            }
        }
    });
    const totalVagasLivresMesUnidade = updateSummaryTableWithTotal('tableVagasLivresMesUnidade', Object.entries(vagasLivresMesUnidade).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalVagasLivresMesUnidade').textContent = totalVagasLivresMesUnidade;

    // 7. Vagas Livres por Dia/Laboratório (usando função central baseada na coluna F)
    const vagasLivresDiaLab = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && isVagaLivre(item.nomePaciente)) {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            vagasLivresDiaLab[key] = (vagasLivresDiaLab[key] || 0) + 1;
        }
    });
    const totalVagasLivresDiaLab = updateSummaryTableWithTotal('tableVagasLivresDiaLab', Object.entries(vagasLivresDiaLab).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalVagasLivresDiaLab').textContent = totalVagasLivresDiaLab;

    // 8. Vagas Livres por Mês/Laboratório (usando função central baseada na coluna F)
    const vagasLivresMesLab = {};
    datasetBase.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && isVagaLivre(item.nomePaciente)) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                vagasLivresMesLab[key] = (vagasLivresMesLab[key] || 0) + 1;
            }
        }
    });
    const totalVagasLivresMesLab = updateSummaryTableWithTotal('tableVagasLivresMesLab', Object.entries(vagasLivresMesLab).sort((a, b) => b[1] - a[1]));
    document.getElementById('totalVagasLivresMesLab').textContent = totalVagasLivresMesLab;
}

// Função auxiliar para verificar se há filtros ativos
function hasActiveFilters() {
    const unidadeSaudeFilter = $('#unidadeSaudeFilter').val() || [];
    const laboratorioColetaFilter = $('#laboratorioColetaFilter').val() || [];
    const mesAnoFilter = $('#mesAnoFilter').val() || [];
    const dataFilter = document.getElementById('dataFilter').value;
    const horarioFilter = $('#horarioFilter').val() || [];
    
    return unidadeSaudeFilter.length > 0 || laboratorioColetaFilter.length > 0 || 
           mesAnoFilter.length > 0 || dataFilter || horarioFilter.length > 0;
}

// FUNÇÃO NOVA: Atualizar tabela de resumo com total
function updateSummaryTableWithTotal(tableId, data) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    if (tableBody) {
        const total = data.reduce((sum, [key, value]) => sum + value, 0);
        
        tableBody.innerHTML = data.map(([key, value]) => `
            <tr>
                <td class="py-1 text-xs">${key}</td>
                <td class="py-1 text-xs text-right font-semibold">${value}</td>
            </tr>
        `).join('');
        
        return total;
    }
    return 0;
}

function clearFilters() {
    $('.filter-select').val(null).trigger('change');
    document.getElementById('dataFilter').value = '';
    applyFilters();
    updateFilterDisplays();
}

// EXPORTAÇÃO CORRIGIDA: Sem nome do paciente e telefone
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
        'UNIDADE DE SAÚDE': item.unidadeSaude || '',
        'DATA': item.dataAgendamento || '',
        'HORÁRIO': item.horarioAgendamento || '',
        'Nº PRONTUÁRIO VIVVER': item.prontuarioVivver || '',
        'OBSERVAÇÃO/ UNIDADE DE SAÚDE': item.observacaoUnidadeSaude || '',
        'PERFIL DO PACIENTE OU TIPO DO EXAME': item.perfilPacienteExame || '',
        'LABORATÓRIO DE COLETA': item.laboratorioColeta || ''
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
    
    XLSX.writeFile(wb, `agendamentos_eldorado_${new Date().toISOString().split('T')[0]}.xlsx`);
}

document.addEventListener('DOMContentLoaded', function() {
    // Definir data mínima para o filtro de data como 01/11/2025
    document.getElementById('dataFilter').min = '2025-11-01';
    
    loadData();
    setInterval(loadData, 600000); // Auto-atualização a cada 10 minutos
});
