let allData = [];
let filteredData = [];
let charts = {};
let dataTable;

// URL corrigida para acessar a planilha como CSV
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Gtan6GhpDO5ViVuNMiT0AGm3F5I5iZSIYhWHVJ3ga6E/export?format=csv&gid=64540129';

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
                        unidadeSaude: (values[2] || '').trim(),
                        dataAgendamento: (values[3] || '').trim(),
                        horarioAgendamento: (values[4] || '').trim(),
                        nomePaciente: (values[5] || '').trim(),
                        telefone: (values[6] || '').trim(),
                        prontuarioVivver: (values[7] || '').trim(),
                        observacaoUnidadeSaude: (values[8] || '').trim(),
                        perfilPacienteExame: (values[9] || '').trim(),
                        laboratorioColeta: (values[10] || '').trim()
                    };

                    // Só adiciona se tiver pelo menos unidade de saúde ou data
                    if (row.unidadeSaude !== '' || row.dataAgendamento !== '') {
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

function loadSampleData() {
    // Dados de exemplo baseados na estrutura real da planilha
    allData = [
        { 
            unidadeSaude: 'AGUA BRANCA', 
            dataAgendamento: '11/11/2025', 
            horarioAgendamento: '8h10', 
            nomePaciente: '', 
            telefone: '',
            prontuarioVivver: '',
            observacaoUnidadeSaude: 'Preencher',
            perfilPacienteExame: 'Preencher',
            laboratorioColeta: 'AGUA BRANCA' 
        },
        { 
            unidadeSaude: 'JARDIM BANDEIRANTES', 
            dataAgendamento: '12/11/2025', 
            horarioAgendamento: '7h10', 
            nomePaciente: 'João Silva', 
            telefone: '(11) 99999-9999',
            prontuarioVivver: '12345',
            observacaoUnidadeSaude: 'Paciente regular',
            perfilPacienteExame: 'Exame de rotina',
            laboratorioColeta: 'ELDORADO' 
        },
        { 
            unidadeSaude: 'UNIDADE XV', 
            dataAgendamento: '13/11/2025', 
            horarioAgendamento: '8h10', 
            nomePaciente: 'Maria Santos', 
            telefone: '(11) 88888-8888',
            prontuarioVivver: '54321',
            observacaoUnidadeSaude: 'Primeira consulta',
            perfilPacienteExame: 'Exame preventivo',
            laboratorioColeta: 'PARQUE SÃO JOÃO' 
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function updateFilters() {
    // Unidades de Saúde predefinidas conforme especificado
    const unidadesSaude = [
        'AGUA BRANCA', 'JARDIM BANDEIRANTES', 'UNIDADE XV', 'CSU ELDORADO', 
        'NOVO ELDORADO', 'JARDIM ELDORADO', 'SANTA CRUZ', 'PEROBAS', 'PARQUE SÃO JOÃO'
    ];
    
    // Laboratórios de Coleta predefinidos
    const laboratoriosColeta = ['ELDORADO', 'AGUA BRANCA', 'PARQUE SÃO JOÃO'];
    
    // Horários únicos dos dados
    const horariosSet = new Set();
    allData.forEach(item => {
        if (item.horarioAgendamento && item.horarioAgendamento.trim()) {
            horariosSet.add(item.horarioAgendamento.trim());
        }
    });

    updateSelectOptions('unidadeSaudeFilter', unidadesSaude);
    updateSelectOptions('horarioFilter', Array.from(horariosSet).sort());
    updateSelectOptions('laboratorioColetaFilter', laboratoriosColeta);

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
    const totalVagas = allData.length;
    // Vagas ocupadas são aquelas que têm nome do paciente preenchido
    const vagasOcupadas = allData.filter(item => item.nomePaciente && item.nomePaciente.trim() !== '').length;
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
    updateChartUltimaDataUnidade();
    updateChartUltimaDataLaboratorio();
}

function updateChartUltimaDataUnidade() {
    const lastDateByUnidade = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                if (!lastDateByUnidade[item.unidadeSaude] || date > lastDateByUnidade[item.unidadeSaude]) {
                    lastDateByUnidade[item.unidadeSaude] = date;
                }
            }
        }
    });

    const sortedData = Object.entries(lastDateByUnidade)
        .map(([unidade, date]) => [unidade, date])
        .sort((a, b) => b[1] - a[1]);

    const ctx = document.getElementById('chartUltimaDataUnidade').getContext('2d');
    if (charts.ultimaDataUnidade) charts.ultimaDataUnidade.destroy();

    charts.ultimaDataUnidade = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                label: 'Última Data de Agendamento',
                data: sortedData.map(item => item[1]),
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
                    formatter: (value) => value.toLocaleDateString('pt-BR')
                }
            },
            scales: {
                x: { display: false },
                y: { beginAtZero: true }
            }
        }
    });
}

function updateChartUltimaDataLaboratorio() {
    const lastDateByLab = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                if (!lastDateByLab[item.laboratorioColeta] || date > lastDateByLab[item.laboratorioColeta]) {
                    lastDateByLab[item.laboratorioColeta] = date;
                }
            }
        }
    });

    const sortedData = Object.entries(lastDateByLab)
        .map(([lab, date]) => [lab, date])
        .sort((a, b) => b[1] - a[1]);

    const ctx = document.getElementById('chartUltimaDataLaboratorio').getContext('2d');
    if (charts.ultimaDataLaboratorio) charts.ultimaDataLaboratorio.destroy();

    charts.ultimaDataLaboratorio = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                label: 'Última Data de Agendamento',
                data: sortedData.map(item => item[1]),
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
                    formatter: (value) => value.toLocaleDateString('pt-BR')
                }
            },
            scales: {
                x: { display: false },
                y: { beginAtZero: true }
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
    
    // Inserir os dados filtrados
    tableBody.innerHTML = filteredData.map(item => `
        <tr>
            <td>${item.unidadeSaude || ''}</td>
            <td>${item.dataAgendamento || ''}</td>
            <td>${item.horarioAgendamento || ''}</td>
            <td>${item.nomePaciente || ''}</td>
            <td>${item.telefone || ''}</td>
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
        order: [[1, 'desc']],
        columnDefs: [
            { 
                targets: [0, 6, 7, 8], // Colunas que podem ter texto longo
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
    // Pacientes por Dia/Unidade
    const dayUnidadeCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && item.nomePaciente.trim()) {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            dayUnidadeCount[key] = (dayUnidadeCount[key] || 0) + 1;
        }
    });
    updateSummaryTable('tablePacientesDiaUnidade', Object.entries(dayUnidadeCount).sort((a, b) => b[1] - a[1]).slice(0, 10));

    // Pacientes por Mês/Unidade
    const monthUnidadeCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && item.nomePaciente.trim()) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                monthUnidadeCount[key] = (monthUnidadeCount[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tablePacientesMesUnidade', Object.entries(monthUnidadeCount).sort((a, b) => b[1] - a[1]).slice(0, 10));

    // Pacientes por Dia/Laboratório
    const dayLabCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && item.nomePaciente.trim()) {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            dayLabCount[key] = (dayLabCount[key] || 0) + 1;
        }
    });
    updateSummaryTable('tablePacientesDiaLab', Object.entries(dayLabCount).sort((a, b) => b[1] - a[1]).slice(0, 10));

    // Pacientes por Mês/Laboratório
    const monthLabCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && item.nomePaciente.trim()) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                monthLabCount[key] = (monthLabCount[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tablePacientesMesLab', Object.entries(monthLabCount).sort((a, b) => b[1] - a[1]).slice(0, 10));

    // NOVAS TABELAS - Vagas Livres
    // Vagas Livres por Dia/Unidade
    const vagasLivresDiaUnidade = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && !item.nomePaciente.trim()) {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            vagasLivresDiaUnidade[key] = (vagasLivresDiaUnidade[key] || 0) + 1;
        }
    });
    updateSummaryTable('tableVagasLivresDiaUnidade', Object.entries(vagasLivresDiaUnidade).sort((a, b) => b[1] - a[1]).slice(0, 10));

    // Vagas Livres por Mês/Unidade
    const vagasLivresMesUnidade = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude && !item.nomePaciente.trim()) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                vagasLivresMesUnidade[key] = (vagasLivresMesUnidade[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tableVagasLivresMesUnidade', Object.entries(vagasLivresMesUnidade).sort((a, b) => b[1] - a[1]).slice(0, 10));

    // Vagas Livres por Dia/Laboratório
    const vagasLivresDiaLab = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && !item.nomePaciente.trim()) {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            vagasLivresDiaLab[key] = (vagasLivresDiaLab[key] || 0) + 1;
        }
    });
    updateSummaryTable('tableVagasLivresDiaLab', Object.entries(vagasLivresDiaLab).sort((a, b) => b[1] - a[1]).slice(0, 10));

    // Vagas Livres por Mês/Laboratório
    const vagasLivresMesLab = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta && !item.nomePaciente.trim()) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                vagasLivresMesLab[key] = (vagasLivresMesLab[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tableVagasLivresMesLab', Object.entries(vagasLivresMesLab).sort((a, b) => b[1] - a[1]).slice(0, 10));
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
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
        'UNIDADE DE SAÚDE': item.unidadeSaude || '',
        'DATA': item.dataAgendamento || '',
        'HORÁRIO': item.horarioAgendamento || '',
        'NOME DO PACIENTE': item.nomePaciente || '',
        'TELEFONE': item.telefone || '',
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
    loadData();
    setInterval(loadData, 300000); // Auto-atualização a cada 5 minutos
});
