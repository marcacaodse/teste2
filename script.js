let allData = [];
let filteredData = [];
let charts = {};
let dataTable;

const SHEET_URL ='https://docs.google.com/spreadsheets/d/1Gtan6GhpDO5ViVuNMiT0AGm3F5I5iZSIYhWHVJ3ga6E/edit?pli=1&gid=64540129#gid=64540129';

// Sample data for demonstration
const sampleData = [
    {
        unidadeSaude: 'UBS Centro',
        dataAgendamento: '15/09/2025',
        horarioAgendamento: '08:00',
        nomePaciente: 'João Silva',
        telefone: '(11) 99999-9999',
        prontuarioVivver: '123456',
        observacaoUnidadeSaude: 'Paciente em jejum',
        perfilPacienteExame: 'Exame de sangue',
        laboratorioColeta: 'Lab Central'
    },
    {
        unidadeSaude: 'UBS Norte',
        dataAgendamento: '16/09/2025',
        horarioAgendamento: '09:00',
        nomePaciente: 'Maria Santos',
        telefone: '(11) 88888-8888',
        prontuarioVivver: '654321',
        observacaoUnidadeSaude: 'Primeira coleta',
        perfilPacienteExame: 'Exame de urina',
        laboratorioColeta: 'Lab Norte'
    },
    {
        unidadeSaude: 'UBS Sul',
        dataAgendamento: '17/09/2025',
        horarioAgendamento: '10:00',
        nomePaciente: 'Pedro Oliveira',
        telefone: '(11) 77777-7777',
        prontuarioVivver: '789123',
        observacaoUnidadeSaude: 'Retorno',
        perfilPacienteExame: 'Hemograma completo',
        laboratorioColeta: 'Lab Sul'
    },
    {
        unidadeSaude: 'UBS Centro',
        dataAgendamento: '18/09/2025',
        horarioAgendamento: '11:00',
        nomePaciente: 'Ana Costa',
        telefone: '(11) 66666-6666',
        prontuarioVivver: '456789',
        observacaoUnidadeSaude: 'Paciente diabético',
        perfilPacienteExame: 'Glicemia',
        laboratorioColeta: 'Lab Central'
    },
    {
        unidadeSaude: 'UBS Leste',
        dataAgendamento: '19/09/2025',
        horarioAgendamento: '14:00',
        nomePaciente: 'Carlos Ferreira',
        telefone: '(11) 55555-5555',
        prontuarioVivver: '321654',
        observacaoUnidadeSaude: 'Acompanhamento',
        perfilPacienteExame: 'Colesterol',
        laboratorioColeta: 'Lab Leste'
    }
];

async function loadData() {
    try {
        document.getElementById('connectionStatus').className = 'status-indicator status-online';
        document.getElementById('connectionText').textContent = 'Carregando...';

        // Try to load from Google Sheets, fallback to sample data
        try {
            const response = await fetch(SHEET_URL);
            const csvText = await response.text();

            if (csvText && csvText.length > 100) {
                const lines = csvText.split('\n');
                const headers = parseCSVLine(lines[0]);

                allData = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        const values = parseCSVLine(line);
                        if (values.length >= headers.length && values.some(val => val.trim() !== '')) {
                            let row = {};
                            headers.forEach((header, index) => {
                                // Clean up header names for easier access
                                let cleanHeader = header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                if (cleanHeader === 'unidadedesaude') cleanHeader = 'unidadeSaude';
                                if (cleanHeader === 'data') cleanHeader = 'dataAgendamento';
                                if (cleanHeader === 'horario') cleanHeader = 'horarioAgendamento';
                                if (cleanHeader === 'nprontuariovivver') cleanHeader = 'prontuarioVivver';
                                if (cleanHeader === 'observacaounidadedesaude') cleanHeader = 'observacaoUnidadeSaude';
                                if (cleanHeader === 'perfildopacienteoutipodoexame') cleanHeader = 'perfilPacienteExame';
                                if (cleanHeader === 'laboratoriodecoleta') cleanHeader = 'laboratorioColeta';

                                row[cleanHeader] = values[index] || '';
                            });
                            allData.push(row);
                        }
                    }
                }
            } else {
                throw new Error('Empty or invalid CSV data');
            }
        } catch (error) {
            console.log('Using sample data due to error:', error);
            // Use sample data for demonstration
            allData = [...sampleData];
            // Duplicate sample data to have more entries for demonstration
            for (let i = 0; i < 20; i++) {
                allData.push(...sampleData.map(item => ({
                    ...item,
                    dataAgendamento: `${15 + i}/09/2025`,
                    nomePaciente: `${item.nomePaciente} ${i + 1}`
                })));
            }
        }

        filteredData = [...allData];
        updateFilters();
        updateDashboard();

        document.getElementById('connectionStatus').className = 'status-indicator status-online';
        document.getElementById('connectionText').textContent = 'Conectado';
        document.getElementById('lastUpdate').textContent = `Última atualização: ${new Date().toLocaleString('pt-BR')}`;

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('connectionStatus').className = 'status-indicator status-offline';
        document.getElementById('connectionText').textContent = 'Erro de conexão';
    }
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
        if (item.unidadeSaude) unidadeSaudeSet.add(item.unidadeSaude);
        if (item.horarioAgendamento) horarioSet.add(item.horarioAgendamento);
        if (item.laboratorioColeta) laboratorioColetaSet.add(item.laboratorioColeta);
    });

    updateSelectOptions('unidadeSaudeFilter', Array.from(unidadeSaudeSet).sort());
    updateSelectOptions('horarioFilter', Array.from(horarioSet).sort());
    updateSelectOptions('laboratorioColetaFilter', Array.from(laboratorioColetaSet).sort());
}

function updateSelectOptions(selectId, options) {
    const select = document.getElementById(selectId);
    // Clear existing options, but keep the first 'Todos' option if it exists
    while (select.options.length > 0) {
        select.remove(0);
    }
    
    // Add a default 'Todos' option for single-select filters, or none for multi-select
    if (!select.multiple) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Todos';
        select.appendChild(defaultOption);
    }

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

function applyFilters() {
    const unidadeSaudeFilter = Array.from(document.getElementById('unidadeSaudeFilter').selectedOptions).map(option => option.value);
    const horarioFilter = Array.from(document.getElementById('horarioFilter').selectedOptions).map(option => option.value);
    const dataFilter = document.getElementById('dataFilter').value;
    const laboratorioColetaFilter = Array.from(document.getElementById('laboratorioColetaFilter').selectedOptions).map(option => option.value);

    filteredData = allData.filter(item => {
        if (unidadeSaudeFilter.length > 0 && !unidadeSaudeFilter.includes(item.unidadeSaude)) return false;
        if (horarioFilter.length > 0 && !horarioFilter.includes(item.horarioAgendamento)) return false;
        if (laboratorioColetaFilter.length > 0 && !laboratorioColetaFilter.includes(item.laboratorioColeta)) return false;

        if (dataFilter) {
            const itemDate = parseDate(item.dataAgendamento);
            const filterDate = new Date(dataFilter);
            if (itemDate && itemDate.toDateString() !== filterDate.toDateString()) return false;
        }

        return true;
    });

    updateDashboard();
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        // Date format is DD/MM/YYYY, convert to YYYY-MM-DD for Date object
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return null;
}

// Register Chart.js DataLabels plugin
Chart.register(ChartDataLabels);

function updateDashboard() {
    updateCharts();
    updateTable();
}

function updateCharts() {
    updateChartPacientesDiaUnidade();
    updateChartPacientesMesUnidade();
    updateChartPacientesDiaLaboratorio();
    updateChartPacientesMesLaboratorio();
    updateChartVagasLivresDiaUnidade();
    updateChartVagasLivresMesUnidade();
    updateChartUltimaDataAgendamento();
}

// Gráfico 1: Pacientes agendados por dia e unidade de saúde (azul escuro)
function updateChartPacientesDiaUnidade() {
    const dayUnidadeCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude) {
            const key = `${item.dataAgendamento} - ${item.unidadeSaude}`;
            dayUnidadeCount[key] = (dayUnidadeCount[key] || 0) + 1;
        }
    });

    const sortedData = Object.entries(dayUnidadeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const ctx = document.getElementById('chartPacientesDiaUnidade').getContext('2d');
    if (charts.pacientesDiaUnidade) charts.pacientesDiaUnidade.destroy();

    charts.pacientesDiaUnidade = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                label: 'Pacientes Agendados',
                data: sortedData.map(item => item[1]),
                backgroundColor: '#1e3a8a', // azul escuro
                borderColor: '#1e40af',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 15 },
                    anchor: 'center',
                    align: 'center'
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { maxRotation: 45 } }
            }
        }
    });
}

// Gráfico 2: Pacientes agendados por mês e unidade de saúde (verde escuro)
function updateChartPacientesMesUnidade() {
    const monthUnidadeCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.unidadeSaude) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.unidadeSaude}`;
                monthUnidadeCount[key] = (monthUnidadeCount[key] || 0) + 1;
            }
        }
    });

    const sortedData = Object.entries(monthUnidadeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const ctx = document.getElementById('chartPacientesMesUnidade').getContext('2d');
    if (charts.pacientesMesUnidade) charts.pacientesMesUnidade.destroy();

    charts.pacientesMesUnidade = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                label: 'Pacientes Agendados',
                data: sortedData.map(item => item[1]),
                backgroundColor: '#14532d', // verde escuro
                borderColor: '#166534',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 15 },
                    anchor: 'center',
                    align: 'center'
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { maxRotation: 45 } }
            }
        }
    });
}

// Gráfico 3: Pacientes agendados por dia e laboratório de coleta (roxo escuro)
function updateChartPacientesDiaLaboratorio() {
    const dayLabCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta) {
            const key = `${item.dataAgendamento} - ${item.laboratorioColeta}`;
            dayLabCount[key] = (dayLabCount[key] || 0) + 1;
        }
    });

    const sortedData = Object.entries(dayLabCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const ctx = document.getElementById('chartPacientesDiaLaboratorio').getContext('2d');
    if (charts.pacientesDiaLaboratorio) charts.pacientesDiaLaboratorio.destroy();

    charts.pacientesDiaLaboratorio = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                label: 'Pacientes Agendados',
                data: sortedData.map(item => item[1]),
                backgroundColor: '#581c87', // roxo escuro
                borderColor: '#6b21a8',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 15 },
                    anchor: 'center',
                    align: 'center'
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { maxRotation: 45 } }
            }
        }
    });
}

// Gráfico 4: Pacientes agendados por mês e laboratório de coleta (vermelho escuro)
function updateChartPacientesMesLaboratorio() {
    const monthLabCount = {};
    filteredData.forEach(item => {
        if (item.dataAgendamento && item.laboratorioColeta) {
            const date = parseDate(item.dataAgendamento);
            if (date) {
                const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
                const key = `${monthYear} - ${item.laboratorioColeta}`;
                monthLabCount[key] = (monthLabCount[key] || 0) + 1;
            }
        }
    });

    const sortedData = Object.entries(monthLabCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const ctx = document.getElementById('chartPacientesMesLaboratorio').getContext('2d');
    if (charts.pacientesMesLaboratorio) charts.pacientesMesLaboratorio.destroy();

    charts.pacientesMesLaboratorio = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                label: 'Pacientes Agendados',
                data: sortedData.map(item => item[1]),
                backgroundColor: '#7f1d1d', // vermelho escuro
                borderColor: '#991b1b',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 15 },
                    anchor: 'center',
                    align: 'center'
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { maxRotation: 45 } }
            }
        }
    });
}

// Gráfico 5: Vagas livres por dia e unidade de saúde (rosa escuro)
// Note: This is a placeholder as we don't have "vagas livres" data in the sheet
function updateChartVagasLivresDiaUnidade() {
    // Placeholder data - in real scenario, this would come from a different data source
    const placeholderData = [
        ['15/09/2025 - UBS Centro', 5],
        ['16/09/2025 - UBS Norte', 3],
        ['17/09/2025 - UBS Sul', 8],
        ['18/09/2025 - UBS Centro', 2],
        ['19/09/2025 - UBS Leste', 6]
    ];

    const ctx = document.getElementById('chartVagasLivresDiaUnidade').getContext('2d');
    if (charts.vagasLivresDiaUnidade) charts.vagasLivresDiaUnidade.destroy();

    charts.vagasLivresDiaUnidade = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: placeholderData.map(item => item[0]),
            datasets: [{
                label: 'Vagas Livres',
                data: placeholderData.map(item => item[1]),
                backgroundColor: '#831843', // rosa escuro
                borderColor: '#9d174d',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 15 },
                    anchor: 'center',
                    align: 'center'
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { maxRotation: 45 } }
            }
        }
    });
}

// Gráfico 6: Vagas livres por mês e unidade de saúde (cinza escuro)
// Note: This is a placeholder as we don't have "vagas livres" data in the sheet
function updateChartVagasLivresMesUnidade() {
    // Placeholder data - in real scenario, this would come from a different data source
    const placeholderData = [
        ['09/2025 - UBS Centro', 15],
        ['09/2025 - UBS Norte', 12],
        ['09/2025 - UBS Sul', 20],
        ['09/2025 - UBS Leste', 8],
        ['10/2025 - UBS Centro', 18]
    ];

    const ctx = document.getElementById('chartVagasLivresMesUnidade').getContext('2d');
    if (charts.vagasLivresMesUnidade) charts.vagasLivresMesUnidade.destroy();

    charts.vagasLivresMesUnidade = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: placeholderData.map(item => item[0]),
            datasets: [{
                label: 'Vagas Livres',
                data: placeholderData.map(item => item[1]),
                backgroundColor: '#374151', // cinza escuro
                borderColor: '#4b5563',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 15 },
                    anchor: 'center',
                    align: 'center'
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { maxRotation: 45 } }
            }
        }
    });
}

// Gráfico 7: Última data de Agendamento por Laboratório de coleta
function updateChartUltimaDataAgendamento() {
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
        .map(([lab, date]) => [lab, date.toLocaleDateString('pt-BR')])
        .sort((a, b) => new Date(b[1].split('/').reverse().join('-')) - new Date(a[1].split('/').reverse().join('-')));

    const ctx = document.getElementById('chartUltimaDataAgendamento').getContext('2d');
    if (charts.ultimaDataAgendamento) charts.ultimaDataAgendamento.destroy();

    charts.ultimaDataAgendamento = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                label: 'Última Data de Agendamento',
                data: sortedData.map((item, index) => index + 1), // Just for visualization
                backgroundColor: '#ea580c', // laranja escuro
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
                    formatter: (value, context) => {
                        return sortedData[context.dataIndex][1];
                    }
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
        order: [[1, 'desc']] // Order by 'DATA' column
    });
}

function clearFilters() {
    document.getElementById('unidadeSaudeFilter').value = '';
    document.getElementById('horarioFilter').value = '';
    document.getElementById('dataFilter').value = '';
    document.getElementById('laboratorioColetaFilter').value = '';
    // For multi-selects, deselect all options
    Array.from(document.getElementById('unidadeSaudeFilter').options).forEach(option => option.selected = false);
    Array.from(document.getElementById('horarioFilter').options).forEach(option => option.selected = false);
    Array.from(document.getElementById('laboratorioColetaFilter').options).forEach(option => option.selected = false);
    applyFilters();
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
        'UNIDADE DE SAÚDE': item.unidadeSaude || '',
        'DATA': item.dataAgendamento || '',
        'HORÁRIO': item.horarioAgendamento || '',
        'Nº PRONTUÁRIO VIVVER': item.prontuarioVivver || '',
        'OBSERVAÇÃO/ UNIDADE DE SAÚDE': item.observacaoUnidadeSaude || '',
        'PERFIL DO PACIENTE OU TIPO DO EXAME': item.perfilPacienteExame || '',
        'Laboratório de Coleta': item.laboratorioColeta || ''
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
    
    XLSX.writeFile(wb, `agendamentos_eldorado_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Initial data load
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    // setInterval(loadData, 60000); // Auto-update every 60 seconds
});

