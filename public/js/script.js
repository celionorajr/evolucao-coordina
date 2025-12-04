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
let currentCalculations = {};

// Tabela de tamanhos médios por tipo de exame
const examSizeDefaults = {
  ressonancia: 600,
  tomografia: 400,
  raiox: 40,
  ultrassom: 10,
  densitometria: 10,
  hemodinamica: 1000,
  mamografia: 200,
  ecocardio: 50,
  endoscopia: 80,
  colonoscopia: 120,
  broncoscopia: 100,
  custom: 100
};

// Tabela de nomes amigáveis
const examFriendlyNames = {
  ressonancia: 'Ressonância Magnética',
  tomografia: 'Tomografia Computadorizada',
  raiox: 'Raio-X Digital',
  ultrassom: 'Ultrassom',
  densitometria: 'Densitometria Óssea',
  hemodinamica: 'Hemodinâmica',
  mamografia: 'Mamografia Digital',
  ecocardio: 'Ecocardiograma',
  endoscopia: 'Endoscopia',
  colonoscopia: 'Colonoscopia',
  broncoscopia: 'Broncoscopia',
  custom: 'Exame Personalizado'
};

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
  return document.documentElement;
}

// Função aprimorada para rolagem suave
function smoothScrollToElement(element) {
  if (!element) return;

  const isMobile = window.innerWidth <= 768;
  const headerOffset = 80;
  const scrollableParent = findScrollableParent(element);
  const isBodyScroll = scrollableParent === document.documentElement;
  
  const elementRect = element.getBoundingClientRect();
  const parentRect = scrollableParent.getBoundingClientRect();
  const scrollPosition = isBodyScroll 
    ? window.pageYOffset + elementRect.top - headerOffset
    : scrollableParent.scrollTop + elementRect.top - parentRect.top - headerOffset;

  const scrollOptions = {
    top: scrollPosition,
    behavior: isMobile ? 'auto' : 'smooth'
  };

  try {
    if (isBodyScroll) {
      window.scrollTo(scrollOptions);
    } else {
      scrollableParent.scrollTo(scrollOptions);
    }
  } catch (e) {
    if (isBodyScroll) {
      window.scrollTo(0, scrollPosition);
    } else {
      scrollableParent.scrollTop = scrollPosition;
    }
  }
}

// Função para atualizar o tamanho do exame baseado no tipo selecionado
function updateExamSizeFromType(selectElement) {
  const row = selectElement.closest('tr');
  const sizeInput = row.querySelector('.exam-size');
  const examType = selectElement.value;
  const defaultSize = examSizeDefaults[examType] || 100;
  
  // Se for um exame personalizado, pedir nome
  if (examType === 'custom') {
    const nameInput = row.querySelector('.custom-exam-name');
    if (nameInput) {
      nameInput.style.display = 'block';
      nameInput.placeholder = 'Nome do exame personalizado';
    }
  } else {
    const nameInput = row.querySelector('.custom-exam-name');
    if (nameInput) {
      nameInput.style.display = 'none';
    }
  }
  
  // Atualizar valor apenas se o usuário não tiver modificado manualmente
  if (!sizeInput.hasAttribute('data-user-modified')) {
    sizeInput.value = defaultSize;
  }
}

// Função para sincronizar meta mensal e quantidade diária
function syncMonthlyGoalAndDailyQuantity(inputElement) {
  const row = inputElement.closest('tr');
  const monthlyGoalInput = row.querySelector('.exam-monthly-goal');
  const dailyQuantityInput = row.querySelector('.exam-daily-quantity');
  
  if (inputElement === monthlyGoalInput) {
    // Usuário preencheu meta mensal, calcular diária
    const monthlyValue = parseFloat(monthlyGoalInput.value) || 0;
    const dailyValue = monthlyValue / 30;
    dailyQuantityInput.value = dailyValue > 0 ? dailyValue.toFixed(1) : '';
  } else if (inputElement === dailyQuantityInput) {
    // Usuário preencheu quantidade diária, calcular mensal
    const dailyValue = parseFloat(dailyQuantityInput.value) || 0;
    const monthlyValue = dailyValue * 30;
    monthlyGoalInput.value = monthlyValue > 0 ? Math.round(monthlyValue) : '';
  }
}

// Função para adicionar novo exame
function addNewExam(examType, customName = null, size = 100) {
  const tbody = document.getElementById('exams-tbody');
  const template = document.getElementById('exam-row-template');
  const newRow = template.cloneNode(true).querySelector('tr');
  
  // Configurar tipo de exame
  const select = newRow.querySelector('.exam-type-select');
  select.value = examType;
  
  // Se for custom, configurar nome
  if (examType === 'custom' && customName) {
    const nameInput = newRow.querySelector('.custom-exam-name');
    nameInput.value = customName;
    nameInput.style.display = 'block';
  } else if (examType !== 'custom') {
    // Para exames padrão, esconder campo de nome
    const nameInput = newRow.querySelector('.custom-exam-name');
    if (nameInput) nameInput.style.display = 'none';
  }
  
  // Configurar tamanho
  const sizeInput = newRow.querySelector('.exam-size');
  sizeInput.value = size;
  
  // Adicionar eventos
  newRow.querySelector('.exam-type-select').addEventListener('change', function() {
    updateExamSizeFromType(this);
  });
  
  newRow.querySelector('.exam-monthly-goal').addEventListener('input', function() {
    syncMonthlyGoalAndDailyQuantity(this);
  });
  
  newRow.querySelector('.exam-daily-quantity').addEventListener('input', function() {
    syncMonthlyGoalAndDailyQuantity(this);
  });
  
  newRow.querySelector('.exam-size').addEventListener('input', function() {
    this.setAttribute('data-user-modified', 'true');
  });
  
  newRow.querySelector('.remove-exam-btn').addEventListener('click', function() {
    if (confirm('Remover este exame?')) {
      this.closest('tr').remove();
    }
  });
  
  // Adicionar à tabela
  tbody.appendChild(newRow);
  
  // Atualizar tamanho baseado no tipo
  updateExamSizeFromType(select);
}

// Função para coletar dados dos exames
function collectExamData() {
  const examRows = document.querySelectorAll('#exams-tbody tr');
  const examData = {};
  
  examRows.forEach((row, index) => {
    const select = row.querySelector('.exam-type-select');
    const examType = select.value;
    const customNameInput = row.querySelector('.custom-exam-name');
    
    // Determinar nome do exame
    let examName = examType;
    let displayName = examFriendlyNames[examType] || 'Exame Personalizado';
    
    if (examType === 'custom' && customNameInput && customNameInput.value.trim()) {
      examName = 'custom_' + customNameInput.value.trim().toLowerCase().replace(/\s+/g, '_');
      displayName = customNameInput.value.trim();
    }
    
    // Coletar valores
    const size = parseFloat(row.querySelector('.exam-size').value) || 0;
    const monthlyGoal = parseFloat(row.querySelector('.exam-monthly-goal').value) || 0;
    const dailyQuantity = parseFloat(row.querySelector('.exam-daily-quantity').value) || 0;
    
    // Usar o que foi preenchido (meta mensal ou quantidade diária)
    const quantity = monthlyGoal > 0 ? monthlyGoal / 30 : dailyQuantity;
    
    if (size > 0 && quantity > 0) {
      examData[examName] = {
        type: examType,
        displayName: displayName,
        size: size,
        monthlyGoal: monthlyGoal,
        dailyQuantity: quantity,
        isCustom: examType === 'custom',
        customName: examType === 'custom' && customNameInput ? customNameInput.value.trim() : null
      };
    }
  });
  
  return examData;
}

function validateExamData(examData) {
  let algumPreenchido = false;
  let algumComTamanhoSemQtd = false;
  let algumComQtdSemTamanho = false;
  let examesInvalidos = [];

  for (const [exam, data] of Object.entries(examData)) {
    if (data.size > 0 || data.dailyQuantity > 0) {
      algumPreenchido = true;
      
      if (data.size > 0 && data.dailyQuantity === 0) {
        algumComTamanhoSemQtd = true;
        examesInvalidos.push(`${data.displayName} (tem tamanho mas não tem quantidade)`);
      }
      
      if (data.dailyQuantity > 0 && data.size === 0) {
        algumComQtdSemTamanho = true;
        examesInvalidos.push(`${data.displayName} (tem quantidade mas não tem tamanho)`);
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

    // Referências a elementos
    const calculateBtn = document.getElementById('calculate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const generatePdfBtn = document.getElementById('generate-pdf');
    const resultsSection = document.getElementById('resultsSection');
    const applyMarginCheckbox = document.getElementById('apply-margin');
    const addExamBtn = document.getElementById('add-exam-btn');
    const addExamModal = document.getElementById('add-exam-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelAddExamBtn = document.getElementById('cancel-add-exam');
    const saveNewExamBtn = document.getElementById('save-new-exam');
    const newExamTypeSelect = document.getElementById('new-exam-type');
    const customNameGroup = document.getElementById('custom-name-group');
    const customExamNameInput = document.getElementById('custom-exam-name');
    const newExamSizeInput = document.getElementById('new-exam-size');

    // Configurar eventos existentes
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

    // Configurar eventos dos exames existentes
    document.querySelectorAll('.exam-type-select').forEach(select => {
      select.addEventListener('change', function() {
        updateExamSizeFromType(this);
      });
    });
    
    document.querySelectorAll('.exam-monthly-goal').forEach(input => {
      input.addEventListener('input', function() {
        syncMonthlyGoalAndDailyQuantity(this);
      });
    });
    
    document.querySelectorAll('.exam-daily-quantity').forEach(input => {
      input.addEventListener('input', function() {
        syncMonthlyGoalAndDailyQuantity(this);
      });
    });
    
    document.querySelectorAll('.exam-size').forEach(input => {
      input.addEventListener('input', function() {
        this.setAttribute('data-user-modified', 'true');
      });
    });

    // Configurar modal para adicionar exames
    addExamBtn.addEventListener('click', function() {
      addExamModal.classList.add('active');
      newExamTypeSelect.value = 'custom';
      customNameGroup.style.display = 'none';
      newExamSizeInput.value = 100;
      customExamNameInput.value = '';
    });
    
    closeModalBtn.addEventListener('click', function() {
      addExamModal.classList.remove('active');
    });
    
    cancelAddExamBtn.addEventListener('click', function() {
      addExamModal.classList.remove('active');
    });
    
    newExamTypeSelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        customNameGroup.style.display = 'block';
        newExamSizeInput.value = 100;
      } else {
        customNameGroup.style.display = 'none';
        newExamSizeInput.value = examSizeDefaults[this.value] || 100;
      }
    });
    
    saveNewExamBtn.addEventListener('click', function() {
      const examType = newExamTypeSelect.value;
      let customName = null;
      
      if (examType === 'custom') {
        customName = customExamNameInput.value.trim();
        if (!customName) {
          alert('Por favor, informe um nome para o exame personalizado.');
          customExamNameInput.focus();
          return;
        }
      }
      
      const size = parseFloat(newExamSizeInput.value) || 100;
      
      addNewExam(examType, customName, size);
      addExamModal.classList.remove('active');
      
      // Scroll para o novo exame
      const examsTable = document.getElementById('exams-table');
      smoothScrollToElement(examsTable);
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && addExamModal.classList.contains('active')) {
        addExamModal.classList.remove('active');
      }
    });

    // Fechar modal clicando fora
    addExamModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });

    // Função principal de cálculo
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
        const examData = collectExamData();

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

        for (const [examId, data] of Object.entries(examData)) {
          if (data.size > 0 && data.dailyQuantity > 0) {
            const dailyMB = data.size * data.dailyQuantity;
            const monthlyMB = dailyMB * 30;
            const annualGB = (dailyMB * 365) / 1024;

            examResults[examId] = {
              displayName: data.displayName,
              size: data.size,
              monthlyGoal: data.monthlyGoal,
              dailyQuantity: data.dailyQuantity,
              dailyMB: dailyMB,
              monthlyMB: monthlyMB,
              annualGB: annualGB,
              monthlyGB: monthlyMB / 1024,
              isCustom: data.isCustom
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
          examData: examData,
          totalAnnualGB: annualGB,
          totalMonthlyGB: totalMonthlyMB / 1024,
          marginConfig: marginConfig,
          projections: projections,
          customYears: customYears
        };

        // Atualizar interface
        updateResults(projections, customYears, marginConfig);
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

    function updateResults(projections, customYears, marginConfig) {
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
            if (marginConfig.apply && projection.margin > 0) {
              marginElement.textContent = `(+${formatStorage(projection.margin)})`;
              marginElement.style.display = 'block';
              
              // Aplicar cores diferenciadas
              if (marginConfig.type === 'progressive') {
                marginElement.className = 'margin-progressive';
                marginElement.title = `Margem progressiva aplicada: ${projection.marginPercentage}% × ${period.year} ano(s) = ${projection.marginPercentage * period.year}%`;
              } else {
                marginElement.className = 'margin-highlight';
                marginElement.title = `Margem fixa aplicada: ${projection.marginPercentage}%`;
              }
            } else {
              marginElement.style.display = 'none';
              marginElement.className = '';
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
          if (marginConfig.apply && projection.margin > 0) {
            customMarginElement.textContent = `(+${formatStorage(projection.margin)})`;
            customMarginElement.style.display = 'block';
            
            if (marginConfig.type === 'progressive') {
              customMarginElement.className = 'margin-progressive';
              customMarginElement.title = `Margem progressiva: ${projection.marginPercentage}% × ${customYears} anos = ${projection.marginPercentage * customYears}%`;
            } else {
              customMarginElement.className = 'margin-highlight';
              customMarginElement.title = `Margem fixa: ${projection.marginPercentage}%`;
            }
          } else {
            customMarginElement.style.display = 'none';
            customMarginElement.className = '';
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
      const backgroundColors = [
        '#055a71', '#24cec5', '#178f96', '#1da0a5', 
        '#23adac', '#2c3e50', '#8e44ad', '#3498db',
        '#2ecc71', '#e74c3c', '#f39c12', '#d35400',
        '#16a085', '#27ae60', '#2980b9', '#8e44ad'
      ];

      let colorIndex = 0;
      for (const [examId, info] of Object.entries(examResults)) {
        if (info.monthlyMB > 0) {
          labels.push(info.displayName);
          data.push(info.monthlyGB);
          colorIndex++;
        }
      }

      if (distributionChart) distributionChart.destroy();

      distributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.8)'
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
                boxWidth: 12,
                usePointStyle: true
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

      // Configurar cores baseadas no tipo de margem
      const marginColor = marginConfig.type === 'progressive' 
        ? 'rgba(231, 76, 60, 0.8)'  // Vermelho mais vibrante
        : 'rgba(230, 126, 34, 0.8)'; // Laranja mais vibrante
      
      const marginBorderColor = marginConfig.type === 'progressive'
        ? '#e74c3c'
        : '#e67e22';

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
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Período',
                font: {
                  size: window.innerWidth <= 768 ? 10 : 12
                }
              },
              grid: {
                display: false
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
                    const marginTypeText = marginConfig.type === 'progressive' ? 'progressiva' : 'fixa';
                    tooltip += `\nMargem ${marginTypeText}: +${formatStorage(projection.margin)}`;
                    tooltip += `\nTotal: ${formatStorage(projection.final)}`;
                  }
                  
                  return tooltip;
                }
              },
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff'
            },
            legend: {
              labels: {
                font: {
                  size: window.innerWidth <= 768 ? 10 : 12
                },
                padding: 20,
                usePointStyle: true
              }
            }
          }
        }
      });
      
      // Se houver margem, adicionar dataset sobreposto
      if (marginConfig.apply) {
        growthChart.data.datasets.push({
          label: marginConfig.type === 'progressive' ? 'Margem Progressiva' : 'Margem Fixa',
          data: years.map(year => projections[year].margin),
          backgroundColor: marginColor,
          borderWidth: 2,
          borderColor: marginBorderColor,
          borderRadius: 3
        });
        
        growthChart.update();
      }
    }

    function resetForm() {
      resultsSection.style.display = 'none';
      
      // Resetar campos de margem
      document.getElementById('apply-margin').checked = true;
      document.getElementById('marginFields').classList.add('active');
      document.getElementById('margin-percentage').value = '20';
      document.getElementById('margin-type').value = 'fixed';
      
      // Esconder informações de margem
      const marginInfoElements = document.querySelectorAll('[id$="-margin-info"]');
      marginInfoElements.forEach(el => {
        el.style.display = 'none';
        el.className = '';
      });

      // Resetar gráficos
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
      
      // Resetar tabela para apenas dois exames iniciais
      const tbody = document.getElementById('exams-tbody');
      const initialRows = tbody.querySelectorAll('tr');
      
      // Manter apenas os dois primeiros (ressonância e tomografia)
      for (let i = initialRows.length - 1; i >= 2; i--) {
        initialRows[i].remove();
      }
      
      // Resetar valores dos dois primeiros
      const firstRow = tbody.querySelector('tr:nth-child(1)');
      if (firstRow) {
        firstRow.querySelector('.exam-type-select').value = 'ressonancia';
        firstRow.querySelector('.exam-size').value = '600';
        firstRow.querySelector('.exam-monthly-goal').value = '';
        firstRow.querySelector('.exam-daily-quantity').value = '';
      }
      
      const secondRow = tbody.querySelector('tr:nth-child(2)');
      if (secondRow) {
        secondRow.querySelector('.exam-type-select').value = 'tomografia';
        secondRow.querySelector('.exam-size').value = '400';
        secondRow.querySelector('.exam-monthly-goal').value = '';
        secondRow.querySelector('.exam-daily-quantity').value = '';
      }
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

      // Coletar dados para o PDF
      const examData = collectExamData();

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
              allowTaint: true,
              backgroundColor: '#ffffff'
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

    console.log('Aplicação inicializada com sucesso - Versão 3.0');

  } catch (error) {
    console.error('Erro ao carregar a aplicação:', error);
    alert('Erro ao carregar os recursos necessários. Por favor, recarregue a página.');
  }
});