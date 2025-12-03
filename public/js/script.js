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

function adjustChartsForMobile() {
  if (window.innerWidth <= 768) {
    if (distributionChart) {
      distributionChart.options.plugins.legend.position = 'bottom';
      distributionChart.options.plugins.legend.labels.font.size = 10;
      distributionChart.update();
    }

    if (growthChart) {
      growthChart.options.scales.x.title.font.size = 10;
      growthChart.options.scales.y.title.font.size = 10;
      growthChart.update();
    }
  }
}

let distributionChart = null;
let growthChart = null;
let scrolling = false;
let currentCalculations = {}; // Para armazenar cálculos atuais

// Função para encontrar o container rolável mais próximo
function findScrollableParent(element) {
  let parent = element.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement; // Retorna o elemento raiz se nenhum container for encontrado
}

// Função aprimorada para rolagem suave
function smoothScrollToElement(element) {
  if (!element) return;

  const isMobile = window.innerWidth <= 768;
  const headerOffset = 80; // Ajuste conforme a altura do seu cabeçalho
  const scrollableParent = findScrollableParent(element);
  const isBodyScroll = scrollableParent === document.documentElement;
  
  // Calcula a posição considerando o container pai
  const elementRect = element.getBoundingClientRect();
  const parentRect = scrollableParent.getBoundingClientRect();
  const scrollPosition = isBodyScroll 
    ? window.pageYOffset + elementRect.top - headerOffset
    : scrollableParent.scrollTop + elementRect.top - parentRect.top - headerOffset;

  // Configuração do scroll
  const scrollOptions = {
    top: scrollPosition,
    behavior: isMobile ? 'auto' : 'smooth'
  };

  // Executa o scroll no elemento apropriado
  try {
    if (isBodyScroll) {
      window.scrollTo(scrollOptions);
    } else {
      scrollableParent.scrollTo(scrollOptions);
    }
  } catch (e) {
    // Fallback para navegadores mais antigos
    if (isBodyScroll) {
      window.scrollTo(0, scrollPosition);
    } else {
      scrollableParent.scrollTop = scrollPosition;
    }
  }
}

function getExamValue(examName, field) {
  const el = document.getElementById(`${examName}-${field}`);
  if (!el) return 0;
  const value = el.value.trim().replace(',', '.');
  if (value === '') return 0;
  const num = parseFloat(value);
  return isNaN(num) || num < 0 ? 0 : num;
}

function validateExamData(examData) {
  let algumPreenchido = false;
  let algumComTamanhoSemQtd = false;
  let algumComQtdSemTamanho = false;
  let examesInvalidos = [];

  for (const [exam, data] of Object.entries(examData)) {
    if (data.size > 0 || data.quantity > 0) {
      algumPreenchido = true;
      
      if (data.size > 0 && data.quantity === 0) {
        algumComTamanhoSemQtd = true;
        examesInvalidos.push(`${exam} (tem tamanho mas não tem quantidade)`);
      }
      
      if (data.quantity > 0 && data.size === 0) {
        algumComQtdSemTamanho = true;
        examesInvalidos.push(`${exam} (tem quantidade mas não tem tamanho)`);
      }
    }
  }

  return { 
    algumPreenchido, 
    algumComTamanhoSemQtd, 
    algumComQtdSemTamanho, 
    examesInvalidos 
  };
}

function calculateProjections(baseAnnualGB, years, marginConfig) {
  const projections = {};
  
  years.forEach(year => {
    let baseValue = baseAnnualGB * year;
    let marginApplied = 0;
    let finalValue = baseValue;
    
    if (marginConfig.apply) {
      if (marginConfig.type === 'fixed') {
        // Margem fixa: aplica mesma porcentagem para todos os anos
        marginApplied = baseValue * (marginConfig.percentage / 100);
      } else if (marginConfig.type === 'progressive') {
        // Margem progressiva: aumenta com os anos
        // Ex: ano 1 = 20%, ano 2 = 40%, ano 5 = 100% da margem
        const progressivePercentage = marginConfig.percentage * year;
        marginApplied = baseValue * (progressivePercentage / 100);
      }
      finalValue = baseValue + marginApplied;
    }
    
    projections[year] = {
      base: baseValue,
      margin: marginApplied,
      final: finalValue,
      marginPercentage: marginConfig.apply ? marginConfig.percentage : 0,
      marginType: marginConfig.type
    };
  });
  
  return projections;
}

function getMarginConfig() {
  const applyMargin = document.getElementById('apply-margin').checked;
  if (!applyMargin) {
    return { apply: false, percentage: 0, type: 'fixed' };
  }
  
  const percentage = parseFloat(document.getElementById('margin-percentage').value) || 0;
  const type = document.getElementById('margin-type').value;
  
  return { 
    apply: true, 
    percentage: Math.min(100, Math.max(0, percentage)),
    type: type
  };
}

function formatStorage(gb) {
  if (gb >= 1024) {
    const tb = gb / 1024;
    return tb >= 100 ? `${tb.toFixed(0)} TB` : `${tb.toFixed(2)} TB`;
  }
  return gb >= 100 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(2)} GB`;
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    await loadChartJS();
    console.log('Chart.js carregado com sucesso');

    document.getElementById('current-year').textContent = new Date().getFullYear();

    const calculateBtn = document.getElementById('calculate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const generatePdfBtn = document.getElementById('generate-pdf');
    const resultsSection = document.getElementById('resultsSection');
    const applyMarginCheckbox = document.getElementById('apply-margin');

    // Configurar eventos
    calculateBtn.addEventListener('click', calculateProjection);
    resetBtn.addEventListener('click', resetForm);
    generatePdfBtn.addEventListener('click', handlePdfGeneration);
    window.addEventListener('resize', adjustChartsForMobile);
    
    // Controle da exibição da margem
    applyMarginCheckbox.addEventListener('change', function() {
      const marginFields = document.getElementById('marginFields');
      if (this.checked) {
        marginFields.classList.add('active');
      } else {
        marginFields.classList.remove('active');
      }
    });

    function calculateProjection() {
      if (scrolling) return;
      scrolling = true;

      try {
        document.activeElement.blur();

        const unitName = document.getElementById('unit-name').value.trim();
        if (!unitName) {
          alert('Por favor, informe o nome da unidade');
          scrolling = false;
          return;
        }

        // Coletar dados dos exames
        const examData = {
          ressonancia: {
            size: getExamValue('ressonancia', 'size'),
            quantity: getExamValue('ressonancia', 'qtd')
          },
          tomografia: {
            size: getExamValue('tomografia', 'size'),
            quantity: getExamValue('tomografia', 'qtd')
          },
          raiox: {
            size: getExamValue('raiox', 'size'),
            quantity: getExamValue('raiox', 'qtd')
          },
          ultrassom: {
            size: getExamValue('ultrassom', 'size'),
            quantity: getExamValue('ultrassom', 'qtd')
          },
          densitometria: {
            size: getExamValue('densitometria', 'size'),
            quantity: getExamValue('densitometria', 'qtd')
          },
          hemodinamica: {
            size: getExamValue('hemodinamica', 'size'),
            quantity: getExamValue('hemodinamica', 'qtd')
          },
          mamografia: {
            size: getExamValue('mamografia', 'size'),
            quantity: getExamValue('mamografia', 'qtd')
          }
        };

        // Validar dados
        const validation = validateExamData(examData);
        
        if (!validation.algumPreenchido) {
          alert('Por favor, preencha pelo menos um tipo de exame.');
          scrolling = false;
          return;
        }
        
        if (validation.algumComTamanhoSemQtd || validation.algumComQtdSemTamanho) {
          const errorMsg = `Dados incompletos:\n${validation.examesInvalidos.join('\n')}\n\nPor favor, preencha ambos os campos (tamanho e quantidade) para cada exame.`;
          alert(errorMsg);
          scrolling = false;
          return;
        }

        // Obter configuração de margem
        const marginConfig = getMarginConfig();

        // Obter anos personalizados
        const customYearsValue = document.getElementById('custom-years').value.trim();
        let customYears = 0;
        if (customYearsValue !== '') {
          customYears = parseInt(customYearsValue);
          if (isNaN(customYears) || customYears < 1 || customYears > 50) {
            alert('Por favor, insira um número de anos entre 1 e 50');
            scrolling = false;
            return;
          }
        }

        // Calcular armazenamento
        let totalMonthlyMB = 0;
        const examResults = {};

        for (const [exam, data] of Object.entries(examData)) {
          if (data.size > 0 && data.quantity > 0) {
            const dailyMB = data.size * data.quantity;
            const monthlyMB = dailyMB * 30;
            const annualGB = (dailyMB * 365) / 1024;

            examResults[exam] = {
              size: data.size,
              quantity: data.quantity,
              dailyMB: dailyMB,
              monthlyMB: monthlyMB,
              annualGB: annualGB,
              monthlyGB: monthlyMB / 1024
            };

            totalMonthlyMB += monthlyMB;
          }
        }

        const annualGB = (totalMonthlyMB * 12) / 1024;
        
        // Definir períodos para cálculo
        const years = [1, 5, 10, 20];
        if (customYears > 0 && !years.includes(customYears)) {
          years.push(customYears);
          years.sort((a, b) => a - b);
        }
        
        // Calcular projeções com margem
        const projections = calculateProjections(annualGB, years, marginConfig);
        
        // Armazenar cálculos atuais para uso posterior
        currentCalculations = {
          unitName: unitName,
          examResults: examResults,
          totalAnnualGB: annualGB,
          totalMonthlyGB: totalMonthlyMB / 1024,
          marginConfig: marginConfig,
          projections: projections,
          customYears: customYears
        };

        // Atualizar interface
        updateResults(projections, customYears);
        updateCharts(examResults, projections, marginConfig);
        adjustChartsForMobile();

        resultsSection.style.display = 'block';
        
        // Aguarda a renderização dos gráficos antes de rolar
        setTimeout(() => {
          smoothScrollToElement(resultsSection);
          scrolling = false;
        }, 300);

      } catch (error) {
        console.error('Erro no cálculo:', error);
        alert(error.message || 'Ocorreu um erro ao calcular. Verifique os dados inseridos.');
        scrolling = false;
      }
    }

    function updateResults(projections, customYears) {
      // Atualizar todos os cards
      const periods = [
        { id: 'annual', year: 1, element: 'annual-result', marginElement: 'annual-margin-info' },
        { id: '1year', year: 1, element: '1year-result', marginElement: '1year-margin-info' },
        { id: '5years', year: 5, element: '5years-result', marginElement: '5years-margin-info' },
        { id: '10years', year: 10, element: '10years-result', marginElement: '10years-margin-info' },
        { id: '20years', year: 20, element: '20years-result', marginElement: '20years-margin-info' }
      ];
      
      periods.forEach(period => {
        const projection = projections[period.year];
        if (projection) {
          const element = document.getElementById(period.element);
          const marginElement = document.getElementById(period.marginElement);
          
          if (element) {
            element.textContent = formatStorage(projection.final);
          }
          
          if (marginElement) {
            if (currentCalculations.marginConfig.apply && projection.margin > 0) {
              marginElement.textContent = `(+${formatStorage(projection.margin)})`;
              marginElement.style.display = 'block';
              
              // Adicionar tooltip com detalhes da margem
              marginElement.title = `Margem aplicada: ${projection.marginPercentage}%`;
              
              // Estilizar baseado no tipo de margem
              if (currentCalculations.marginConfig.type === 'progressive') {
                marginElement.style.color = '#e74c3c';
                marginElement.title += ' (progressiva)';
              } else {
                marginElement.style.color = '#27ae60';
                marginElement.title += ' (fixa)';
              }
            } else {
              marginElement.style.display = 'none';
            }
          }
        }
      });

      // Atualizar período customizado
      const customContainer = document.getElementById('custom-result-container');
      if (customYears > 0) {
        const projection = projections[customYears];
        if (projection) {
          document.getElementById('custom-result-title').textContent = `${customYears} Anos`;
          document.getElementById('custom-result').textContent = formatStorage(projection.final);
          
          const customMarginElement = document.getElementById('custom-margin-info');
          if (currentCalculations.marginConfig.apply && projection.margin > 0) {
            customMarginElement.textContent = `(+${formatStorage(projection.margin)})`;
            customMarginElement.style.display = 'block';
            customMarginElement.title = `Margem aplicada: ${projection.marginPercentage}%`;
            
            if (currentCalculations.marginConfig.type === 'progressive') {
              customMarginElement.style.color = '#e74c3c';
              customMarginElement.title += ' (progressiva)';
            } else {
              customMarginElement.style.color = '#27ae60';
              customMarginElement.title += ' (fixa)';
            }
          } else {
            customMarginElement.style.display = 'none';
          }
          
          customContainer.style.display = 'block';
        }
      } else {
        customContainer.style.display = 'none';
      }
    }

    function updateCharts(examResults, projections, marginConfig) {
      updateDistributionChart(examResults);
      updateGrowthChart(projections, marginConfig);
    }

    function updateDistributionChart(examResults) {
      const ctx = document.getElementById('distributionChart').getContext('2d');
      const labels = [];
      const data = [];
      const backgroundColors = ['#055a71', '#24cec5', '#178f96', '#1da0a5', '#23adac', '#2c3e50', '#8e44ad'];

      for (const [exam, info] of Object.entries(examResults)) {
        if (info.monthlyMB > 0) {
          labels.push(exam.charAt(0).toUpperCase() + exam.slice(1));
          data.push(info.monthlyGB); // Usar GB para melhor legibilidade
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
                label: function (context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${formatStorage(value)} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    function updateGrowthChart(projections, marginConfig) {
      const ctx = document.getElementById('growthChart').getContext('2d');
      
      // Preparar dados para o gráfico
      const years = Object.keys(projections).map(Number).sort((a, b) => a - b);
      const labels = years.map(year => `${year} ${year === 1 ? 'Ano' : 'Anos'}`);
      
      // Dados base (sem margem)
      const baseData = years.map(year => projections[year].base);
      
      // Dados finais (com margem)
      const finalData = years.map(year => projections[year].final);
      
      if (growthChart) growthChart.destroy();

      growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Armazenamento Base',
              data: baseData,
              backgroundColor: 'rgba(5, 90, 113, 0.7)',
              borderWidth: 1,
              borderColor: '#055a71'
            }
          ]
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
                label: function (context) {
                  const year = years[context.dataIndex];
                  const projection = projections[year];
                  let tooltip = `Base: ${formatStorage(projection.base)}`;
                  
                  if (marginConfig.apply && projection.margin > 0) {
                    tooltip += `\nMargem: +${formatStorage(projection.margin)}`;
                    tooltip += `\nTotal: ${formatStorage(projection.final)}`;
                  }
                  
                  return tooltip;
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
      
      // Se houver margem, adicionar dataset sobreposto
      if (marginConfig.apply) {
        growthChart.data.datasets.push({
          label: 'Margem de Segurança',
          data: years.map(year => projections[year].margin),
          backgroundColor: marginConfig.type === 'progressive' 
            ? 'rgba(231, 76, 60, 0.7)' 
            : 'rgba(39, 174, 96, 0.7)',
          borderWidth: 1,
          borderColor: marginConfig.type === 'progressive' ? '#e74c3c' : '#27ae60'
        });
        
        growthChart.update();
      }
    }

    function resetForm() {
      resultsSection.style.display = 'none';
      
      // Resetar campos de margem
      document.getElementById('apply-margin').checked = false;
      document.getElementById('marginFields').classList.remove('active');
      document.getElementById('margin-percentage').value = '20';
      
      // Esconder informações de margem
      const marginInfoElements = document.querySelectorAll('[id$="-margin-info"]');
      marginInfoElements.forEach(el => {
        el.style.display = 'none';
      });

      if (distributionChart) {
        distributionChart.destroy();
        distributionChart = null;
      }

      if (growthChart) {
        growthChart.destroy();
        growthChart = null;
      }
      
      // Limpar cálculos atuais
      currentCalculations = {};
    }

    async function handlePdfGeneration() {
      const pdfBtn = document.getElementById('generate-pdf');
      if (!pdfBtn) return;

      const originalText = pdfBtn.innerHTML;
      pdfBtn.innerHTML = '<span class="loading">Gerando PDF...</span>';
      pdfBtn.disabled = true;

      try {
        await generatePdf();
      } catch (error) {
        console.error('Erro na geração do PDF:', error);
        alert('Erro ao gerar PDF: ' + error.message);
      } finally {
        pdfBtn.innerHTML = originalText;
        pdfBtn.disabled = false;
      }
    }

    async function generatePdf() {
      if (!currentCalculations.unitName || !currentCalculations.examResults) {
        throw new Error('Calcule a projeção antes de gerar o PDF');
      }

      if (!distributionChart || !growthChart) {
        throw new Error('Gráficos não encontrados. Calcule a projeção primeiro.');
      }

      // Coletar dados dos inputs para o PDF
      const examData = {};
      const examTypes = ['ressonancia', 'tomografia', 'raiox', 'ultrassom', 'densitometria', 'hemodinamica', 'mamografia'];

      examTypes.forEach(exam => {
        examData[exam] = {
          size: getExamValue(exam, 'size'),
          quantity: getExamValue(exam, 'qtd')
        };
      });

      // Preparar resultados para o PDF
      const results = {
        annual: document.getElementById('annual-result').textContent,
        year1: document.getElementById('1year-result').textContent,
        year5: document.getElementById('5years-result').textContent,
        year10: document.getElementById('10years-result').textContent,
        year20: document.getElementById('20years-result').textContent,
        custom: {
          years: document.getElementById('custom-years').value,
          value: document.getElementById('custom-result').textContent
        },
        marginApplied: currentCalculations.marginConfig.apply,
        marginPercentage: currentCalculations.marginConfig.percentage,
        marginType: currentCalculations.marginConfig.type
      };

      const chartImages = await captureCharts();

      const response = await fetch('/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitName: currentCalculations.unitName,
          examData: examData,
          results: results,
          calculations: currentCalculations,
          chartImages: chartImages,
          date: new Date().toLocaleDateString('pt-BR')
        })
      });

      if (!response.ok) {
        throw new Error(`Erro no servidor: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_pacs_${currentCalculations.unitName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    async function captureCharts() {
      const charts = {
        distribution: document.getElementById('distributionChart'),
        growth: document.getElementById('growthChart')
      };

      const images = {};

      for (const [name, chart] of Object.entries(charts)) {
        if (chart) {
          try {
            const canvas = await html2canvas(chart, {
              scale: 2,
              logging: false,
              useCORS: true,
              allowTaint: true
            });
            images[name] = canvas.toDataURL('image/png');
          } catch (error) {
            console.error(`Erro ao capturar gráfico ${name}:`, error);
            images[name] = '';
          }
        }
      }

      return images;
    }

    console.log('Aplicação inicializada com sucesso');

  } catch (error) {
    console.error('Erro ao carregar a aplicação:', error);
    alert('Erro ao carregar os recursos necessários. Por favor, recarregue a página.');
  }
});