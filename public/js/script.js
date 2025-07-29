// Verifica se Chart.js está carregado
function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (typeof Chart !== 'undefined') {
      resolve();
    } else {
      const script = document.createElement('script');
      script.src = '/libs/chart.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    }
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Carrega Chart.js antes de iniciar a aplicação
    await loadChartJS();
    console.log('Chart.js carregado com sucesso');
    
    // Atualizar ano no footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Variáveis para os gráficos
    let distributionChart = null;
    let growthChart = null;
    
    // Elementos do DOM
    const calculateBtn = document.getElementById('calculate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const generatePdfBtn = document.getElementById('generate-pdf');
    const resultsSection = document.getElementById('resultsSection');
    
    // Event listeners
    calculateBtn.addEventListener('click', calculateProjection);
    resetBtn.addEventListener('click', resetForm);
    generatePdfBtn.addEventListener('click', generatePdf);
    
    // Função principal de cálculo
    function calculateProjection() {
      // Obter valores dos inputs
      const examData = {
        mamografia: getExamData('mamografia'),
        hemodinamica: getExamData('hemodinamica'),
        tomografia: getExamData('tomografia'),
        raiox: getExamData('raiox'),
        ressonancia: getExamData('ressonancia'),
        ultrassom: getExamData('ultrassom')
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
      updateResults(annualGB, customYears);
      
      // Atualizar gráficos
      updateCharts(examResults, annualGB, customYears);
      
      // Mostrar seção de resultados
      resultsSection.style.display = 'block';
      
      // Rolagem suave para os resultados
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Helper para obter dados de cada exame
    function getExamData(examName) {
      return {
        qtd: parseInt(document.getElementById(`${examName}-qtd`).value) || 0,
        size: parseFloat(document.getElementById(`${examName}-size`).value) || 0
      };
    }
    
    // Atualiza os resultados na tela
    function updateResults(annualGB, customYears) {
      document.getElementById('annual-result').textContent = formatStorage(annualGB);
      document.getElementById('1year-result').textContent = formatStorage(annualGB * 1);
      document.getElementById('5years-result').textContent = formatStorage(annualGB * 5);
      document.getElementById('10years-result').textContent = formatStorage(annualGB * 10);
      document.getElementById('20years-result').textContent = formatStorage(annualGB * 20);
      
      if (customYears > 0) {
        document.getElementById('custom-result-title').textContent = `${customYears} Anos`;
        document.getElementById('custom-result').textContent = formatStorage(annualGB * customYears);
        document.getElementById('custom-result-container').style.display = 'block';
      } else {
        document.getElementById('custom-result-container').style.display = 'none';
      }
    }
    
    // Formata valores de armazenamento
    function formatStorage(gb) {
      if (gb >= 1024) {
        const tb = gb / 1024;
        return tb >= 100 ? `${tb.toFixed(0)} TB` : `${tb.toFixed(2)} TB`;
      }
      return gb >= 100 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(2)} GB`;
    }
    
    // Atualiza os gráficos
    function updateCharts(examResults, annualGB, customYears) {
      updateDistributionChart(examResults);
      updateGrowthChart(annualGB, customYears);
    }
    
    // Gráfico de distribuição
    function updateDistributionChart(examResults) {
      const ctx = document.getElementById('distributionChart').getContext('2d');
      const labels = [];
      const data = [];
      const backgroundColors = [
        '#055a71', '#24cec5', '#178f96', '#1da0a5', '#23adac', '#2c3e50'
      ];
      
      for (const [exam, info] of Object.entries(examResults)) {
        if (info.monthlyMB > 0) {
          labels.push(exam.charAt(0).toUpperCase() + exam.slice(1));
          data.push(info.monthlyMB);
        }
      }
      
      if (distributionChart) distributionChart.destroy();
      
      distributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                padding: 20,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${formatStorage(value / 1024)} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
    
    // Gráfico de crescimento
    function updateGrowthChart(annualGB, customYears) {
      const ctx = document.getElementById('growthChart').getContext('2d');
      const years = [1, 5, 10, 20];
      
      if (customYears > 0 && !years.includes(customYears)) {
        years.push(customYears);
        years.sort((a, b) => a - b);
      }
      
      if (growthChart) growthChart.destroy();
      
      growthChart = new Chart(ctx, {
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
          maintainAspectRatio: false,
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
      alert('Relatório PDF será gerado aqui!');
      // Implementação real deve ser feita no servidor
    }
    
    console.log('Aplicação inicializada com sucesso');
    
  } catch (error) {
    console.error('Erro ao carregar a aplicação:', error);
    alert('Erro ao carregar os recursos necessários. Por favor, recarregue a página.');
  }
});