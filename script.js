let allData = [];
let filteredData = [];
let charts = {};
let dataTable;

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Gtan6GhpDO5ViVuNMiT0AGm3F5I5iZSIYhWHVJ3ga6E/export?format=csv&gid=64540129';

async function loadData( ) {
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

        // Os dados começam na linha 6 (índice 5)
        for (let i = 5; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCSVLine(line);
                // As colunas de interesse são C a K (índices 2 a 10)
                if (values.length >= 11) {
                    let row = {
                        unidadeSaude: values[2] || '',
                        dataAgendamento: values[3] || '',
                        horarioAgendamento: values[4] || '',
                        nomePaciente: values[5] || '',
                        telefone: values[6] || '',
                        prontuarioVivver: values[7] || '',
                        observacaoUnidadeSaude: values[8] || '',
                        perfilPacienteExame: values[9] || '',
                        laboratorioColeta: values[10] || ''
                    };

                    if (row.unidadeSaude.trim() || row.dataAgendamento.trim()) {
                        allData.push(row);
                    }
                }
            }
        }

        if (allData.length === 0) {
            throw new Error('Nenhum dado válido encontrado na planilha.');
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
    allData = [
        { unidadeSaude: 'AGUA BRANCA', dataAgendamento: '11/11/2025', horarioAgendamento: '8h10', nomePaciente: 'Exemplo Paciente 1', laboratorioColeta: 'AGUA BRANCA' },
        { unidadeSaude: 'JARDIM BANDEIRANTES', dataAgendamento: '12/11/2025', horarioAgendamento: '7h10', nomePaciente: 'Exemplo Paciente 2', laboratorioColeta: 'ELDORADO' },
        { unidadeSaude: 'UNIDADE XV', dataAgendamento: '13/11/2025', horarioAgendamento: '8h10', nomePaciente: 'Exemplo Paciente 3', laboratorioColeta: 'PARQUE SÃO JOÃO' }
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
    const unidadeSaudeSet = new Set();
    const horarioSet = new Set();
    const laboratorioColetaSet = new Set();

    allData.forEach(item => {
        if (item.unidadeSaude && item.unidadeSaude.trim()) unidadeSaudeSet.add(item.unidadeSaude.trim());
        if (item.horarioAgendamento && item.horarioAgendamento.trim()) horarioSet.add(item.horarioAgendamento.trim());
        if (item.laboratorioColeta && item.laboratorioColeta.trim()) laboratorioColetaSet.add(item.laboratorioColeta.trim());
    });

    updateSelectOptions('unidadeSaudeFilter', Array.from(unidadeSaudeSet).sort());
    updateSelectOptions('horarioFilter', Array.from(horarioSet).sort());
    updateSelectOptions('laboratorioColetaFilter', Array.from(laboratorioColetaSet).sort());

    $('.filter-select').select2({
        placeholder: 'Selecione uma ou mais opções',
        allowClear: true
    }).off('change').on('change', applyFilters);

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
        const itemDate = item.dataAgendamento ? parseDate(item.dataAgendamento) : null;
        const filterDate = dataFilter ? new Date(dataFilter) : null;

        const inUnidade = unidadeSaudeFilter.length === 0 || unidadeSaudeFilter.includes(item.unidadeSaude);
        const inHorario = horarioFilter.length === 0 || horarioFilter.includes(item.horarioAgendamento);
        const inLaboratorio = laboratorioColetaFilter.length === 0 || laboratorioColetaFilter.includes(item.laboratorioColeta);
        const inDate = !filterDate || (itemDate && itemDate.toDateString() === filterDate.toDateString());

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
    const vagasOcupadas = allData.filter(item => item.nomePaciente && item.nomePaciente.trim() !== '').length;
    const vagasLivres = totalVagas - vagasOcupadas;
    const taxaOcupacao = totalVagas > 0 ? (vagasOcupadas / totalVagas * 100).toFixed(1) + '%' : '0.0%';

    document.getElementById('totalVagas').textContent = totalVagas;
    document.getElementById('vagasOcupadas').textContent = vagasOcupadas;
    document.getElementById('vagasLivres').textContent = vagasLivres;
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
    if (dataTable) {
        dataTable.destroy();
    }
    
    const tableBody = document.querySelector('#agendamentosTable tbody');
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
    
    dataTable = $('#agendamentosTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json'
        },
        pageLength: 15,
        responsive: true,
        order: [[1, 'desc']]
    });
}

function updateSummaryTables() {
    const dayUnidadeCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude) {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            dayUnidadeCount[key] = (dayUnidadeCount[key] || 0) + 1;
        }
    });
    updateSummaryTable('tablePacientesDiaUnidade', Object.entries(dayUnidadeCount).sort((a, b) => b[1] - a[1]).slice(0, 10));

    const monthUnidadeCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                monthUnidadeCount[key] = (monthUnidadeCount[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tablePacientesMesUnidade', Object.entries(monthUnidadeCount).sort((a, b) => b[1] - a[1]).slice(0, 10));

    const dayLabCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta) {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            dayLabCount[key] = (dayLabCount[key] || 0) + 1;
        }
    });
    updateSummaryTable('tablePacientesDiaLab', Object.entries(dayLabCount).sort((a, b) => b[1] - a[1]).slice(0, 10));

    const monthLabCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                monthLabCount[key] = (monthLabCount[key] || 0) + 1;
            }
        }
    });
    updateSummaryTable('tablePacientesMesLab', Object.entries(monthLabCount).sort((a, b) => b[1] - a[1]).slice(0, 10));
}

function updateSummaryTable(tableId, data) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    tableBody.innerHTML = data.map(([key, value]) => `
        <tr>
            <td class="py-1 text-xs">${key}</td>
            <td class="py-1 text-xs text-right font-semibold">${value}</td>
        </tr>
    `).join('');
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
        'Laboratório de Coleta': item.laboratorioColeta || ''
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
    
    XLSX.writeFile(wb, `agendamentos_eldorado_${new Date().toISOString().split('T')[0]}.xlsx`);
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setInterval(loadData, 300000); // Auto-atualização a cada 5 minutos
});
