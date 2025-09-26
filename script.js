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
                        nomePaciente: (values[5] || '').trim(), // Coluna F
                        telefone: (values[6] || '').trim(), // Coluna G
                        prontuarioVivver: (values[7] || '').trim(), // Coluna H
                        observacaoUnidadeSaude: (values[8] || '').trim(), // Coluna I
                        perfilPacienteExame: (values[9] || '').trim(), // Coluna J
                        laboratorioColeta: normalizeLaboratorio((values[10] || '').trim()) // Coluna K
                    };

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
    
    // Mapeamento para normalizar variações dos nomes
    if (upper.includes('AGUA BRANCA')) return 'Agua Branca';
    if (upper.includes('JARDIM BANDEIRANTES')) return 'Jardim Bandeirantes';
    if (upper.includes('UNIDADE XV')) return 'Unidade XV';
    if (upper.includes('CSU ELDORADO')) return 'Csu Eldorado';
    if (upper.includes('NOVO ELDORADO')) return 'Novo Eldorado';
    if (upper.includes('JARDIM ELDORADO')) return 'Jardim Eldorado';
    if (upper.includes('SANTA CRUZ')) return 'Santa Cruz';
    if (upper.includes('PEROBAS')) return 'Perobas';
    if (upper.includes('PARQUE SAO JOAO') || upper.includes('PARQUE SÃO JOÃO')) return 'Parque São João';
    
    return unidade;
}

function normalizeLaboratorio(lab) {
    if (!lab) return '';
    const upper = lab.toUpperCase();
    
    if (upper.includes('ELDORADO')) return 'Eldorado';
    if (upper.includes('AGUA BRANCA')) return 'Agua Branca';
    if (upper.includes('PARQUE SAO JOAO') || upper.includes('PARQUE SÃO JOÃO')) return 'Parque São João';
    
    return lab;
}

function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = parseDate(dateStr);
    return date && !isNaN(date.getTime());
}

function loadSampleData() {
    // Dados de exemplo com agendamentos futuros a partir de 01/11/2025
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
            laboratorioColeta: 'Eldorado' 
        },
        { 
            unidadeSaude: 'Unidade XV', 
            dataAgendamento: '25/12/2025', 
            horarioAgendamento: '8h10', 
            nomePaciente: '', 
            telefone: '',
            prontuarioVivver: '',
            observacaoUnidadeSaude: 'Preencher',
            perfilPacienteExame: 'Preencher',
            laboratorioColeta: 'Parque São João' 
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

    updateSelectOptions('unidadeSaudeFilter', UNIDADES_SAUDE);
    updateSelectOptions('horarioFilter', Array.from(horariosSet).sort());
    updateSelectOptions('laboratorioColetaFilter', LABORATORIOS_COLETA);

    // Reinicializar Select2
    $('.filter-select').select2({
        placeholder: 'Selecione uma ou mais opções',
        allowClear: true
    }).off('change').on('change', applyFilters);

    // Aplicar evento ao filtro de data
    document.getElementById('dataFilter').removeEventListener('change', applyFilters);
    document.getElementById('dataFilter').addEventListener('change', applyFilters);
}

function updateSelectOptions(selectId, options) {
    const select = $(`#${selectId}`);
    select.empty();
    options.forEach(option => {
        select.append(new Option(option, option, false, false));
    });
    select.trigger('change');
}

function applyFilters() {
    const unidadeSaudeFilter = $('#unidadeSaudeFilter').val() || [];
    const horarioFilter = $('#horarioFilter').val() || [];
    const dataFilter = document.getElementById('dataFilter').value;
    const laboratorioColetaFilter = $('#laboratorioColetaFilter').val() || [];

    filteredData = allData.filter(item => {
        let inUnidade = unidadeSaudeFilter.length === 0 || unidadeSaudeFilter.includes(item.unidadeSaude);
        let inHorario = horarioFilter.length === 0 || horarioFilter.includes(item.horarioAgendamento);
        let inLaboratorio = laboratorioColetaFilter.length === 0 || laboratorioColetaFilter.includes(item.laboratorioColeta);
        
        let inDate = true;
        if (dataFilter) {
            const itemDate = item.dataAgendamento ? parseDate(item.dataAgendamento) : null;
            const filterDate = new Date(dataFilter);
            inDate = itemDate && itemDate.toDateString() === filterDate.toDateString();
        }

        return inUnidade && inHorario && inLaboratorio && inDate;
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

function updateStats() {
    const totalVagas = filteredData.length;
    // Vagas ocupadas são aquelas que têm nome do paciente preenchido (coluna F)
    const vagasOcupadas = filteredData.filter(item => 
        item.nomePaciente && 
        item.nomePaciente.trim() !== '' && 
        item.nomePaciente.trim().toLowerCase() !== 'preencher'
    ).length;
    const vagasLivres = totalVagas - vagasOcupadas;
    const taxaOcupacao = totalVagas > 0 ? (vagasOcupadas / totalVagas * 100).toFixed(1) + '%' : '0.0%';

    document.getElementById('totalVagas').textContent = totalVagas.toLocaleString();
    document.getElementById('vagasOcupadas').textContent = vagasOcupadas.toLocaleString();
    document.getElementById('vagasLivres').textContent = vagasLivres.toLocaleString();
    document.getElementById('taxaOcupacao').textContent = taxaOcupacao;
}

Chart.register(ChartDataLabels);

function updateDashboard() {
    updateCharts();
    updateTable();
    updateSummaryTables();
}

function updateCharts() {
    updateChartProximosAgendamentosUnidade();
    updateChartProximosAgendamentosLaboratorio();
}

function updateChartProximosAgendamentosUnidade() {
    const proximosAgendamentosPorUnidade = {};
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Para cada unidade, encontrar o próximo agendamento disponível (vaga livre)
    UNIDADES_SAUDE.forEach(unidade => {
        const vagasLivresUnidade = filteredData.filter(item => 
            item.unidadeSaude === unidade &&
            (!item.nomePaciente || 
             item.nomePaciente.trim() === '' || 
             item.nomePaciente.trim().toLowerCase() === 'preencher')
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
        .slice(0, 10); // Limitar a 10 unidades

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

function updateChartProximosAgendamentosLaboratorio() {
    const proximosAgendamentosPorLab = {};
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Para cada laboratório, encontrar o próximo agendamento disponível (vaga livre)
    LABORATORIOS_COLETA.forEach(lab => {
        const vagasLivresLab = filteredData.filter(item => 
            item.laboratorioColeta === lab &&
            (!item.nomePaciente || 
             item.nomePaciente.trim() === '' || 
             item.nomePaciente.trim().toLowerCase() === 'preencher')
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

function updateSummaryTables() {
    // Pacientes por Dia/Unidade (apenas com nome preenchido) - TODOS OS DADOS
    const dayUnidadeCount = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && 
            item.nomePaciente && item.nomePaciente.trim() !== '' && 
            item.nomePaciente.trim().toLowerCase() !== 'preencher') {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            dayUnidadeCount[key] = (dayUnidadeCount[key] || 0) + 1;
        }
    });
    updateSummaryTable('tablePacientesDiaUnidade', Object.entries(dayUnidadeCount).sort((a, b) => b[1] - a[1]));

    // Pacientes por Mês/Unidade (apenas com nome preenchido) - TODOS OS DADOS
    const monthUnidadeCount = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && 
            item.nomePaciente && item.nomePaciente.trim() !== '' && 
            item.nomePaciente.trim().toLowerCase() !== 'preencher') {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                monthUnidadeCount[key] = (monthUnidadeCount[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tablePacientesMesUnidade', Object.entries(monthUnidadeCount).sort((a, b) => b[1] - a[1]));

    // Pacientes por Dia/Laboratório (apenas com nome preenchido) - TODOS OS DADOS
    const dayLabCount = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && 
            item.nomePaciente && item.nomePaciente.trim() !== '' && 
            item.nomePaciente.trim().toLowerCase() !== 'preencher') {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            dayLabCount[key] = (dayLabCount[key] || 0) + 1;
        }
    });
    updateSummaryTable('tablePacientesDiaLab', Object.entries(dayLabCount).sort((a, b) => b[1] - a[1]));

    // Pacientes por Mês/Laboratório (apenas com nome preenchido) - TODOS OS DADOS
    const monthLabCount = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && 
            item.nomePaciente && item.nomePaciente.trim() !== '' && 
            item.nomePaciente.trim().toLowerCase() !== 'preencher') {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                monthLabCount[key] = (monthLabCount[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tablePacientesMesLab', Object.entries(monthLabCount).sort((a, b) => b[1] - a[1]));

    // TABELAS DE VAGAS LIVRES - TODOS OS DADOS
    // Vagas Livres por Dia/Unidade
    const vagasLivresDiaUnidade = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && 
            (!item.nomePaciente || item.nomePaciente.trim() === '' || 
             item.nomePaciente.trim().toLowerCase() === 'preencher')) {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            vagasLivresDiaUnidade[key] = (vagasLivresDiaUnidade[key] || 0) + 1;
        }
    });
    updateSummaryTable('tableVagasLivresDiaUnidade', Object.entries(vagasLivresDiaUnidade).sort((a, b) => b[1] - a[1]));

    // Vagas Livres por Mês/Unidade
    const vagasLivresMesUnidade = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && 
            (!item.nomePaciente || item.nomePaciente.trim() === '' || 
             item.nomePaciente.trim().toLowerCase() === 'preencher')) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                vagasLivresMesUnidade[key] = (vagasLivresMesUnidade[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tableVagasLivresMesUnidade', Object.entries(vagasLivresMesUnidade).sort((a, b) => b[1] - a[1]));

    // Vagas Livres por Dia/Laboratório
    const vagasLivresDiaLab = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && 
            (!item.nomePaciente || item.nomePaciente.trim() === '' || 
             item.nomePaciente.trim().toLowerCase() === 'preencher')) {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            vagasLivresDiaLab[key] = (vagasLivresDiaLab[key] || 0) + 1;
        }
    });
    updateSummaryTable('tableVagasLivresDiaLab', Object.entries(vagasLivresDiaLab).sort((a, b) => b[1] - a[1]));

    // Vagas Livres por Mês/Laboratório
    const vagasLivresMesLab = {};
    allData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && 
            (!item.nomePaciente || item.nomePaciente.trim() === '' || 
             item.nomePaciente.trim().toLowerCase() === 'preencher')) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                vagasLivresMesLab[key] = (vagasLivresMesLab[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tableVagasLivresMesLab', Object.entries(vagasLivresMesLab).sort((a, b) => b[1] - a[1]));
}

function updateSummaryTable(tableId, data) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    if (tableBody) {
        const total = data.reduce((sum, [key, value]) => sum + value, 0);
        
        tableBody.innerHTML = data.map(([key, value]) => `
            <tr>
                <td class="py-1 text-xs">${key}</td>
                <td class="py-1 text-xs text-right font-semibold">${value}</td>
            </tr>
        `).join('') + (total > 0 ? `
            <tr class="border-t-2 border-gray-300 font-bold">
                <td class="py-2 text-xs">Total</td>
                <td class="py-2 text-xs text-right">${total}</td>
            </tr>
        ` : '');
    }
}

function clearFilters() {
    $('.filter-select').val(null).trigger('change');
    document.getElementById('dataFilter').value = '';
    applyFilters();
}

function exportToExcel() {
    // Na exportação, incluir apenas as colunas visíveis (sem nome e telefone)
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
    setInterval(loadData, 300000); // Auto-atualização a cada 5 minutos
});
