// Configurações
const WORK_HOURS = 7; // 7 horas
const WORK_MINUTES = 20; // 20 minutos
const TOTAL_WORK_MINUTES = WORK_HOURS * 60 + WORK_MINUTES; // 440 minutos

// Classe principal do app
class PontoApp {
    constructor() {
        this.db = null;
        this.currentDay = null;
        this.timer = null;
        this.stream = null;
        this.currentPhoto = null;
        this.currentManualWorkDay = null;
        this.currentPhotoType = null;
        this.init();
    }

    async init() {
        await this.initDatabase();
        this.setupEventListeners();
        this.updateCurrentDate();
        this.loadTodayData();
        this.loadHistory();
        this.startTimer();
        this.initializeManualForm();
        this.initializeReportForm();
        this.loadPhotoPreference();
    }

    // Inicializar IndexedDB
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PontoDB', 2); // Versão 2 para suportar fotos

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store para os dias de trabalho
                if (!db.objectStoreNames.contains('workDays')) {
                    const workDaysStore = db.createObjectStore('workDays', { keyPath: 'date' });
                    workDaysStore.createIndex('date', 'date', { unique: true });
                }
                
                // Store para as fotos
                if (!db.objectStoreNames.contains('photos')) {
                    const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
                    photosStore.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botões de controle
        document.getElementById('btn-entrada').addEventListener('click', () => this.registerTime('entrada'));
        document.getElementById('btn-saida-almoco').addEventListener('click', () => this.registerTime('saidaAlmoco'));
        document.getElementById('btn-entrada-almoco').addEventListener('click', () => this.registerTime('entradaAlmoco'));
        document.getElementById('btn-saida').addEventListener('click', () => this.registerTime('saida'));

        // Botões do histórico
        document.getElementById('btn-export').addEventListener('click', () => this.exportData());
        document.getElementById('btn-clear').addEventListener('click', () => this.clearHistory());

        // Botão de entrada manual
        document.getElementById('btn-save-manual').addEventListener('click', () => this.saveManualEntry());

        // Botão de relatório
        document.getElementById('btn-generate-report').addEventListener('click', () => this.generateReport());

        // Botões de backup
        document.getElementById('btn-backup').addEventListener('click', () => this.createBackup());
        document.getElementById('btn-restore').addEventListener('click', () => this.restoreBackup());
        document.getElementById('restore-file').addEventListener('change', (e) => this.handleRestoreFile(e));

        // Toggle de foto
        document.getElementById('photo-enabled').addEventListener('change', (e) => this.savePhotoPreference(e.target.checked));

        // Modal
        const modal = document.getElementById('modal');
        const photoModal = document.getElementById('photo-modal');
        const closeBtns = document.querySelectorAll('.close');
        
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
                photoModal.style.display = 'none';
                this.stopCamera();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
            if (e.target === photoModal) {
                photoModal.style.display = 'none';
                this.stopCamera();
            }
        });

        // Controles de foto
        document.getElementById('btn-capture').addEventListener('click', () => this.capturePhoto());
        document.getElementById('btn-retake').addEventListener('click', () => this.retakePhoto());
        document.getElementById('btn-save-photo').addEventListener('click', () => this.savePhoto());
    }

    // Carregar preferência de foto
    loadPhotoPreference() {
        const enabled = localStorage.getItem('photoEnabled') === 'true';
        document.getElementById('photo-enabled').checked = enabled;
    }

    // Salvar preferência de foto
    savePhotoPreference(enabled) {
        localStorage.setItem('photoEnabled', enabled);
    }

    // Inicializar formulário manual
    initializeManualForm() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('manual-date').value = today;
    }

    // Inicializar formulário de relatório
    initializeReportForm() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('report-start').value = firstDay.toISOString().split('T')[0];
        document.getElementById('report-end').value = today.toISOString().split('T')[0];
    }

    // Atualizar data atual
    updateCurrentDate() {
        const today = new Date();
        const dateStr = today.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('current-date').textContent = dateStr;
    }

    // Carregar dados do dia atual
    async loadTodayData() {
        const today = new Date().toISOString().split('T')[0];
        this.currentDay = await this.getWorkDay(today);
        this.updateUI();
    }

    // Registrar horário
    async registerTime(type) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        if (!this.currentDay) {
            this.currentDay = {
                date: today,
                entrada: null,
                saidaAlmoco: null,
                entradaAlmoco: null,
                saida: null,
                createdAt: now.toISOString()
            };
        }

        this.currentDay[type] = now.toISOString();
        this.currentDay.updatedAt = now.toISOString();

        // Verificar se deve capturar foto
        const photoEnabled = document.getElementById('photo-enabled').checked;
        if (photoEnabled) {
            await this.capturePhotoForTime(type);
        } else {
            await this.saveWorkDay(this.currentDay);
            this.updateUI();
            this.showNotification(`Horário registrado: ${this.getTimeString(now)}`);
        }
    }

    // Capturar foto para horário
    async capturePhotoForTime(type) {
        try {
            await this.startCamera();
            document.getElementById('photo-modal').style.display = 'block';
            this.currentPhotoType = type;
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            this.showNotification('Erro ao acessar câmera. Registrando sem foto.', 'error');
            await this.saveWorkDay(this.currentDay);
            this.updateUI();
        }
    }

    // Iniciar câmera
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            const video = document.getElementById('photo-video');
            video.srcObject = this.stream;
            video.style.display = 'block';
            
            document.getElementById('btn-capture').style.display = 'inline-block';
            document.getElementById('btn-retake').style.display = 'none';
            document.getElementById('btn-save-photo').style.display = 'none';
            
            const preview = document.getElementById('photo-preview');
            preview.innerHTML = '<p>Posicione para a foto</p>';
            preview.className = 'photo-preview';
        } catch (error) {
            throw error;
        }
    }

    // Parar câmera
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        document.getElementById('photo-video').style.display = 'none';
    }

    // Capturar foto
    capturePhoto() {
        const video = document.getElementById('photo-video');
        const canvas = document.getElementById('photo-canvas');
        const preview = document.getElementById('photo-preview');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        this.currentPhoto = canvas.toDataURL('image/jpeg', 0.8);
        
        preview.innerHTML = `<img src="${this.currentPhoto}" alt="Foto capturada">`;
        preview.className = 'photo-preview has-photo';
        
        document.getElementById('btn-capture').style.display = 'none';
        document.getElementById('btn-retake').style.display = 'inline-block';
        document.getElementById('btn-save-photo').style.display = 'inline-block';
    }

    // Nova foto
    retakePhoto() {
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = '<p>Posicione para a foto</p>';
        preview.className = 'photo-preview';
        
        document.getElementById('btn-capture').style.display = 'inline-block';
        document.getElementById('btn-retake').style.display = 'none';
        document.getElementById('btn-save-photo').style.display = 'none';
        
        this.currentPhoto = null;
    }

    // Salvar foto
    async savePhoto() {
        if (this.currentPhoto && this.currentPhotoType) {
            let workDay = this.currentDay;
            let isManual = false;
            if (this.currentPhotoType === 'manual' && this.currentManualWorkDay) {
                workDay = this.currentManualWorkDay;
                isManual = true;
            }
            const photoId = `${workDay.date}_${this.currentPhotoType}_${Date.now()}`;
            await this.savePhotoToDB(photoId, this.currentPhoto, workDay.date, this.currentPhotoType);
            if (!workDay.photos) workDay.photos = [];
            workDay.photos.push(photoId);
            await this.saveWorkDay(workDay);
            if (isManual) {
                this.clearManualForm();
                if (workDay.date === new Date().toISOString().split('T')[0]) {
                    this.loadTodayData();
                }
                this.loadHistory();
                this.showNotification('Horário salvo com foto!');
                this.currentManualWorkDay = null;
            } else {
                this.updateUI();
                const now = new Date();
                this.showNotification(`Horário registrado com foto: ${this.getTimeString(now)}`);
            }
            document.getElementById('photo-modal').style.display = 'none';
            this.stopCamera();
            this.currentPhoto = null;
            this.currentPhotoType = null;
        }
    }

    // Salvar foto no banco
    async savePhotoToDB(id, dataUrl, date, type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const photo = {
                id: id,
                dataUrl: dataUrl,
                date: date,
                type: type,
                createdAt: new Date().toISOString()
            };
            const request = store.put(photo);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Obter foto do banco
    async getPhotoFromDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Salvar entrada manual
    async saveManualEntry() {
        const date = document.getElementById('manual-date').value;
        const entrada = document.getElementById('manual-entrada').value;
        const saidaAlmoco = document.getElementById('manual-saida-almoco').value;
        const entradaAlmoco = document.getElementById('manual-entrada-almoco').value;
        const saida = document.getElementById('manual-saida').value;
        const photoEnabled = document.getElementById('manual-photo-enabled').checked;

        if (!date || !entrada || !saida) {
            this.showNotification('Data, entrada e saída são obrigatórios!', 'error');
            return;
        }

        // Validar se entrada é antes da saída
        if (entrada >= saida) {
            this.showNotification('Entrada deve ser antes da saída!', 'error');
            return;
        }

        // Validar horários do almoço se preenchidos
        if (saidaAlmoco && entradaAlmoco) {
            if (saidaAlmoco >= entradaAlmoco) {
                this.showNotification('Saída do almoço deve ser antes do retorno!', 'error');
                return;
            }
            if (entradaAlmoco >= saida) {
                this.showNotification('Retorno do almoço deve ser antes da saída!', 'error');
                return;
            }
        }

        // Criar objeto com horários
        const workDay = {
            date: date,
            entrada: this.combineDateTime(date, entrada),
            saidaAlmoco: saidaAlmoco ? this.combineDateTime(date, saidaAlmoco) : null,
            entradaAlmoco: entradaAlmoco ? this.combineDateTime(date, entradaAlmoco) : null,
            saida: this.combineDateTime(date, saida),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            manualEntry: true
        };

        // Se foto estiver habilitada, capturar antes de salvar
        if (photoEnabled) {
            this.currentManualWorkDay = workDay;
            this.currentPhotoType = 'manual';
            await this.startCamera();
            document.getElementById('photo-modal').style.display = 'block';
            // O fluxo de salvar será finalizado em savePhoto()
        } else {
            await this.saveWorkDay(workDay);
            this.clearManualForm();
            if (date === new Date().toISOString().split('T')[0]) {
                this.loadTodayData();
            }
            this.loadHistory();
            this.showNotification('Horário salvo com sucesso!');
        }
    }

    // Corrigir função combineDateTime para garantir data correta sem ajuste de fuso
    combineDateTime(date, time) {
        // Cria a data local, sem UTC
        return new Date(date + 'T' + time).toISOString();
    }

    // Limpar formulário manual
    clearManualForm() {
        document.getElementById('manual-entrada').value = '';
        document.getElementById('manual-saida-almoco').value = '';
        document.getElementById('manual-entrada-almoco').value = '';
        document.getElementById('manual-saida').value = '';
        document.getElementById('manual-photo-enabled').checked = false;
    }

    // Criar backup
    async createBackup() {
        try {
            const workDays = await this.getAllWorkDays();
            const photos = await this.getAllPhotos();
            
            const backup = {
                version: '2.0',
                createdAt: new Date().toISOString(),
                workDays: workDays,
                photos: photos
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `ponto_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Backup criado com sucesso!');
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            this.showNotification('Erro ao criar backup!', 'error');
        }
    }

    // Restaurar backup
    restoreBackup() {
        document.getElementById('restore-file').click();
    }

    // Manipular arquivo de restore
    async handleRestoreFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            
            if (!backup.version || !backup.workDays) {
                throw new Error('Arquivo de backup inválido');
            }
            
            if (confirm(`Restaurar backup de ${backup.workDays.length} dias? Esta ação substituirá os dados atuais.`)) {
                await this.performRestore(backup);
                this.showNotification('Backup restaurado com sucesso!');
                this.loadHistory();
                this.loadTodayData();
            }
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            this.showNotification('Erro ao restaurar backup!', 'error');
        }
        
        // Limpar input
        event.target.value = '';
    }

    // Executar restore
    async performRestore(backup) {
        // Limpar dados atuais
        await this.clearAllWorkDays();
        await this.clearAllPhotos();
        
        // Restaurar dias de trabalho
        for (const workDay of backup.workDays) {
            await this.saveWorkDay(workDay);
        }
        
        // Restaurar fotos
        if (backup.photos) {
            for (const photo of backup.photos) {
                await this.savePhotoToDB(photo.id, photo.dataUrl, photo.date, photo.type);
            }
        }
    }

    // Obter todas as fotos
    async getAllPhotos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Limpar todas as fotos
    async clearAllPhotos() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Gerar relatório
    async generateReport() {
        const startDate = document.getElementById('report-start').value;
        const endDate = document.getElementById('report-end').value;

        if (!startDate || !endDate) {
            this.showNotification('Selecione o período do relatório!', 'error');
            return;
        }

        if (startDate > endDate) {
            this.showNotification('Data inicial deve ser antes da data final!', 'error');
            return;
        }

        const workDays = await this.getWorkDaysInRange(startDate, endDate);
        const summary = this.calculateSummary(workDays);
        
        this.displayReportSummary(summary);
    }

    // Obter dias de trabalho em um período
    async getWorkDaysInRange(startDate, endDate) {
        const allWorkDays = await this.getAllWorkDays();
        return allWorkDays.filter(day => {
            return day.date >= startDate && day.date <= endDate && day.saida;
        });
    }

    // Calcular resumo do período
    calculateSummary(workDays) {
        let totalWorkedMinutes = 0;
        let totalTargetMinutes = 0;

        workDays.forEach(day => {
            const workedMinutes = this.calculateWorkedTimeForDay(day);
            totalWorkedMinutes += workedMinutes;
            totalTargetMinutes += TOTAL_WORK_MINUTES;
        });

        const balance = totalWorkedMinutes - totalTargetMinutes;

        return {
            totalDays: workDays.length,
            totalWorkedMinutes,
            totalTargetMinutes,
            balance
        };
    }

    // Exibir resumo do relatório
    displayReportSummary(summary) {
        document.getElementById('total-days').textContent = summary.totalDays;
        document.getElementById('total-worked').textContent = this.formatTime(summary.totalWorkedMinutes);
        document.getElementById('total-target').textContent = this.formatTime(summary.totalTargetMinutes);
        
        const balanceElement = document.getElementById('total-balance');
        const balanceString = this.formatTime(Math.abs(summary.balance));
        balanceElement.textContent = (summary.balance >= 0 ? '+' : '-') + balanceString;
        balanceElement.className = 'balance';
        
        if (summary.balance > 0) balanceElement.classList.add('positive');
        else if (summary.balance < 0) balanceElement.classList.add('negative');
        else balanceElement.classList.add('neutral');

        document.getElementById('report-summary').style.display = 'block';
    }

    // Atualizar interface
    updateUI() {
        if (!this.currentDay) {
            this.updateStatus('Não iniciado');
            this.updateButtons(['entrada']);
            this.updateWorkedTime(0);
            this.updateBalance(0);
            return;
        }

        const status = this.getCurrentStatus();
        this.updateStatus(status);
        this.updateButtons(this.getAvailableActions());
        this.updateWorkedTime();
        this.updateBalance();
    }

    // Obter status atual
    getCurrentStatus() {
        const { entrada, saidaAlmoco, entradaAlmoco, saida } = this.currentDay;
        
        if (!entrada) return 'Não iniciado';
        if (!saidaAlmoco) return 'Trabalhando';
        if (!entradaAlmoco) return 'No almoço';
        if (!saida) return 'Trabalhando';
        return 'Finalizado';
    }

    // Obter ações disponíveis
    getAvailableActions() {
        const { entrada, saidaAlmoco, entradaAlmoco, saida } = this.currentDay;
        const actions = [];

        if (!entrada) actions.push('entrada');
        if (entrada && !saidaAlmoco) actions.push('saidaAlmoco');
        if (saidaAlmoco && !entradaAlmoco) actions.push('entradaAlmoco');
        if (entradaAlmoco && !saida) actions.push('saida');

        return actions;
    }

    // Atualizar status
    updateStatus(status) {
        const statusElement = document.getElementById('today-status');
        statusElement.textContent = status;
        statusElement.className = 'status-badge';
        
        switch (status) {
            case 'Trabalhando':
                statusElement.classList.add('working');
                break;
            case 'No almoço':
                statusElement.classList.add('break');
                break;
            case 'Finalizado':
                statusElement.classList.add('finished');
                break;
        }
    }

    // Atualizar botões
    updateButtons(availableActions) {
        const buttons = {
            entrada: document.getElementById('btn-entrada'),
            saidaAlmoco: document.getElementById('btn-saida-almoco'),
            entradaAlmoco: document.getElementById('btn-entrada-almoco'),
            saida: document.getElementById('btn-saida')
        };

        Object.keys(buttons).forEach(action => {
            buttons[action].disabled = !availableActions.includes(action);
        });
    }

    // Atualizar tempo trabalhado
    updateWorkedTime() {
        if (!this.currentDay) {
            document.getElementById('worked-time').textContent = '00:00';
            return;
        }

        const workedMinutes = this.calculateWorkedTime();
        const timeString = this.formatTime(workedMinutes);
        document.getElementById('worked-time').textContent = timeString;
    }

    // Atualizar saldo
    updateBalance() {
        if (!this.currentDay) {
            document.getElementById('daily-balance').textContent = '00:00';
            return;
        }

        const workedMinutes = this.calculateWorkedTime();
        const balance = workedMinutes - TOTAL_WORK_MINUTES;
        const balanceString = this.formatTime(Math.abs(balance));
        const balanceElement = document.getElementById('daily-balance');
        
        balanceElement.textContent = (balance >= 0 ? '+' : '-') + balanceString;
        balanceElement.className = 'balance';
        
        if (balance > 0) balanceElement.classList.add('positive');
        else if (balance < 0) balanceElement.classList.add('negative');
        else balanceElement.classList.add('neutral');
    }

    // Calcular tempo trabalhado
    calculateWorkedTime() {
        const { entrada, saidaAlmoco, entradaAlmoco, saida } = this.currentDay;
        if (!entrada) return 0;

        let totalMinutes = 0;
        const now = new Date();

        // Primeiro período (entrada até saída almoço ou agora)
        if (saidaAlmoco) {
            totalMinutes += (new Date(saidaAlmoco) - new Date(entrada)) / (1000 * 60);
        } else {
            totalMinutes += (now - new Date(entrada)) / (1000 * 60);
        }

        // Segundo período (retorno almoço até saída ou agora)
        if (entradaAlmoco) {
            if (saida) {
                totalMinutes += (new Date(saida) - new Date(entradaAlmoco)) / (1000 * 60);
            } else {
                totalMinutes += (now - new Date(entradaAlmoco)) / (1000 * 60);
            }
        }

        return Math.max(0, Math.round(totalMinutes));
    }

    // Formatar tempo
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    // Iniciar timer para atualização em tempo real
    startTimer() {
        this.timer = setInterval(() => {
            if (this.currentDay && this.getCurrentStatus() !== 'Finalizado') {
                this.updateWorkedTime();
                this.updateBalance();
            }
        }, 1000);
    }

    // Carregar histórico
    async loadHistory() {
        const workDays = await this.getAllWorkDays();
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        workDays.sort((a, b) => new Date(b.date) - new Date(a.date));

        for (const day of workDays) {
            if (day.saida) { // Só mostrar dias finalizados
                const historyItem = await this.createHistoryItem(day);
                historyList.appendChild(historyItem);
            }
        }
    }

    // Criar item do histórico
    async createHistoryItem(day) {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const workedMinutes = this.calculateWorkedTimeForDay(day);
        const balance = workedMinutes - TOTAL_WORK_MINUTES;
        const balanceString = this.formatTime(Math.abs(balance));
        const balanceClass = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral';
        
        const date = new Date(day.date).toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        });

        const manualBadge = day.manualEntry ? '<span style="color: #FF9800; font-size: 0.8rem;">✏️ Manual</span>' : '';
        
        // Carregar fotos se existirem
        let photosHTML = '';
        if (day.photos && day.photos.length > 0) {
            photosHTML = '<div class="photos">';
            for (const photoId of day.photos) {
                try {
                    const photo = await this.getPhotoFromDB(photoId);
                    if (photo) {
                        photosHTML += `<img src="${photo.dataUrl}" alt="Foto" class="photo-thumbnail" data-photo-id="${photoId}">`;
                    }
                } catch (error) {
                    console.error('Erro ao carregar foto:', error);
                }
            }
            photosHTML += '</div>';
        }

        item.innerHTML = `
            <h3>${date} ${manualBadge}</h3>
            <div class="details">
                <div>Trabalhado: ${this.formatTime(workedMinutes)}</div>
                <div>Saldo: <span class="balance ${balanceClass}">${balance >= 0 ? '+' : '-'}${balanceString}</span></div>
            </div>
            ${photosHTML}
        `;

        item.addEventListener('click', () => this.showDayDetails(day));
        return item;
    }

    // Calcular tempo trabalhado para um dia específico
    calculateWorkedTimeForDay(day) {
        const { entrada, saidaAlmoco, entradaAlmoco, saida } = day;
        if (!entrada || !saida) return 0;

        let totalMinutes = 0;

        // Primeiro período
        if (saidaAlmoco) {
            totalMinutes += (new Date(saidaAlmoco) - new Date(entrada)) / (1000 * 60);
        } else {
            totalMinutes += (new Date(saida) - new Date(entrada)) / (1000 * 60);
        }

        // Segundo período
        if (entradaAlmoco) {
            totalMinutes += (new Date(saida) - new Date(entradaAlmoco)) / (1000 * 60);
        }

        return Math.max(0, Math.round(totalMinutes));
    }

    // Mostrar detalhes do dia
    async showDayDetails(day) {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        
        const workedMinutes = this.calculateWorkedTimeForDay(day);
        const balance = workedMinutes - TOTAL_WORK_MINUTES;
        const balanceString = this.formatTime(Math.abs(balance));
        const balanceClass = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral';

        const manualBadge = day.manualEntry ? '<span style="color: #FF9800; font-size: 0.9rem;">✏️ Entrada Manual</span>' : '';

        // Carregar fotos se existirem
        let photosHTML = '';
        if (day.photos && day.photos.length > 0) {
            photosHTML = '<div style="margin-top: 20px;"><h4>📸 Fotos do dia:</h4><div style="display: flex; gap: 10px; flex-wrap: wrap;">';
            for (const photoId of day.photos) {
                try {
                    const photo = await this.getPhotoFromDB(photoId);
                    if (photo) {
                        photosHTML += `
                            <div style="text-align: center;">
                                <img src="${photo.dataUrl}" alt="Foto" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;">
                                <p style="font-size: 0.8rem; margin: 5px 0;">${photo.type}</p>
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error('Erro ao carregar foto:', error);
                }
            }
            photosHTML += '</div></div>';
        }

        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>${new Date(day.date).toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })} ${manualBadge}</h3>
            </div>
            <div style="display: grid; gap: 15px;">
                <div><strong>Entrada:</strong> ${day.entrada ? this.getTimeString(new Date(day.entrada)) : 'Não registrado'}</div>
                <div><strong>Saída Almoço:</strong> ${day.saidaAlmoco ? this.getTimeString(new Date(day.saidaAlmoco)) : 'Não registrado'}</div>
                <div><strong>Retorno Almoço:</strong> ${day.entradaAlmoco ? this.getTimeString(new Date(day.entradaAlmoco)) : 'Não registrado'}</div>
                <div><strong>Saída:</strong> ${day.saida ? this.getTimeString(new Date(day.saida)) : 'Não registrado'}</div>
                <hr>
                <div><strong>Tempo Trabalhado:</strong> ${this.formatTime(workedMinutes)}</div>
                <div><strong>Meta:</strong> ${this.formatTime(TOTAL_WORK_MINUTES)}</div>
                <div><strong>Saldo:</strong> <span class="balance ${balanceClass}">${balance >= 0 ? '+' : '-'}${balanceString}</span></div>
            </div>
            ${photosHTML}
        `;

        modal.style.display = 'block';
    }

    // Exportar dados
    exportData() {
        this.getAllWorkDays().then(workDays => {
            const csv = this.convertToCSV(workDays);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `ponto_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Converter para CSV
    convertToCSV(workDays) {
        const headers = ['Data', 'Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída', 'Tempo Trabalhado', 'Saldo', 'Tipo', 'Fotos'];
        const rows = workDays.map(day => {
            const workedMinutes = this.calculateWorkedTimeForDay(day);
            const balance = workedMinutes - TOTAL_WORK_MINUTES;
            
            return [
                new Date(day.date).toLocaleDateString('pt-BR'),
                day.entrada ? this.getTimeString(new Date(day.entrada)) : '',
                day.saidaAlmoco ? this.getTimeString(new Date(day.saidaAlmoco)) : '',
                day.entradaAlmoco ? this.getTimeString(new Date(day.entradaAlmoco)) : '',
                day.saida ? this.getTimeString(new Date(day.saida)) : '',
                this.formatTime(workedMinutes),
                `${balance >= 0 ? '+' : ''}${this.formatTime(Math.abs(balance))}`,
                day.manualEntry ? 'Manual' : 'Automático',
                day.photos ? day.photos.length : 0
            ];
        });

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // Limpar histórico
    async clearHistory() {
        if (confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
            await this.clearAllWorkDays();
            await this.clearAllPhotos();
            this.loadHistory();
            this.showNotification('Histórico limpo com sucesso!');
        }
    }

    // Utilitários
    getTimeString(date) {
        return date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    showNotification(message, type = 'success') {
        // Criar notificação simples
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? 'var(--danger-color)' : 'var(--success-color)';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // Operações do banco de dados
    async saveWorkDay(workDay) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workDays'], 'readwrite');
            const store = transaction.objectStore('workDays');
            const request = store.put(workDay);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getWorkDay(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workDays'], 'readonly');
            const store = transaction.objectStore('workDays');
            const request = store.get(date);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllWorkDays() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workDays'], 'readonly');
            const store = transaction.objectStore('workDays');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllWorkDays() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workDays'], 'readwrite');
            const store = transaction.objectStore('workDays');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Adicionar estilos para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inicializar app quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new PontoApp();
}); 