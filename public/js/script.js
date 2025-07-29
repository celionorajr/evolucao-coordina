document.addEventListener('DOMContentLoaded', function() {
    // Atualizar ano no footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Variáveis para os gráficos
    let distributionChart = null;
    let growthChart = null;
    
    // Elementos do formulário
    const calculateBtn = document.getElementById('calculate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const generatePdfBtn = document.getElementById('generate-pdf');
    const resultsSection = document.getElementById('resultsSection');
    
    // Event listeners
    calculateBtn.addEventListener('click', calculateProjection);
    resetBtn.addEventListener('click', resetForm);
    generatePdfBtn.addEventListener('click', generatePdf);
    
    // Calcular projeção
    function calculateProjection() {
        // Obter valores dos inputs
        const examData = {
            mamografia: {
                qtd: parseInt(document.getElementById('mamografia-qtd').value) || 0,
                size: parseFloat(document.getElementById('mamografia-size').value) || 0
            },
            hemodinamica: {
                qtd: parseInt(document.getElementById('hemodinamica-qtd').value) || 0,
                size: parseFloat(document.getElementById('hemodinamica-size').value) || 0
            },
            tomografia: {
                qtd: parseInt(document.getElementById('tomografia-qtd').value) || 0,
                size: parseFloat(document.getElementById('tomografia-size').value) || 0
            },
            raiox: {
                qtd: parseInt(document.getElementById('raiox-qtd').value) || 0,
                size: parseFloat(document.getElementById('raiox-size').value) || 0
            },
            ressonancia: {
                qtd: parseInt(document.getElementById('ressonancia-qtd').value) || 0,
                size: parseFloat(document.getElementById('ressonancia-size').value) || 0
            },
            ultrassom: {
                qtd: parseInt(document.getElementById('ultrassom-qtd').value) || 0,
                size: parseFloat(document.getElementById('ultrassom-size').value) || 0
            }
        };
        
        const customYears = parseInt(document.getElementById('custom-years').value) || 0;
        
        // Calcular totais
        let totalMonthlyMB = 0;
        const examResults = {};
        
        for (const [exam, data] of Object.entries(examData)) {
            const monthlyMB = data.qtd * data.size;
            examResults[exam] = {
                monthlyMB: monthlyMB,
                annualGB: (monthlyMB * 12) / 1024
            };
            totalMonthlyMB += monthlyMB;
        }
        
        const annualGB = (totalMonthlyMB * 12) / 1024;
        
        // Atualizar resultados
        document.getElementById('annual-result').textContent = formatStorage(annualGB);
        document.getElementById('1year-result').textContent = formatStorage(annualGB * 1);
        document.getElementById('5years-result').textContent = formatStorage(annualGB * 5);
        document.getElementById('10years-result').textContent = formatStorage(annualGB * 10);
        document.getElementById('20years-result').textContent = formatStorage(annualGB * 20);
        
        // Mostrar resultado personalizado se fornecido
        if (customYears > 0) {
            document.getElementById('custom-result-title').textContent = `${customYears} Anos`;
            document.getElementById('custom-result').textContent = formatStorage(annualGB * customYears);
            document.getElementById('custom-result-container').style.display = 'block';
        } else {
            document.getElementById('custom-result-container').style.display = 'none';
        }
        
        // Atualizar gráficos
        updateCharts(examResults, annualGB);
        
        // Mostrar seção de resultados
        resultsSection.style.display = 'block';
    }
    
    // Formatador de armazenamento
    function formatStorage(gb) {
        if (gb >= 1024) {
            return `${(gb / 1024).toFixed(2)} TB`;
        }
        return `${gb.toFixed(2)} GB`;
    }
    
    // Atualizar gráficos
    function updateCharts(examResults, annualGB) {
        // Dados para o gráfico de distribuição
        const distributionLabels = [];
        const distributionData = [];
        const backgroundColors = [
            '#055a71', '#24cec5', '#178f96', '#1da0a5', '#23adac', '#2c3e50'
        ];
        
        for (const [exam, data] of Object.entries(examResults)) {
            if (data.monthlyMB > 0) {
                distributionLabels.push(exam.charAt(0).toUpperCase() + exam.slice(1));
                distributionData.push(data.monthlyMB);
            }
        }
        
        // Gráfico de distribuição
        const distributionCtx = document.getElementById('distributionChart').getContext('2d');
        
        if (distributionChart) {
            distributionChart.destroy();
        }
        
        distributionChart = new Chart(distributionCtx, {
            type: 'pie',
            data: {
                labels: distributionLabels,
                datasets: [{
                    data: distributionData,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value.toFixed(2)} MB (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        // Gráfico de crescimento
        const growthCtx = document.getElementById('growthChart').getContext('2d');
        
        if (growthChart) {
            growthChart.destroy();
        }
        
        const years = [1, 5, 10, 20];
        const customYears = parseInt(document.getElementById('custom-years').value) || 0;
        
        if (customYears > 0 && !years.includes(customYears)) {
            years.push(customYears);
            years.sort((a, b) => a - b);
        }
        
        growthChart = new Chart(growthCtx, {
            type: 'bar',
            data: {
                labels: years.map(year => `${year} ${year === 1 ? 'Ano' : 'Anos'}`),
                datasets: [{
                    label: 'Armazenamento',
                    data: years.map(year => annualGB * year),
                    backgroundColor: '#055a71',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Armazenamento (GB)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatStorage(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Resetar formulário
    function resetForm() {
        resultsSection.style.display = 'none';
        
        if (distributionChart) {
            distributionChart.destroy();
            distributionChart = null;
        }
        
        if (growthChart) {
            growthChart.destroy();
            growthChart = null;
        }
    }
    
    // Gerar PDF
    function generatePdf() {
        // Enviar requisição para o servidor gerar o PDF
        fetch('/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                examData: getExamData(),
                results: getResultsData(),
                date: new Date().toLocaleDateString('pt-BR')
            })
        })
        .then(response => response.blob())
        .then(blob => {
            // Criar link para download do PDF
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_pacs_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar o PDF. Por favor, tente novamente.');
        });
    }
    
    // Obter dados dos exames para o PDF
    function getExamData() {
        const exams = ['mamografia', 'hemodinamica', 'tomografia', 'raiox', 'ressonancia', 'ultrassom'];
        const examData = {};
        
        exams.forEach(exam => {
            examData[exam] = {
                qtd: parseInt(document.getElementById(`${exam}-qtd`).value) || 0,
                size: parseFloat(document.getElementById(`${exam}-size`).value) || 0
            };
        });
        
        return examData;
    }
    
    // Obter dados dos resultados para o PDF
    function getResultsData() {
        return {
            annual: document.getElementById('annual-result').textContent,
            year1: document.getElementById('1year-result').textContent,
            year5: document.getElementById('5years-result').textContent,
            year10: document.getElementById('10years-result').textContent,
            year20: document.getElementById('20years-result').textContent,
            custom: {
                years: document.getElementById('custom-years').value,
                value: document.getElementById('custom-result').textContent
            }
        };
    }
});