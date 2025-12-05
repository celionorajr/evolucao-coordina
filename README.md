# Sistema de Projeção de Armazenamento PACS - Polos Tecnologia

## 📌 Visão Geral
O **Sistema de Projeção de Armazenamento PACS** é uma solução web desenvolvida para auxiliar unidades de saúde no dimensionamento preciso de armazenamento para sistemas PACS (Picture Archiving and Communication System). A ferramenta calcula necessidades de armazenamento com base em exames médicos e gera projeções para diferentes períodos.

![Tela Principal](https://i.postimg.cc/FKmqJxZn/Captura-de-tela-2025-08-02-124101.png)
*Interface principal do sistema com formulário de entrada de dados*

![Resultados](https://i.postimg.cc/DZwMxyRr/Captura-de-tela-2025-08-02-124134.png)
*Seção de resultados com projeções de armazenamento*

![Gráficos](https://i.postimg.cc/Bvgz517Z/Captura-de-tela-2025-08-02-124153.png)
*Visualização dos gráficos de distribuição e crescimento*

## ✨ Funcionalidades Principais
- **Cálculo Inteligente**:
  - Suporte a 6 tipos de exames (Ressonância, Tomografia, Raio-X, Ultrassom, Densitometria, Hemodinâmica)
  - Médias diárias pré-configuradas para cada modalidade
- **Projeções Temporais**:
  - Períodos padrão: 1, 5, 10 e 20 anos
  - Opção para período personalizado
- **Visualização de Dados**:
  - Gráfico de pizza: distribuição por tipo de exame
  - Gráfico de barras: crescimento do armazenamento
- **Relatórios**:
  - Geração de PDF com todos os resultados
  - Inclusão automática de gráficos

## 🛠 Tecnologias Utilizadas
| Categoria       | Tecnologias                                                                 |
|-----------------|----------------------------------------------------------------------------|
| Frontend        | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) |
| Bibliotecas     | ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chart.js&logoColor=white) ![html2canvas](https://img.shields.io/badge/html2canvas-000000?logo=html5&logoColor=white) |
| Backend         | ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white) |
| Ferramentas     | ![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?logo=puppeteer&logoColor=white) ![Git](https://img.shields.io/badge/Git-F05032?logo=git&logoColor=white) |

## 🚀 Como Executar

### Pré-requisitos
- Node.js v20+
- NPM v9+
- Git (para clonar o repositório)

### Instalação Passo a Passo
```bash
# 1. Clone o repositório
git clone https://github.com/celionorajr/evolucao-coordina.git

# 2. Acesse o diretório
cd evolucao-coordina

# 3. Instale as dependências
npm install

# 4. Inicie o servidor (modo desenvolvimento)
npm run dev

# Ou para produção
npm start
```

O sistema estará disponível em: [http://localhost:3000](http://localhost:3000)

## 📊 Estrutura do Projeto
```bash
evolucao-coordina/
├── public/               # Arquivos estáticos
│   ├── css/              # Estilos CSS
│   ├── js/               # Lógica principal
│   └── logos/            # Assets visuais
├── server/               # Lógica do servidor
├── package.json          # Configuração do projeto
├── README.md             # Documentação
└── .env.example          # Modelo de variáveis de ambiente
```

## 📝 Como Utilizar
1. **Preencha os Dados**:
   - Informe o nome da unidade
   - Insira os tamanhos médios para cada tipo de exame

2. **Calcule a Projeção**:
   - Clique em "Calcular Projeção"
   - Visualize os resultados em GB/TB

3. **Personalize**:
   - Adicione um período personalizado (em anos)
   - Ajuste os valores conforme necessário

4. **Exporte Resultados**:
   - Gere um relatório em PDF com os gráficos
   
   ## 🧪 Testes e Ambiente

### Ambiente de Teste Online
Você pode testar a aplicação diretamente em nosso ambiente:  
🔗 [https://evolucao.coordina.com.br/](https://evolucao.coordina.com.br/)

### Dados de Teste Recomendados
Para experimentar o sistema, sugerimos os seguintes valores de teste:

| Tipo de Exame      | Tamanho Médio (MB) |
|--------------------|-------------------:|
| Ressonância        | 120               |
| Tomografia         | 80                |
| Raio-X             | 15                |
| Ultrassom          | 25                |
| Densitometria      | 10                |
| Hemodinâmica       | 150               |

### Como Realizar Testes Locais
1. Execute a aplicação localmente seguindo as instruções de instalação
2. Utilize os dados de teste acima
3. Verifique:
   - Cálculos de projeção para diferentes períodos
   - Geração correta dos gráficos
   - Funcionamento da exportação para PDF

### Relatar Problemas
Encontrou algum problema? Por favor:
1. Verifique se reproduz o erro no ambiente de demonstração
2. Capture prints da tela com o erro
3. Abra uma issue no [GitHub](https://github.com/celionorajr/evolucao-coordina/issues) com:
   - Descrição detalhada do problema
   - Passos para reproduzir
   - Screenshots quando aplicável
   - Configuração do seu ambiente

## 🤝 Contribuição
Contribuições são bem-vindas! Siga estes passos:
1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📜 Licença
Este projeto é propriedade intelectual da **Polos Tecnologia** e está sob licença interna. Para mais informações, entre em contato.

## ✉️ Contato
**Desenvolvedor**: Célio Nora Junior  
**Email**: [cnoraj@gmail.com](mailto:cnoraj@gmail.com)  
**Repositório**: [github.com/celionorajr/evolucao-coordina](https://github.com/celionorajr/evolucao-coordina)

---

⭐ **Dica**: Para melhores resultados, utilize os valores médios reais dos equipamentos da unidade. Valores padrão são fornecidos como referência inicial.
