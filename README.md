# 📅 Controle de Ponto - PWA Completo

Um Progressive Web App (PWA) completo para controle de ponto de trabalho que funciona **totalmente offline** e pode ser instalado no celular como um app nativo.

## ✨ Funcionalidades

- **Registro automático**: Entrada, saída para almoço, retorno do almoço e saída final
- **Entrada manual**: Possibilidade de inserir horários manualmente para dias passados
- **📸 Fotos opcionais**: Capture fotos para cada registro de ponto
- **Cálculo automático**: Baseado em 7h20min de trabalho por dia
- **Relatórios**: Somatório de horas trabalhadas em períodos específicos
- **💾 Backup e Restore**: Sistema completo de backup dos dados
- **Armazenamento offline**: Dados salvos no IndexedDB do navegador
- **Histórico completo**: Visualização de todos os dias trabalhados
- **Exportação**: Dados podem ser exportados em CSV
- **PWA Completo**: Funciona offline e pode ser instalado como app nativo
- **Interface responsiva**: Otimizada para desktop e mobile

## 🚀 Como usar

### 1. Instalação

1. Clone ou baixe este repositório
2. Abra o arquivo `index.html` no navegador
3. Para instalar no celular:
   - Abra o app no Chrome/Safari
   - Toque em "Adicionar à tela inicial" ou "Instalar app"
   - Ou use o botão "📱 Instalar App" que aparece automaticamente

### 2. Geração dos Ícones

1. Abra o arquivo `create-icons.html` no navegador
2. Clique em "🚀 Gerar Todos os Ícones" para baixar todos os ícones
3. Crie uma pasta `icons` no projeto e coloque os ícones lá
4. **Importante**: Sem os ícones, o PWA pode não funcionar corretamente

### 3. Deploy no GitHub Pages

1. Crie um repositório no GitHub
2. Faça upload dos arquivos
3. Vá em Settings > Pages
4. Selecione a branch main
5. O app estará disponível em `https://seu-usuario.github.io/seu-repositorio`

## 📱 Como usar o app

### Registro Automático de Horários

1. **Entrada**: Clique em "🏢 Entrada" quando chegar ao trabalho
2. **Saída Almoço**: Clique em "🍽️ Saída Almoço" quando sair para almoçar
3. **Retorno Almoço**: Clique em "🏢 Retorno Almoço" quando voltar do almoço
4. **Saída**: Clique em "🏠 Saída" quando terminar o trabalho

### 📸 Funcionalidade de Fotos

- **Ativar fotos**: Marque a opção "📸 Incluir foto" antes de registrar horários
- **Captura automática**: Ao registrar um horário, a câmera será ativada
- **Visualização**: As fotos aparecem como miniaturas no histórico
- **Detalhes**: Clique em um dia para ver as fotos em tamanho maior
- **Opcional**: Você pode desativar as fotos a qualquer momento

### Entrada Manual de Horários

1. **Selecione a data**: Escolha o dia que deseja registrar
2. **Preencha os horários**: 
   - Entrada (obrigatório)
   - Saída Almoço (opcional)
   - Retorno Almoço (opcional)
   - Saída (obrigatório)
3. **Clique em "💾 Salvar"**: O horário será salvo e aparecerá no histórico

**Validações:**
- Data, entrada e saída são obrigatórios
- Entrada deve ser antes da saída
- Horários do almoço devem estar na ordem correta
- Entradas manuais são marcadas com ✏️ no histórico

### 💾 Backup e Restore

#### Fazer Backup
1. Clique em "📤 Fazer Backup"
2. Um arquivo JSON será baixado com todos os dados
3. Guarde este arquivo em local seguro

#### Restaurar Backup
1. Clique em "📥 Restaurar Backup"
2. Selecione o arquivo JSON do backup
3. Confirme a restauração
4. Todos os dados serão restaurados

**Importante**: O restore substitui todos os dados atuais pelos do backup.

### Relatórios

1. **Selecione o período**: Escolha a data inicial e final
2. **Clique em "📈 Gerar Relatório"**: O sistema calculará:
   - Total de dias trabalhados
   - Total de horas trabalhadas
   - Meta total (7h20min × dias)
   - Saldo geral (horas extras/devedoras)

### Visualização

- **Status atual**: Mostra se você está trabalhando, no almoço ou finalizado
- **Tempo trabalhado**: Tempo total do dia em tempo real
- **Saldo**: Diferença entre tempo trabalhado e meta (7h20min)
  - Verde: Horas extras
  - Vermelho: Horas devidas
  - Amarelo: Exato

### Histórico

- Clique em qualquer dia no histórico para ver detalhes
- Entradas manuais são marcadas com ✏️
- Fotos aparecem como miniaturas
- Use "📊 Exportar CSV" para baixar dados em CSV
- Use "🗑️ Limpar" para apagar todo o histórico

## 🛠️ Tecnologias

- **HTML5**: Estrutura semântica
- **CSS3**: Design moderno e responsivo
- **JavaScript ES6+**: Lógica do aplicativo
- **IndexedDB**: Armazenamento offline
- **Service Worker**: Funcionalidade PWA
- **Web App Manifest**: Configuração de instalação
- **MediaDevices API**: Captura de fotos
- **File API**: Sistema de backup/restore

## 📁 Estrutura do Projeto

```
controle-ponto-pwa/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── app.js             # Lógica JavaScript
├── sw.js              # Service Worker
├── manifest.json      # Configuração PWA
├── create-icons.html  # Gerador de ícones
├── README.md          # Este arquivo
└── icons/             # Pasta com ícones (criar)
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

## ⚙️ Configurações

### Alterar Jornada de Trabalho

No arquivo `app.js`, linha 2-4:

```javascript
const WORK_HOURS = 7; // 7 horas
const WORK_MINUTES = 20; // 20 minutos
const TOTAL_WORK_MINUTES = WORK_HOURS * 60 + WORK_MINUTES; // 440 minutos
```

### Personalizar Cores

No arquivo `styles.css`, variáveis CSS:

```css
:root {
    --primary-color: #2196F3;
    --secondary-color: #FF9800;
    --danger-color: #F44336;
    --success-color: #4CAF50;
    --warning-color: #FFC107;
}
```

## 🔧 Funcionalidades Avançadas

### Atalhos do PWA

O app inclui atalhos para:
- Registrar entrada rapidamente
- Registrar saída rapidamente
- Fazer backup dos dados

### Notificações

O Service Worker suporta notificações push (configurável).

### Sincronização

Preparado para sincronização com servidor quando necessário.

### Atualizações Automáticas

O app detecta atualizações e oferece para atualizar automaticamente.

## 📊 Exportação de Dados

Os dados são exportados em CSV com as colunas:
- Data
- Entrada
- Saída Almoço
- Retorno Almoço
- Saída
- Tempo Trabalhado
- Saldo
- Tipo (Manual/Automático)
- Fotos (quantidade)

## 📈 Relatórios

### Funcionalidades dos Relatórios

- **Período personalizado**: Escolha qualquer período de datas
- **Somatório automático**: Calcula total de horas trabalhadas
- **Comparação com meta**: Mostra se você está com horas extras ou devendo
- **Visualização clara**: Interface intuitiva com cores indicativas

### Exemplo de Uso

1. **Relatório mensal**: Selecione do dia 1 ao último dia do mês
2. **Relatório semanal**: Selecione de segunda a sexta
3. **Relatório personalizado**: Qualquer período que desejar

## 📸 Sistema de Fotos

### Funcionalidades

- **Captura automática**: Ao registrar horário com foto ativada
- **Câmera frontal**: Usa a câmera frontal do dispositivo
- **Compressão**: Fotos são comprimidas para economizar espaço
- **Visualização**: Miniaturas no histórico e fotos grandes nos detalhes
- **Associação**: Cada foto é associada ao tipo de registro (entrada, saída, etc.)

### Como Usar

1. **Ativar**: Marque "📸 Incluir foto" antes de registrar
2. **Capturar**: Posicione e clique em "📸 Capturar"
3. **Confirmar**: Clique em "💾 Salvar" para confirmar
4. **Visualizar**: Veja as fotos no histórico e detalhes

## 🔒 Privacidade

- **Dados locais**: Todos os dados ficam armazenados apenas no seu dispositivo
- **Fotos locais**: As fotos são salvas apenas no seu dispositivo
- **Sem servidor**: Não há coleta ou envio de dados
- **Offline**: Funciona completamente sem internet
- **Backup seguro**: Backups são arquivos locais que você controla

## 🐛 Solução de Problemas

### App não instala
- Verifique se o navegador suporta PWA
- Certifique-se de que os ícones estão na pasta correta
- Verifique se o manifest.json está correto
- Use HTTPS em produção

### Dados não salvam
- Verifique se o IndexedDB está habilitado
- Tente limpar o cache do navegador
- Verifique se não está em modo privado

### App não funciona offline
- Verifique se o Service Worker está registrado
- Certifique-se de que o HTTPS está ativo (para produção)

### Entrada manual não funciona
- Verifique se todos os campos obrigatórios estão preenchidos
- Certifique-se de que os horários estão na ordem correta
- Verifique se a data é válida

### Fotos não funcionam
- Verifique se o navegador suporta MediaDevices API
- Certifique-se de que a câmera está disponível
- Verifique as permissões de câmera no navegador

### Backup não funciona
- Verifique se o arquivo JSON é válido
- Certifique-se de que o arquivo é do formato correto
- Verifique se há espaço suficiente no dispositivo

## 📝 Licença

Este projeto é de código aberto e pode ser usado livremente.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir melhorias
- Enviar pull requests

---

**Desenvolvido com ❤️ para facilitar o controle de ponto de trabalho** 