// Verifica se Chart.js está carregado
function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (typeof Chart !== 'undefined') {
      resolve();
    } else {
      const script = document.createElement('script');
      script.src = '/libs/chart.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar Chart.js'));
      document.head.appendChild(script);
    }
  });
}

// Função para validar números positivos
function validatePositiveNumber(value, fieldName) {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  if (num < 0) {
    alert(`Por favor, insira um valor positivo para ${fieldName}`);
    throw new Error(`Valor negativo não permitido em ${fieldName}`);
  }
  return num;
}

// Função para ajustar gráficos em telas pequenas
function adjustChartsForMobile() {
  if (window.innerWidth <= 768) {
    // Ajuste para o gráfico de pizza
    if (distributionChart) {
      distributionChart.options.plugins.legend.position = 'bottom';
      distributionChart.options.plugins.legend.labels.font.size = 10;
      distributionChart.update();
    }
    
    // Ajuste para o gráfico de barras
    if (growthChart) {
      growthChart.options.scales.x.title.font.size = 10;
      growthChart.options.scales.y.title.font.size = 10;
      growthChart.update();
    }
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Carrega Chart.js antes de iniciar a aplicação
    await loadChartJS();
    console.log('Chart.js carregado com sucesso');
    
    // Atualizar ano no footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Médias diárias fixas
    const dailyAverages = {
        ressonancia: 10,
        tomografia: 65,
        raiox: 60,
        ultrassom: 50,
        densitometria: 10,
        hemodinamica: 10
    };
    
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
    window.addEventListener('resize', adjustChartsForMobile);
    
    // Função principal de cálculo
    function calculateProjection() {
      try {
        const unitName = document.getElementById('unit-name').value;
        if (!unitName) {
          alert('Por favor, informe o nome da unidade');
          return;
        }
        
        // Obter valores dos inputs
        const examData = {
          ressonancia: getExamData('ressonancia'),
          tomografia: getExamData('tomografia'),
          raiox: getExamData('raiox'),
          ultrassom: getExamData('ultrassom'),
          densitometria: getExamData('densitometria'),
          hemodinamica: getExamData('hemodinamica')
        };
        
        const customYears = parseInt(document.getElementById('custom-years').value) || 0;
        if (customYears < 0) {
          alert('Por favor, insira um número de anos positivo');
          return;
        }
        
        // Calcular totais
        let totalMonthlyMB = 0;
        const examResults = {};
        
        for (const [exam, data] of Object.entries(examData)) {
          const dailyMB = data.size * dailyAverages[exam];
          const monthlyMB = dailyMB * 30;
          
          examResults[exam] = {
            size: data.size,
            dailyAvg: dailyAverages[exam],
            dailyMB: dailyMB,
            monthlyMB: monthlyMB,
            annualGB: (dailyMB * 365) / 1024
          };
          
          totalMonthlyMB += monthlyMB;
        }
        
        if (totalMonthlyMB === 0) {
          alert('Por favor, insira dados para pelo menos um tipo de exame');
          return;
        }
        
        const annualGB = (totalMonthlyMB * 12) / 1024;
        
        // Atualizar resultados
        updateResults(annualGB, customYears);
        
        // Atualizar gráficos
        updateCharts(examResults, annualGB, customYears);
        
        // Ajustar para mobile se necessário
        adjustChartsForMobile();
        
        // Mostrar seção de resultados
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
      } catch (error) {
        console.error('Erro no cálculo:', error);
        alert('Ocorreu um erro ao calcular. Verifique os dados inseridos.');
      }
    }
    
    // Helper para obter dados de cada exame
    function getExamData(examName) {
      const size = validatePositiveNumber(
        document.getElementById(`${examName}-size`).value,
        `tamanho de ${examName}`
      );
      
      return { size };
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
              position: window.innerWidth <= 768 ? 'bottom' : 'right',
              labels: {
                padding: 20,
                font: {
                  size: window.innerWidth <= 768 ? 10 : 12
                },
                boxWidth: 12
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
                text: 'Armazenamento (GB)',
                font: {
                  size: window.innerWidth <= 768 ? 10 : 12
                }
              }
            },
            x: {
              title: {
                display: true,
                text: 'Período',
                font: {
                  size: window.innerWidth <= 768 ? 10 : 12
                }
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
            },
            legend: {
              labels: {
                font: {
                  size: window.innerWidth <= 768 ? 10 : 12
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
    async function generatePdf() {
      try {
        const unitName = document.getElementById('unit-name').value;
        if (!unitName) {
          alert('Por favor, informe o nome da unidade');
          return;
        }
        
        if (!distributionChart || !growthChart) {
          alert('Por favor, calcule a projeção antes de gerar o PDF');
          return;
        }

        // Mostrar loading
        const pdfBtn = document.getElementById('generate-pdf');
        const originalText = pdfBtn.innerHTML;
        pdfBtn.innerHTML = '<span class="loading">Gerando PDF...</span>';
        pdfBtn.disabled = true;

        // Capturar dados necessários
        const examData = {};
        const examTypes = ['ressonancia', 'tomografia', 'raiox', 'ultrassom', 'densitometria', 'hemodinamica'];
        
        examTypes.forEach(exam => {
          examData[exam] = {
            size: parseFloat(document.getElementById(`${exam}-size`).value) || 0
          };
        });

        const results = {
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

        // Capturar gráficos como imagens
        const chartImages = await captureCharts();

        // Enviar dados para o servidor gerar o PDF
        const response = await fetch('/generate-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            unitName,
            examData,
            results,
            chartImages,
            date: new Date().toLocaleDateString('pt-BR')
          })
        });

        if (!response.ok) {
          throw new Error(`Erro no servidor: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Criar link para download
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_pacs_${unitName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar o PDF: ' + error.message);
      } finally {
        // Restaurar botão
        const pdfBtn = document.getElementById('generate-pdf');
        if (pdfBtn) {
          pdfBtn.innerHTML = originalText;
          pdfBtn.disabled = false;
        }
      }
    }

    // Função para capturar gráficos como imagens
    async function captureCharts() {
      try {
        const charts = {
          distribution: document.getElementById('distributionChart'),
          growth: document.getElementById('growthChart')
        };

        const images = {};

        for (const [name, chart] of Object.entries(charts)) {
          if (chart) {
            const canvas = await html2canvas(chart, {
              scale: 2,
              logging: false,
              useCORS: true
            });
            images[name] = canvas.toDataURL('image/png');
          }
        }

        return images;
      } catch (error) {
        console.error('Erro ao capturar gráficos:', error);
        throw new Error('Falha ao capturar gráficos para o PDF');
      }
    }
    
    console.log('Aplicação inicializada com sucesso');
    
  } catch (error) {
    console.error('Erro ao carregar a aplicação:', error);
    alert('Erro ao carregar os recursos necessários. Por favor, recarregue a página.');
  }
});