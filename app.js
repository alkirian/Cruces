/* ========================================
   FREESTYLE BATTLE BRACKET - APP
   ======================================== */

// State
const state = {
    participants: [],
    passCount: 2,
    tournament: null,
    currentRound: 0,
    currentBattle: null,
    eliminated: [], // Eliminados de la ronda actual (para repechaje)
    allEliminated: [], // Todos los eliminados del torneo
    editMode: false, // Si estamos editando un resultado
    history: JSON.parse(localStorage.getItem('battleHistory') || '[]')
};

// DOM Elements
const elements = {
    // Screens
    registerScreen: document.getElementById('registerScreen'),
    configScreen: document.getElementById('configScreen'),
    bracketScreen: document.getElementById('bracketScreen'),
    resultScreen: document.getElementById('resultScreen'),
    historyScreen: document.getElementById('historyScreen'),
    
    // Register
    mcNameInput: document.getElementById('mcNameInput'),
    addMcBtn: document.getElementById('addMcBtn'),
    mcList: document.getElementById('mcList'),
    mcCount: document.getElementById('mcCount'),
    generateBtn: document.getElementById('generateBtn'),
    
    // Config
    backFromConfig: document.getElementById('backFromConfig'),
    decreasePass: document.getElementById('decreasePass'),
    increasePass: document.getElementById('increasePass'),
    passCount: document.getElementById('passCount'),
    bracketPreview: document.getElementById('bracketPreview'),
    startTournamentBtn: document.getElementById('startTournamentBtn'),
    
    // Bracket
    roundName: document.getElementById('roundName'),
    roundProgress: document.getElementById('roundProgress'),
    bracketView: document.getElementById('bracketView'),
    
    // Battle Modal
    battleModal: document.getElementById('battleModal'),
    battleRoundLabel: document.getElementById('battleRoundLabel'),
    battleTypeLabel: document.getElementById('battleTypeLabel'),
    battleContestants: document.getElementById('battleContestants'),
    triangularOptions: document.getElementById('triangularOptions'),
    pass1Btn: document.getElementById('pass1Btn'),
    pass2Btn: document.getElementById('pass2Btn'),
    
    // Result
    championName: document.getElementById('championName'),
    newTournamentBtn: document.getElementById('newTournamentBtn'),
    
    // History
    historyBtn: document.getElementById('historyBtn'),
    backFromHistory: document.getElementById('backFromHistory'),
    historyList: document.getElementById('historyList'),
    emptyHistory: document.getElementById('emptyHistory')
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function getRoundName(participantsCount) {
    if (participantsCount === 2) return 'FINAL';
    if (participantsCount === 3) return 'FINAL TRIANGULAR';
    if (participantsCount === 4) return 'SEMIFINAL';
    if (participantsCount <= 8) return 'CUARTOS';
    if (participantsCount <= 16) return 'OCTAVOS';
    return `RONDA DE ${participantsCount}`;
}

function getBattleTypeName(size) {
    if (size === 2) return '1v1';
    if (size === 3) return 'TRIANGULAR';
    if (size === 4) return 'CUADRANGULAR';
    return `${size} MCs`;
}

// ========================================
// AUTO-SAVE TOURNAMENT
// ========================================

function saveTournamentProgress() {
    if (!state.tournament) return;
    
    const saveData = {
        tournament: state.tournament,
        currentRound: state.currentRound,
        participants: state.participants,
        passCount: state.passCount,
        eliminated: state.eliminated,
        allEliminated: state.allEliminated,
        savedAt: Date.now()
    };
    
    localStorage.setItem('tournamentInProgress', JSON.stringify(saveData));
}

function loadTournamentProgress() {
    const saved = localStorage.getItem('tournamentInProgress');
    if (!saved) return false;
    
    try {
        const data = JSON.parse(saved);
        
        // Verificar que no sea muy viejo (24 horas)
        const hoursSaved = (Date.now() - data.savedAt) / (1000 * 60 * 60);
        if (hoursSaved > 24) {
            clearTournamentProgress();
            return false;
        }
        
        return data;
    } catch (e) {
        clearTournamentProgress();
        return false;
    }
}

function clearTournamentProgress() {
    localStorage.removeItem('tournamentInProgress');
}

function checkForSavedTournament() {
    const saved = loadTournamentProgress();
    if (saved && saved.tournament) {
        showResumeTournamentModal(saved);
    }
}

function showResumeTournamentModal(savedData) {
    const round = savedData.tournament.rounds[savedData.currentRound];
    const completed = round ? round.battles.filter(b => b.completed).length : 0;
    const total = round ? round.battles.length : 0;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'resumeModal';
    modal.innerHTML = `
        <div class="modal-content battle-card">
            <div class="battle-header">
                <span class="battle-round">💾 TORNEO GUARDADO</span>
            </div>
            <p style="margin-bottom: 8px; font-size: 1.1rem;">
                Encontramos un torneo sin terminar
            </p>
            <div style="margin-bottom: 20px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                <p style="font-size: 0.9rem; color: var(--color-text-muted);">
                    👥 ${savedData.tournament.originalParticipants.length} participantes<br>
                    🏆 ${round ? round.name : 'Configurando'}<br>
                    📊 ${completed}/${total} batallas completadas
                </p>
            </div>
            <div class="triangular-btns" style="flex-direction: column; gap: 10px;">
                <button class="btn-primary" onclick="resumeTournament()" style="width: 100%;">
                    ▶️ Continuar torneo
                </button>
                <button class="btn-secondary" onclick="discardSavedTournament()" style="width: 100%;">
                    🗑️ Descartar y empezar nuevo
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    window.savedTournamentData = savedData;
}

function resumeTournament() {
    const data = window.savedTournamentData;
    
    state.tournament = data.tournament;
    state.currentRound = data.currentRound;
    state.participants = data.participants;
    state.passCount = data.passCount;
    state.eliminated = data.eliminated || [];
    state.allEliminated = data.allEliminated || [];
    
    closeResumeModal();
    showScreen('bracketScreen');
    renderBracket();
}

function discardSavedTournament() {
    clearTournamentProgress();
    closeResumeModal();
    window.savedTournamentData = null;
}

function closeResumeModal() {
    const modal = document.getElementById('resumeModal');
    if (modal) modal.remove();
}


// ========================================
// PARTICIPANT MANAGEMENT
// ========================================

function addParticipant() {
    const name = elements.mcNameInput.value.trim();
    if (!name) return;
    
    // Check for duplicates
    if (state.participants.some(p => p.toLowerCase() === name.toLowerCase())) {
        elements.mcNameInput.classList.add('error');
        setTimeout(() => elements.mcNameInput.classList.remove('error'), 500);
        return;
    }
    
    state.participants.push(name);
    elements.mcNameInput.value = '';
    elements.mcNameInput.focus();
    
    renderParticipants();
    updateGenerateButton();
}

function removeParticipant(index) {
    state.participants.splice(index, 1);
    renderParticipants();
    updateGenerateButton();
}

function renderParticipants() {
    elements.mcList.innerHTML = state.participants.map((name, index) => {
        const initial = name.charAt(0).toUpperCase();
        return `
            <div class="mc-item">
                <div class="mc-avatar">${initial}</div>
                <span class="mc-name">${escapeHtml(name)}</span>
                <span class="mc-number">#${index + 1}</span>
                <button class="remove-btn" onclick="removeParticipant(${index})">×</button>
            </div>
        `;
    }).join('');
    
    elements.mcCount.textContent = state.participants.length;
}

function updateGenerateButton() {
    elements.generateBtn.disabled = state.participants.length < 2;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// BRACKET GENERATION - NUEVO ALGORITMO
// ========================================

/**
 * Genera batallas para que TODOS los participantes compitan
 * y pasen exactamente 'passCount' ganadores
 * 
 * REGLA PRINCIPAL: Todos deben competir en cada ronda
 * 
 * @param {string[]} participants - Lista de participantes
 * @param {number} passCount - Cuántos deben pasar a la siguiente ronda
 * @returns {Object[]} - Array de batallas
 */
function generateBrackets(participants, passCount) {
    const shuffled = shuffleArray(participants);
    const n = shuffled.length;
    
    if (passCount <= 0 || passCount >= n) {
        return [];
    }
    
    // Calcular distribución que incluya a TODOS
    const battlePlan = calculateAllParticipantsPlan(n, passCount);
    
    if (!battlePlan || battlePlan.length === 0) {
        return [];
    }
    
    // Crear batallas según el plan
    let index = 0;
    const battles = [];
    
    battlePlan.forEach(battleConfig => {
        const contestants = shuffled.slice(index, index + battleConfig.size);
        index += battleConfig.size;
        
        battles.push({
            type: getBattleTypeName(battleConfig.size),
            size: battleConfig.size,
            contestants: contestants,
            winners: [],
            winnersNeeded: battleConfig.winnersNeeded,
            completed: false
        });
    });
    
    return battles;
}

/**
 * Calcula un plan donde TODOS los participantes compitan
 * 
 * Estrategia:
 * 1. Primero intentar batallas uniformes (todos 1v1 o todos triangulares)
 * 2. Si no es posible, mezclar tipos para que todos participen
 * 3. Ajustar winnersNeeded para llegar al passCount deseado
 */
function calculateAllParticipantsPlan(n, passCount) {
    // Calcular cuántos se eliminan
    const toEliminate = n - passCount;
    
    // CASO 1: Se puede hacer todo con 1v1 (n es par y toEliminate = n/2)
    if (n % 2 === 0 && toEliminate === n / 2) {
        return createUniformPlan(n, 2, 1);
    }
    
    // CASO 2: Se puede hacer todo con triangulares donde pasa 1 (n divisible por 3)
    if (n % 3 === 0 && passCount === n / 3) {
        return createUniformPlan(n, 3, 1);
    }
    
    // CASO 3: Se puede hacer todo con triangulares donde pasan 2
    if (n % 3 === 0 && passCount === (n / 3) * 2) {
        return createUniformPlan(n, 3, 2);
    }
    
    // CASO 4: Se puede hacer todo con cuadrangulares donde pasa 1 (n divisible por 4)
    if (n % 4 === 0 && passCount === n / 4) {
        return createUniformPlan(n, 4, 1);
    }
    
    // CASO 5: Se puede hacer todo con cuadrangulares donde pasan 2
    if (n % 4 === 0 && passCount === (n / 4) * 2) {
        return createUniformPlan(n, 4, 2);
    }
    
    // CASO GENERAL: Mezclar tipos para incluir a todos
    return calculateMixedPlan(n, passCount);
}

/**
 * Plan mixto que garantiza que todos participen
 * Usa combinación de 1v1, triangulares y cuadrangulares
 */
function calculateMixedPlan(n, passCount) {
    // Probar combinaciones de batallas de 2, 3 y 4 personas
    // Priorizar batallas más grandes para torneos grandes (filtrar más rápido)
    
    const battleTypes = [
        { size: 4, winners: [1, 2, 3] }, // Cuadrangular: pasa 1, 2 o 3
        { size: 3, winners: [1, 2] },    // Triangular: pasa 1 o 2
        { size: 2, winners: [1] }        // 1v1: pasa 1
    ];
    
    // Para torneos grandes (15+), priorizar cuadrangulares
    if (n >= 15) {
        const quadPlan = tryWithQuadrangular(n, passCount);
        if (quadPlan) return quadPlan;
    }
    
    // Probar combinación de 2 y 3
    for (let triangularWinners = 1; triangularWinners <= 2; triangularWinners++) {
        for (let numTriangular = 0; numTriangular <= Math.floor(n / 3); numTriangular++) {
            const remaining = n - (numTriangular * 3);
            
            if (remaining >= 0 && remaining % 2 === 0) {
                const num1v1 = remaining / 2;
                const totalWinners = num1v1 + (numTriangular * triangularWinners);
                
                if (totalWinners === passCount) {
                    const plan = [];
                    for (let i = 0; i < num1v1; i++) {
                        plan.push({ size: 2, winnersNeeded: 1 });
                    }
                    for (let i = 0; i < numTriangular; i++) {
                        plan.push({ size: 3, winnersNeeded: triangularWinners });
                    }
                    return plan;
                }
            }
        }
    }
    
    // Si no hay combinación exacta, usar aproximación flexible
    return calculateFlexiblePlan(n, passCount);
}

/**
 * Intenta crear un plan con cuadrangulares para filtrar rápido
 */
function tryWithQuadrangular(n, passCount) {
    // Probar: solo cuadrangulares donde pasa 1 (n divisible por 4)
    if (n % 4 === 0 && passCount === n / 4) {
        return createUniformPlan(n, 4, 1);
    }
    
    // Probar: solo cuadrangulares donde pasan 2 (n divisible por 4)
    if (n % 4 === 0 && passCount === (n / 4) * 2) {
        return createUniformPlan(n, 4, 2);
    }
    
    // Probar combinación cuadrangular + triangular + 1v1
    for (let quadWinners = 1; quadWinners <= 2; quadWinners++) {
        for (let numQuad = 1; numQuad <= Math.floor(n / 4); numQuad++) {
            const afterQuad = n - (numQuad * 4);
            const winnersFromQuad = numQuad * quadWinners;
            const remainingWinners = passCount - winnersFromQuad;
            
            if (afterQuad >= 0 && remainingWinners >= 0) {
                // Intentar completar con triangulares y 1v1
                for (let triWinners = 1; triWinners <= 2; triWinners++) {
                    for (let numTri = 0; numTri <= Math.floor(afterQuad / 3); numTri++) {
                        const afterTri = afterQuad - (numTri * 3);
                        
                        if (afterTri >= 0 && afterTri % 2 === 0) {
                            const num1v1 = afterTri / 2;
                            const totalWinners = winnersFromQuad + (numTri * triWinners) + num1v1;
                            
                            if (totalWinners === passCount) {
                                const plan = [];
                                for (let i = 0; i < numQuad; i++) {
                                    plan.push({ size: 4, winnersNeeded: quadWinners });
                                }
                                for (let i = 0; i < numTri; i++) {
                                    plan.push({ size: 3, winnersNeeded: triWinners });
                                }
                                for (let i = 0; i < num1v1; i++) {
                                    plan.push({ size: 2, winnersNeeded: 1 });
                                }
                                return plan;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * Plan flexible como fallback
 * Intenta incluir a todos aunque no sea perfecto matemáticamente
 * Prioriza batallas grandes para filtrar rápido
 */
function calculateFlexiblePlan(n, passCount) {
    const plan = [];
    let remaining = n;
    let winnersNeeded = passCount;
    
    while (remaining > 0) {
        let size, winners;
        
        if (remaining === 2) {
            size = 2;
            winners = Math.min(1, winnersNeeded);
        } else if (remaining === 3) {
            size = 3;
            winners = Math.min(2, winnersNeeded);
        } else if (remaining === 4) {
            size = 4;
            winners = Math.min(2, winnersNeeded);
        } else if (remaining >= 4 && winnersNeeded <= remaining / 3) {
            // Muchos por eliminar -> usar cuadrangular donde pasa 1
            size = 4;
            winners = 1;
        } else if (remaining >= 4 && winnersNeeded >= 2) {
            // Usar cuadrangular donde pasan 2
            size = 4;
            winners = Math.min(2, winnersNeeded);
        } else if (remaining >= 3 && winnersNeeded >= 1) {
            size = 3;
            winners = Math.min(2, winnersNeeded);
        } else if (remaining >= 2) {
            size = 2;
            winners = Math.min(1, winnersNeeded);
        } else {
            // Solo queda 1 persona -> pasa directo (bye)
            break;
        }
        
        plan.push({ size, winnersNeeded: winners });
        remaining -= size;
        winnersNeeded -= winners;
    }
    
    return plan;
}

/**
 * Plan uniforme cuando todas las batallas son iguales
 */
function createUniformPlan(n, size, winners) {
    const count = n / size;
    const plan = [];
    for (let i = 0; i < count; i++) {
        plan.push({ size, winnersNeeded: winners });
    }
    return plan;
}

/**
 * Calcula los valores válidos de passCount para n participantes
 * donde TODOS compiten
 */
function getValidPassCounts(n) {
    const valid = [];
    
    for (let p = 1; p < n; p++) {
        // Verificar si existe una combinación válida
        const plan = calculateAllParticipantsPlan(n, p);
        if (plan && plan.length > 0) {
            // Verificar que todos participen
            const totalParticipants = plan.reduce((sum, b) => sum + b.size, 0);
            if (totalParticipants === n) {
                valid.push(p);
            }
        }
    }
    
    return valid;
}

// ========================================
// CONFIG SCREEN
// ========================================

function initConfigScreen() {
    const n = state.participants.length;
    // Default: la mitad (redondeado hacia arriba para números impares)
    // Pero asegurar que esté dentro de límites válidos
    state.passCount = Math.min(Math.ceil(n / 2), n - 1);
    state.passCount = Math.max(state.passCount, 1);
    updatePassCountDisplay();
}

function updatePassCount(delta) {
    const n = state.participants.length;
    const newCount = state.passCount + delta;
    
    // Límites estrictos: mínimo 1, máximo n-1 (alguien debe ser eliminado)
    if (newCount >= 1 && newCount < n) {
        state.passCount = newCount;
        updatePassCountDisplay();
    }
}

function updatePassCountDisplay() {
    const n = state.participants.length;
    
    // Forzar límites por seguridad
    state.passCount = Math.min(state.passCount, n - 1);
    state.passCount = Math.max(state.passCount, 1);
    
    elements.passCount.textContent = state.passCount;
    
    // Deshabilitar botones si se llega al límite
    elements.decreasePass.disabled = state.passCount <= 1;
    elements.increasePass.disabled = state.passCount >= n - 1;
    
    // Mostrar rango válido
    elements.decreasePass.style.opacity = state.passCount <= 1 ? '0.3' : '1';
    elements.increasePass.style.opacity = state.passCount >= n - 1 ? '0.3' : '1';
    
    previewBrackets();
}

function previewBrackets() {
    const preview = generateBrackets(state.participants, state.passCount);
    
    // Guardar los cruces para usarlos al iniciar el torneo
    state.previewBattles = preview;
    
    if (preview.length === 0) {
        elements.bracketPreview.innerHTML = '<p style="text-align:center;color:var(--color-text-muted)">Sin batallas (todos pasan)</p>';
        return;
    }
    
    elements.bracketPreview.innerHTML = preview.map(battle => {
        const isSpecial = battle.size > 2;
        const typeClass = isSpecial ? 'triangular' : '';
        
        return `
            <div class="preview-battle ${typeClass}">
                ${battle.contestants.map((c, i) => `
                    <span class="mc">${escapeHtml(c)}</span>
                    ${i < battle.contestants.length - 1 ? '<span class="vs">VS</span>' : ''}
                `).join('')}
                <span class="pass-info">${battle.winnersNeeded} ${battle.winnersNeeded === 1 ? 'pasa' : 'pasan'}</span>
            </div>
        `;
    }).join('');
    
    // Verificar si todos participan
    const totalInBattles = preview.reduce((sum, b) => sum + b.size, 0);
    const notParticipating = state.participants.length - totalInBattles;
    
    if (notParticipating > 0) {
        elements.bracketPreview.innerHTML += `
            <div class="preview-warning">
                ⚠️ ${notParticipating} MC${notParticipating > 1 ? 's' : ''} sin batalla. 
                Ajustá el número que pasan.
            </div>
        `;
    }
}

/**
 * Regenera los cruces con un nuevo sorteo aleatorio
 */
function reshuffleBrackets() {
    previewBrackets();
}

// ========================================
// TOURNAMENT FLOW
// ========================================

function startTournament() {
    state.tournament = {
        originalParticipants: [...state.participants],
        rounds: [],
        currentRoundIndex: 0,
        startTime: new Date().toISOString()
    };
    
    // Usar los cruces del preview (ya definidos)
    // Si no hay preview, generar nuevos (fallback)
    const battles = state.previewBattles && state.previewBattles.length > 0 
        ? state.previewBattles 
        : generateBrackets(state.participants, state.passCount);
    
    // Primera ronda
    const firstRound = {
        name: getRoundName(state.participants.length),
        battles: battles,
        participants: [...state.participants],
        passCount: state.passCount
    };
    
    state.tournament.rounds.push(firstRound);
    state.currentRound = 0;
    state.previewBattles = null; // Limpiar preview
    
    showScreen('bracketScreen');
    renderBracket();
}

function renderBracket() {
    const round = state.tournament.rounds[state.currentRound];
    
    elements.roundName.textContent = round.name;
    
    const completed = round.battles.filter(b => b.completed).length;
    elements.roundProgress.textContent = `${completed}/${round.battles.length}`;
    
    elements.bracketView.innerHTML = round.battles.map((battle, index) => {
        const statusClass = battle.completed ? 'completed' : 
                           (index === round.battles.findIndex(b => !b.completed) ? 'active' : 'pending');
        const statusText = battle.completed ? 'done' : 
                          (statusClass === 'active' ? 'live' : 'pending');
        const statusLabel = battle.completed ? '✓' : 
                           (statusClass === 'active' ? 'LIVE' : 'PENDIENTE');
        
        // Clases adicionales
        const wildcardClass = battle.isWildcard ? 'wildcard' : '';
        
        return `
            <div class="bracket-battle ${statusClass} ${wildcardClass}" 
                 onclick="${battle.completed ? `editBattleResult(${index})` : `openBattle(${index})`}">
                <div class="contestants">
                    ${battle.contestants.map((c, i) => `
                        <div class="contestant ${battle.winners.includes(c) ? 'winner' : ''} ${battle.retired === c ? 'retired' : ''}">
                            ${escapeHtml(c)}
                        </div>
                        ${i < battle.contestants.length - 1 ? '<div class="battle-vs">VS</div>' : ''}
                    `).join('')}
                </div>
                <div class="battle-meta">
                    <span class="battle-type-tag">${battle.isWildcard ? '🎲 REPECHAJE' : battle.type}</span>
                    <span class="battle-status ${statusText}">${statusLabel}</span>
                    ${battle.completed ? '<span class="edit-hint">✏️</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

function openBattle(index) {
    const round = state.tournament.rounds[state.currentRound];
    const battle = round.battles[index];
    
    if (battle.completed && !state.editMode) return;
    
    state.currentBattle = { roundIndex: state.currentRound, battleIndex: index };
    
    // Setup modal
    elements.battleRoundLabel.textContent = battle.isWildcard ? '🎲 REPECHAJE' : `Batalla ${index + 1}`;
    elements.battleTypeLabel.textContent = battle.type;
    elements.battleTypeLabel.className = `battle-type ${battle.size > 2 ? 'triangular' : ''}`;
    
    // Render contestants
    elements.battleContestants.innerHTML = battle.contestants.map((c, i) => `
        <div class="battle-contestant ${battle.retired === c ? 'retired' : ''}" data-index="${i}" onclick="selectWinner(${i})">
            ${escapeHtml(c)}
        </div>
        ${i < battle.contestants.length - 1 ? '<div class="battle-vs">VS</div>' : ''}
    `).join('');
    
    // Opciones para batallas con múltiples posibles ganadores
    if (battle.size > 2) {
        elements.triangularOptions.classList.remove('hidden');
        updateTriangularButtons(battle);
        selectedWinners = [];
    } else {
        // Para 1v1 también mostrar opciones de reemplazo y retiro
        elements.triangularOptions.classList.remove('hidden');
        elements.triangularOptions.innerHTML = `
            <div class="battle-actions">
                <button class="battle-action-btn" onclick="showReplaceOptions(${index})">
                    🔄 Reemplazar
                </button>
                <button class="battle-action-btn danger" onclick="showRetireOptions(${index})">
                    ⚠️ Retiro
                </button>
            </div>
        `;
    }
    
    elements.battleModal.classList.add('active');
}

function updateTriangularButtons(battle) {
    const container = elements.triangularOptions;
    const battleIndex = state.currentBattle.battleIndex;
    
    container.innerHTML = `
        <p>Seleccioná ${battle.winnersNeeded} ganador${battle.winnersNeeded > 1 ? 'es' : ''}</p>
        <div class="triangular-btns">
            <button id="confirmWinnersBtn" class="btn-secondary" onclick="confirmWinners()">
                Confirmar selección
            </button>
        </div>
        <div class="battle-actions">
            <button class="battle-action-btn" onclick="showReplaceOptions(${battleIndex})">
                🔄 Reemplazar
            </button>
            <button class="battle-action-btn danger" onclick="showRetireOptions(${battleIndex})">
                ⚠️ Retiro
            </button>
        </div>
    `;
}

function showRetireOptions(battleIndex) {
    const round = state.tournament.rounds[state.currentRound];
    const battle = round.battles[battleIndex];
    
    const menu = document.createElement('div');
    menu.className = 'modal active';
    menu.id = 'retireModal';
    menu.innerHTML = `
        <div class="modal-content battle-card" style="max-width: 320px;">
            <div class="battle-header">
                <span class="battle-round">⚠️ RETIRO</span>
            </div>
            <p style="margin-bottom: 16px; color: var(--color-text-muted);">
                ¿Quién se retira de la batalla?
            </p>
            <div class="menu-options">
                ${battle.contestants.map((c, i) => `
                    <button class="menu-option" onclick="confirmRetire(${battleIndex}, '${escapeHtml(c).replace(/'/g, "\\'")}')">
                        ${escapeHtml(c)}
                    </button>
                `).join('')}
                <button class="menu-option cancel" onclick="closeRetireModal()">
                    ✕ Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(menu);
}

function closeRetireModal() {
    const modal = document.getElementById('retireModal');
    if (modal) modal.remove();
}

function confirmRetire(battleIndex, competitorName) {
    closeRetireModal();
    closeBattleModal();
    retireCompetitor(battleIndex, competitorName);
}

/**
 * Muestra modal para seleccionar quién reemplazar
 */
function showReplaceOptions(battleIndex) {
    const round = state.tournament.rounds[state.currentRound];
    const battle = round.battles[battleIndex];
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'replaceModal';
    modal.innerHTML = `
        <div class="modal-content battle-card">
            <div class="battle-header">
                <span class="battle-round">🔄 REEMPLAZAR</span>
            </div>
            <p style="margin-bottom: 16px; color: var(--color-text-muted);">
                ¿A quién querés reemplazar?
            </p>
            <div class="menu-options">
                ${battle.contestants.map((c, i) => `
                    <button class="menu-option" onclick="showReplaceInput(${battleIndex}, '${escapeHtml(c).replace(/'/g, "\\'")}')">
                        ${escapeHtml(c)}
                    </button>
                `).join('')}
                <button class="menu-option cancel" onclick="closeReplaceModal()">
                    ✕ Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeReplaceModal() {
    const modal = document.getElementById('replaceModal');
    if (modal) modal.remove();
}

/**
 * Muestra input para escribir el nuevo nombre
 */
function showReplaceInput(battleIndex, oldName) {
    closeReplaceModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'replaceInputModal';
    modal.innerHTML = `
        <div class="modal-content battle-card">
            <div class="battle-header">
                <span class="battle-round">🔄 REEMPLAZAR</span>
            </div>
            <p style="margin-bottom: 8px;">
                Reemplazando a: <strong>${escapeHtml(oldName)}</strong>
            </p>
            <div class="input-group" style="margin: 16px 0;">
                <input type="text" id="newCompetitorName" placeholder="Nombre del nuevo MC..." autocomplete="off" autofocus>
            </div>
            <div class="triangular-btns" style="flex-direction: column; gap: 10px;">
                <button class="btn-primary" onclick="confirmReplace(${battleIndex}, '${escapeHtml(oldName).replace(/'/g, "\\'")}')">
                    ✓ Confirmar reemplazo
                </button>
                <button class="btn-secondary" onclick="closeReplaceInputModal()">
                    ✕ Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus en el input
    setTimeout(() => {
        const input = document.getElementById('newCompetitorName');
        if (input) input.focus();
    }, 100);
    
    // Enter para confirmar
    const input = document.getElementById('newCompetitorName');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmReplace(battleIndex, oldName);
            }
        });
    }
}

function closeReplaceInputModal() {
    const modal = document.getElementById('replaceInputModal');
    if (modal) modal.remove();
}

function confirmReplace(battleIndex, oldName) {
    const input = document.getElementById('newCompetitorName');
    const newName = input ? input.value.trim() : '';
    
    if (!newName) {
        alert('Ingresá el nombre del nuevo MC');
        return;
    }
    
    closeReplaceInputModal();
    closeBattleModal();
    
    // Hacer el reemplazo
    const round = state.tournament.rounds[state.currentRound];
    const battle = round.battles[battleIndex];
    const idx = battle.contestants.indexOf(oldName);
    
    if (idx !== -1) {
        battle.contestants[idx] = newName;
    }
    
    renderBracket();
    saveTournamentProgress();
}

let selectedWinners = [];

function selectWinner(contestantIndex) {
    const round = state.tournament.rounds[state.currentBattle.roundIndex];
    const battle = round.battles[state.currentBattle.battleIndex];
    const contestant = battle.contestants[contestantIndex];
    
    if (battle.size === 2) {
        // 1v1: pedir confirmación
        showWinnerConfirmation(contestant, () => {
            battle.winners = [contestant];
            battle.completed = true;
            
            // Agregar perdedor a eliminados
            const loser = battle.contestants.find(c => c !== contestant);
            if (loser && !state.eliminated.includes(loser)) {
                state.eliminated.push(loser);
                state.allEliminated.push(loser);
            }
            
            closeBattleModal();
            checkRoundComplete();
        });
    } else {
        // Multi: selección múltiple
        const allContestantDivs = elements.battleContestants.querySelectorAll('.battle-contestant');
        const clickedDiv = allContestantDivs[contestantIndex];
        
        if (selectedWinners.includes(contestantIndex)) {
            // Deseleccionar
            selectedWinners = selectedWinners.filter(i => i !== contestantIndex);
            clickedDiv.classList.remove('selected');
        } else {
            // Seleccionar (máximo winnersNeeded)
            if (selectedWinners.length < battle.winnersNeeded) {
                selectedWinners.push(contestantIndex);
                clickedDiv.classList.add('selected');
            } else {
                // Ya hay suficientes, quitar el primero y agregar este
                const removed = selectedWinners.shift();
                allContestantDivs[removed].classList.remove('selected');
                selectedWinners.push(contestantIndex);
                clickedDiv.classList.add('selected');
            }
        }
    }
}

function showWinnerConfirmation(winnerName, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'confirmWinnerModal';
    modal.innerHTML = `
        <div class="modal-content battle-card" style="max-width: 320px;">
            <div class="battle-header">
                <span class="battle-round">🏆 CONFIRMAR</span>
            </div>
            <p style="margin-bottom: 20px; text-align: center; font-size: 1.2rem;">
                ¿<strong>${escapeHtml(winnerName)}</strong> gana la batalla?
            </p>
            <div class="triangular-btns" style="flex-direction: column; gap: 10px;">
                <button class="btn-primary" id="confirmWinnerYes" style="width: 100%;">
                    ✓ Sí, confirmar
                </button>
                <button class="btn-secondary" id="confirmWinnerNo" style="width: 100%;">
                    ✕ Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('confirmWinnerYes').onclick = () => {
        closeConfirmWinnerModal();
        onConfirm();
    };
    
    document.getElementById('confirmWinnerNo').onclick = () => {
        closeConfirmWinnerModal();
    };
}

function closeConfirmWinnerModal() {
    const modal = document.getElementById('confirmWinnerModal');
    if (modal) modal.remove();
}

function confirmWinners() {
    const round = state.tournament.rounds[state.currentBattle.roundIndex];
    const battle = round.battles[state.currentBattle.battleIndex];
    
    if (selectedWinners.length !== battle.winnersNeeded) {
        alert(`Seleccioná ${battle.winnersNeeded} ganador${battle.winnersNeeded > 1 ? 'es' : ''}`);
        return;
    }
    
    battle.winners = selectedWinners.map(i => battle.contestants[i]);
    battle.completed = true;
    selectedWinners = [];
    
    closeBattleModal();
    checkRoundComplete();
}

function closeBattleModal() {
    elements.battleModal.classList.remove('active');
    state.currentBattle = null;
    state.editMode = false;
    selectedWinners = [];
    renderBracket();
    saveTournamentProgress(); // Auto-guardar progreso
}

function checkRoundComplete() {
    const round = state.tournament.rounds[state.currentRound];
    const allCompleted = round.battles.every(b => b.completed);
    
    if (!allCompleted) {
        renderBracket();
        return;
    }
    
    // Collect all winners
    const winners = [];
    round.battles.forEach(b => {
        winners.push(...b.winners);
    });
    
    // Collect eliminados de esta ronda
    round.battles.forEach(b => {
        b.contestants.forEach(c => {
            if (!b.winners.includes(c) && !state.eliminated.includes(c)) {
                state.eliminated.push(c);
                state.allEliminated.push(c);
            }
        });
    });
    
    // Check if we have a champion
    if (winners.length === 1) {
        showChampion(winners[0]);
        return;
    }
    
    // Ofrecer repechaje si hay eliminados
    if (state.eliminated.length >= 2) {
        showWildcardPrompt(winners);
    } else {
        showNextRoundConfig(winners);
    }
}

function showWildcardPrompt(winners) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'wildcardPromptModal';
    modal.innerHTML = `
        <div class="modal-content battle-card">
            <div class="battle-header">
                <span class="battle-round">🎲 REPECHAJE</span>
            </div>
            <p style="margin-bottom: 8px; font-size: 1.1rem;">
                Ronda completada
            </p>
            <p style="margin-bottom: 20px; color: var(--color-text-muted);">
                Hay ${state.eliminated.length} eliminados. ¿Querés hacer repechaje antes de la siguiente ronda?
            </p>
            <div class="eliminated-preview" style="margin-bottom: 20px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px;">Eliminados:</p>
                <p style="font-size: 0.9rem;">${state.eliminated.map(e => escapeHtml(e)).join(', ')}</p>
            </div>
            <div class="triangular-btns" style="flex-direction: column; gap: 10px;">
                <button class="btn-primary" onclick="acceptWildcardPrompt()" style="width: 100%;">
                    🎲 Sí, hacer repechaje
                </button>
                <button class="btn-secondary" onclick="skipWildcardPrompt()" style="width: 100%;">
                    No, continuar sin repechaje
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Guardar winners para después
    window.pendingWinners = winners;
}

function acceptWildcardPrompt() {
    closeWildcardPromptModal();
    showWildcardModal(1); // Por defecto 1 lugar de repechaje
}

function skipWildcardPrompt() {
    closeWildcardPromptModal();
    showNextRoundConfig(window.pendingWinners);
    window.pendingWinners = null;
}

function closeWildcardPromptModal() {
    const modal = document.getElementById('wildcardPromptModal');
    if (modal) modal.remove();
}

/**
 * Volver atrás desde el bracket
 */
function goBackFromBracket() {
    // Si estamos en la primera ronda, volver a config con los participantes originales
    if (state.currentRound === 0) {
        if (confirm('¿Volver atrás? Se perderá el progreso de esta ronda.')) {
            state.participants = [...state.tournament.originalParticipants];
            state.eliminated = [];
            state.tournament = null;
            showScreen('configScreen');
            initConfigScreen();
        }
    } else {
        // En rondas posteriores, volver a la config de esta ronda
        if (confirm('¿Volver a la configuración de esta ronda?')) {
            // Volver a la pantalla de config con los participantes de esta ronda
            const round = state.tournament.rounds[state.currentRound];
            state.participants = round.participants;
            state.passCount = round.passCount;
            // Eliminar esta ronda del torneo
            state.tournament.rounds.pop();
            state.currentRound--;
            state.eliminated = [];
            showScreen('configScreen');
            initConfigScreen();
        }
    }
}

function showNextRoundConfig(winners) {
    // Guardar los ganadores para la siguiente ronda
    state.nextRoundParticipants = winners;
    
    // Limpiar eliminados de la ronda anterior (ya pasaron o no al repechaje)
    state.eliminated = [];
    
    // Cambiar a pantalla de config pero con los ganadores
    state.participants = winners;
    state.passCount = Math.ceil(winners.length / 2);
    
    showScreen('configScreen');
    initConfigScreen();
}

function startNextRound() {
    const round = {
        name: getRoundName(state.participants.length),
        battles: generateBrackets(state.participants, state.passCount),
        participants: [...state.participants],
        passCount: state.passCount
    };
    
    state.tournament.rounds.push(round);
    state.currentRound++;
    
    showScreen('bracketScreen');
    renderBracket();
}

function showChampion(champion) {
    elements.championName.textContent = champion;
    
    // Save to history
    const historyEntry = {
        id: Date.now(),
        champion: champion,
        participants: state.tournament.originalParticipants,
        date: new Date().toLocaleDateString('es-AR'),
        rounds: state.tournament.rounds.length
    };
    
    state.history.unshift(historyEntry);
    localStorage.setItem('battleHistory', JSON.stringify(state.history));
    
    // Limpiar torneo guardado (ya terminó)
    clearTournamentProgress();
    
    showScreen('resultScreen');
}

function resetTournament() {
    state.participants = [];
    state.tournament = null;
    state.currentRound = 0;
    state.currentBattle = null;
    state.passCount = 2;
    state.nextRoundParticipants = null;
    
    renderParticipants();
    updateGenerateButton();
    showScreen('registerScreen');
}

// ========================================
// HISTORY
// ========================================

function renderHistory() {
    if (state.history.length === 0) {
        elements.historyList.innerHTML = '';
        elements.emptyHistory.style.display = 'block';
        return;
    }
    
    elements.emptyHistory.style.display = 'none';
    elements.historyList.innerHTML = state.history.map(entry => `
        <div class="history-item">
            <div class="winner-info">
                <span class="trophy-small">🏆</span>
                <div>
                    <div class="winner-name">${escapeHtml(entry.champion)}</div>
                    <div class="participants-count">${entry.participants.length} participantes · ${entry.rounds} rondas</div>
                </div>
            </div>
            <span class="date">${entry.date}</span>
        </div>
    `).join('');
}

// ========================================
// ADVANCED TOURNAMENT MANAGEMENT
// ========================================

/**
 * Retira un competidor de una batalla (bye automático para el rival)
 */
function retireCompetitor(battleIndex, competitorName) {
    const round = state.tournament.rounds[state.currentRound];
    const battle = round.battles[battleIndex];
    
    if (battle.completed) {
        alert('Esta batalla ya terminó');
        return;
    }
    
    // Marcar como retirado
    battle.retired = competitorName;
    
    // Los demás ganan automáticamente
    battle.winners = battle.contestants.filter(c => c !== competitorName);
    battle.completed = true;
    
    // Agregar a eliminados
    state.eliminated.push(competitorName);
    state.allEliminated.push(competitorName);
    
    closeBattleModal();
    checkRoundComplete();
}

/**
 * Reemplaza un competidor por otro en una batalla
 */
function replaceCompetitor(battleIndex, oldName, newName) {
    const round = state.tournament.rounds[state.currentRound];
    const battle = round.battles[battleIndex];
    
    if (battle.completed) {
        alert('No se puede editar una batalla terminada');
        return;
    }
    
    const idx = battle.contestants.indexOf(oldName);
    if (idx !== -1) {
        battle.contestants[idx] = newName;
    }
    
    renderBracket();
}

/**
 * Edita el resultado de una batalla completada
 */
function editBattleResult(battleIndex) {
    const round = state.tournament.rounds[state.currentRound];
    const battle = round.battles[battleIndex];
    
    if (!battle.completed) {
        // Si no está completada, simplemente abrir
        openBattle(battleIndex);
        return;
    }
    
    // Advertir si hay rondas posteriores
    if (state.tournament.rounds.length > state.currentRound + 1) {
        if (!confirm('⚠️ Editar este resultado podría afectar las siguientes rondas. ¿Continuar?')) {
            return;
        }
    }
    
    // Reabrir para editar
    state.editMode = true;
    battle.completed = false;
    battle.winners = [];
    
    // Quitar de eliminados si aplica
    battle.contestants.forEach(c => {
        state.eliminated = state.eliminated.filter(e => e !== c);
    });
    
    openBattle(battleIndex);
}

/**
 * Agrega MCs tarde al torneo en curso
 */
function addLateCompetitors(names) {
    const round = state.tournament.rounds[state.currentRound];
    
    if (names.length === 1) {
        // Agregar a batalla existente (1v1 → triangular)
        const pendingBattles = round.battles.filter(b => !b.completed);
        if (pendingBattles.length === 0) {
            alert('No hay batallas pendientes para agregar competidor');
            return;
        }
        
        // Agregar a la primera batalla pendiente
        const battle = pendingBattles[0];
        battle.contestants.push(names[0]);
        battle.size = battle.contestants.length;
        battle.type = getBattleTypeName(battle.size);
        battle.winnersNeeded = Math.min(battle.winnersNeeded + 1, battle.size - 1);
        
    } else {
        // Crear nueva batalla
        const newBattle = {
            type: getBattleTypeName(names.length),
            size: names.length,
            contestants: names,
            winners: [],
            winnersNeeded: Math.ceil(names.length / 2),
            completed: false
        };
        round.battles.push(newBattle);
    }
    
    renderBracket();
}

/**
 * Crea repechaje con eliminados
 */
function createWildcard(count) {
    if (state.eliminated.length < 2) {
        alert('No hay suficientes eliminados para repechaje');
        return;
    }
    
    // Mostrar modal para seleccionar eliminados
    showWildcardModal(count);
}

function showWildcardModal(spotsAvailable) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'wildcardModal';
    modal.innerHTML = `
        <div class="modal-content battle-card">
            <div class="battle-header">
                <span class="battle-round">🎲 REPECHAJE</span>
                <span class="battle-type">${spotsAvailable} lugar${spotsAvailable > 1 ? 'es' : ''}</span>
            </div>
            <p style="margin-bottom: 16px; color: var(--color-text-muted);">
                Seleccioná los eliminados que pelearán por volver:
            </p>
            <div class="wildcard-list">
                ${state.eliminated.map((name, i) => `
                    <label class="wildcard-option">
                        <input type="checkbox" value="${i}" class="wildcard-checkbox">
                        <span>${escapeHtml(name)}</span>
                    </label>
                `).join('')}
            </div>
            <div class="triangular-btns" style="margin-top: 20px;">
                <button class="btn-secondary" onclick="closeWildcardModal()">Cancelar</button>
                <button class="btn-primary" onclick="confirmWildcard(${spotsAvailable})" style="padding: 14px 24px;">
                    Crear Repechaje
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeWildcardModal() {
    const modal = document.getElementById('wildcardModal');
    if (modal) modal.remove();
}

function confirmWildcard(spotsAvailable) {
    const checkboxes = document.querySelectorAll('.wildcard-checkbox:checked');
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (selectedIndices.length < 2) {
        alert('Seleccioná al menos 2 competidores');
        return;
    }
    
    const selectedNames = selectedIndices.map(i => state.eliminated[i]);
    
    // Eliminar de la lista de eliminados
    selectedNames.forEach(name => {
        state.eliminated = state.eliminated.filter(e => e !== name);
    });
    
    // Crear batalla de repechaje
    const round = state.tournament.rounds[state.currentRound];
    const wildcardBattle = {
        type: getBattleTypeName(selectedNames.length),
        size: selectedNames.length,
        contestants: selectedNames,
        winners: [],
        winnersNeeded: spotsAvailable,
        completed: false,
        isWildcard: true
    };
    round.battles.push(wildcardBattle);
    
    closeWildcardModal();
    renderBracket();
}

/**
 * Exporta resultados como texto
 */
function exportResults() {
    if (!state.tournament) {
        alert('No hay torneo para exportar');
        return;
    }
    
    let text = `🎤 FREESTYLE BATTLE BRACKET\n`;
    text += `${'='.repeat(30)}\n\n`;
    
    // Campeón si hay
    const lastRound = state.tournament.rounds[state.tournament.rounds.length - 1];
    const champion = lastRound.battles.every(b => b.completed) ? 
        lastRound.battles.flatMap(b => b.winners)[0] : null;
    
    if (champion) {
        text += `🏆 CAMPEÓN: ${champion}\n\n`;
    }
    
    text += `📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n`;
    text += `👥 Participantes: ${state.tournament.originalParticipants.length}\n\n`;
    
    // Bracket
    state.tournament.rounds.forEach((round, i) => {
        text += `\n--- ${round.name} ---\n`;
        round.battles.forEach((battle, j) => {
            const vs = battle.contestants.join(' vs ');
            const result = battle.completed ? 
                `→ ${battle.winners.join(', ')}` : '(pendiente)';
            text += `${j + 1}. ${vs} ${result}\n`;
        });
    });
    
    // Copiar al clipboard
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Resultados copiados al portapapeles');
    }).catch(() => {
        // Fallback
        prompt('Copiá el texto:', text);
    });
}

/**
 * Muestra menú de acciones del torneo
 */
function showTournamentMenu() {
    const menu = document.createElement('div');
    menu.className = 'modal active';
    menu.id = 'tournamentMenu';
    menu.onclick = (e) => { if (e.target === menu) closeTournamentMenu(); };
    menu.innerHTML = `
        <div class="modal-content battle-card" style="max-width: 320px;">
            <div class="battle-header">
                <span class="battle-round">⚙️ OPCIONES</span>
            </div>
            <div class="menu-options">
                <button class="menu-option" onclick="showAddLateModal()">
                    ➕ Agregar MC tarde
                </button>
                <button class="menu-option" onclick="closeTournamentMenu(); createWildcard(1);">
                    🎲 Repechaje
                </button>
                <button class="menu-option" onclick="closeTournamentMenu(); exportResults();">
                    📤 Exportar resultados
                </button>
                <button class="menu-option cancel" onclick="closeTournamentMenu()">
                    ✕ Cerrar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(menu);
}

function closeTournamentMenu() {
    const menu = document.getElementById('tournamentMenu');
    if (menu) menu.remove();
}

function showAddLateModal() {
    closeTournamentMenu();
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'addLateModal';
    modal.innerHTML = `
        <div class="modal-content battle-card">
            <div class="battle-header">
                <span class="battle-round">➕ AGREGAR MC</span>
            </div>
            <div class="input-group" style="margin: 20px 0;">
                <input type="text" id="lateMcInput" placeholder="Nombre del MC..." autocomplete="off">
                <button class="btn-add" onclick="addLateMcToList()">+</button>
            </div>
            <div id="lateMcList" class="mc-list" style="max-height: 150px;"></div>
            <div class="triangular-btns" style="margin-top: 20px;">
                <button class="btn-secondary" onclick="closeAddLateModal()">Cancelar</button>
                <button class="btn-primary" onclick="confirmAddLate()" style="padding: 14px 24px;">
                    Agregar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('lateMcInput').focus();
    window.lateMcs = [];
}

function closeAddLateModal() {
    const modal = document.getElementById('addLateModal');
    if (modal) modal.remove();
    window.lateMcs = [];
}

function addLateMcToList() {
    const input = document.getElementById('lateMcInput');
    const name = input.value.trim();
    if (!name) return;
    
    window.lateMcs.push(name);
    input.value = '';
    
    document.getElementById('lateMcList').innerHTML = window.lateMcs.map((n, i) => `
        <div class="mc-item">
            <div class="mc-avatar">${n.charAt(0).toUpperCase()}</div>
            <span class="mc-name">${escapeHtml(n)}</span>
            <button class="remove-btn" onclick="removeLateMc(${i})">×</button>
        </div>
    `).join('');
}

function removeLateMc(index) {
    window.lateMcs.splice(index, 1);
    addLateMcToList(); // Re-render
}

function confirmAddLate() {
    if (window.lateMcs.length === 0) {
        alert('Agregá al menos un MC');
        return;
    }
    addLateCompetitors(window.lateMcs);
    closeAddLateModal();
}

// ========================================
// EVENT LISTENERS
// ========================================

// Register screen
elements.addMcBtn.addEventListener('click', addParticipant);
elements.mcNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addParticipant();
});

elements.generateBtn.addEventListener('click', () => {
    showScreen('configScreen');
    initConfigScreen();
});

// Config screen - AHORA FUNCIONALES
elements.backFromConfig.addEventListener('click', () => {
    // Si hay torneo en curso, volver a la pantalla de registro con los participantes originales
    if (state.tournament) {
        state.participants = [...state.tournament.originalParticipants];
    }
    showScreen('registerScreen');
    renderParticipants();
});
elements.decreasePass.addEventListener('click', () => updatePassCount(-1));
elements.increasePass.addEventListener('click', () => updatePassCount(1));

elements.startTournamentBtn.addEventListener('click', () => {
    // Si ya hay un torneo en curso, es siguiente ronda
    if (state.tournament && state.tournament.rounds.length > 0) {
        startNextRound();
    } else {
        startTournament();
    }
});

// Result
elements.newTournamentBtn.addEventListener('click', resetTournament);

// History
elements.historyBtn.addEventListener('click', () => {
    renderHistory();
    showScreen('historyScreen');
});

elements.backFromHistory.addEventListener('click', () => {
    showScreen('registerScreen');
});

// Close modal on backdrop click
elements.battleModal.addEventListener('click', (e) => {
    if (e.target === elements.battleModal) {
        closeBattleModal();
    }
});

// ========================================
// INIT
// ========================================

function init() {
    renderParticipants();
    updateGenerateButton();
    renderHistory();
    
    // Verificar si hay un torneo guardado
    setTimeout(() => {
        checkForSavedTournament();
    }, 500);
}

init();
