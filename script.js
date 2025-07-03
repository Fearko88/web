import * as XLSX from 'xlsx';

// --- DOM ELEMENT REFERENCES --- //
const screens = document.querySelectorAll('.screen');
const contentScreen = document.querySelector('.screen-content');
const contentBody = document.getElementById('screen-content-body');
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const mainMenuScreen = document.getElementById('main-menu-screen');
const mainMenuButtons = document.getElementById('main-menu-buttons');
const backButton = document.getElementById('back-button');
const mainMenuButton = document.getElementById('main-menu-button');
const userInfo = document.getElementById('user-info');
const loggedInUserSpan = document.getElementById('logged-in-user');
const logoutButton = document.getElementById('logout-button');

// --- APP STATE & DATA --- //
let currentUser = null;
let screenHistory = [];
const appData = {
    users: [],
    personnel: [],
    tools: [],
    attendance: [],
    toolAssignments: []
};

const initialUsers = [
    { username: "ADMIN", password: "M4st3r3310*", profile: "ADMIN" },
    { username: "SUPER", password: "Super1", profile: "SUPER" },
    { username: "RRHH", password: "Facil1234", profile: "RRHH" },
    { username: "PAÑOL", password: "", profile: "PAÑOL" }
];

// --- PERMISSIONS CONFIG --- //
const PERMISSIONS = {
    ASISTENCIA: ['ADMIN', 'SUPER', 'RRHH'],
    HERRAMIENTAS: ['ADMIN', 'SUPER', 'PAÑOL'],
    CREAR_PERFILES: ['ADMIN'],
    AGREGAR_PERSONAL: ['ADMIN', 'RRHH'],
    TOMAR_ASISTENCIA: ['ADMIN', 'SUPER'],
    CARGAR_HERRAMIENTAS: ['ADMIN', 'PAÑOL'],
    ASIGNAR_HERRAMIENTAS: ['ADMIN', 'SUPER'],
    CLEAR_DB: ['ADMIN']
};

const hasPermission = (permissionKey) => {
    return currentUser && PERMISSIONS[permissionKey]?.includes(currentUser.profile);
};

// --- DATA PERSISTENCE (localStorage) --- //
function saveData() {
    localStorage.setItem('afSaltaData', JSON.stringify(appData));
}

function loadData() {
    const savedData = localStorage.getItem('afSaltaData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Ensure initial users are always present if DB is cleared/corrupted
        if (!parsedData.users || parsedData.users.length === 0) {
            parsedData.users = initialUsers;
        }
        Object.assign(appData, parsedData);
    } else {
        appData.users = initialUsers;
        saveData();
    }
}

// --- SCREEN NAVIGATION --- //
function showScreen(screenId, contentHTML = null) {
    screenHistory.push({ id: screenId, content: contentHTML });

    screens.forEach(s => s.classList.add('hidden'));
    contentScreen.classList.add('hidden');

    if (contentHTML !== null) {
        contentBody.innerHTML = contentHTML;
        contentScreen.classList.remove('hidden');
        mainMenuScreen.classList.add('hidden');
    } else {
        const screenToShow = document.getElementById(screenId);
        if (screenToShow) {
            screenToShow.classList.remove('hidden');
            screenToShow.classList.add('active');
        }
    }
}

function goBack() {
    if (screenHistory.length > 1) {
        screenHistory.pop(); // Remove current screen
        const lastScreen = screenHistory[screenHistory.length - 1]; // Get previous
        
        screens.forEach(s => s.classList.add('hidden'));
        contentScreen.classList.add('hidden');

        if (lastScreen.content !== null) {
            contentBody.innerHTML = lastScreen.content;
            contentScreen.classList.remove('hidden');
        } else {
            const screenToShow = document.getElementById(lastScreen.id);
            if (screenToShow) {
                screenToShow.classList.remove('hidden');
                screenToShow.classList.add('active');
            }
        }
    }
}

function goToMainMenu() {
    screenHistory = [];
    showMainMenu();
}

// --- LOGIN/LOGOUT LOGIC --- //
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const user = appData.users.find(u => u.username.toUpperCase() === username.toUpperCase() && u.password === password);

    if (user) {
        currentUser = user;
        loginError.textContent = '';
        loginForm.reset();
        userInfo.classList.remove('hidden');
        loggedInUserSpan.textContent = `Usuario: ${currentUser.username} (${currentUser.profile})`;
        showMainMenu();
    } else {
        loginError.textContent = 'Usuario o contraseña incorrectos.';
        currentUser = null;
    }
}

function handleLogout() {
    currentUser = null;
    userInfo.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('active');
    mainMenuScreen.classList.add('hidden');
    contentScreen.classList.add('hidden');
    screenHistory = [];
}

// --- MAIN MENU --- //
function showMainMenu() {
    mainMenuButtons.innerHTML = '';
    const menuMap = {
        ASISTENCIA: { label: 'Asistencia', action: showAsistenciaMenu },
        HERRAMIENTAS: { label: 'Herramientas', action: showHerramientasMenu },
        CREAR_PERFILES: { label: 'Crear Perfiles', action: showCrearPerfiles },
    };

    Object.keys(menuMap).forEach(key => {
        if (hasPermission(key)) {
            const button = document.createElement('button');
            button.textContent = menuMap[key].label;
            button.onclick = menuMap[key].action;
            mainMenuButtons.appendChild(button);
        }
    });
    showScreen('main-menu-screen');
}


// --- DYNAMIC CONTENT RENDERING --- //

// Menu: Asistencia
function showAsistenciaMenu() {
    let buttonsHTML = '';
    if (hasPermission('AGREGAR_PERSONAL')) {
        buttonsHTML += `<button class="action-button" onclick="window.app.showAgregarPersonal()">Agregar Personal</button>`;
    }
    if (hasPermission('TOMAR_ASISTENCIA')) {
        buttonsHTML += `<button class="action-button" onclick="window.app.showTomarAsistencia()">Tomar Asistencia</button>`;
    }
    const html = `<h2>Asistencia</h2><div class="button-container">${buttonsHTML}</div>`;
    showScreen('content', html);
}

// Menu: Herramientas
function showHerramientasMenu() {
    let buttonsHTML = '';
    if (hasPermission('CARGAR_HERRAMIENTAS')) {
        buttonsHTML += `<button class="action-button" onclick="window.app.showCargarHerramientas()">Cargar Herramientas</button>`;
    }
    if (hasPermission('ASIGNAR_HERRAMIENTAS')) {
        buttonsHTML += `<button class="action-button" onclick="window.app.showAsignarHerramientas()">Asignar Herramientas</button>`;
    }
    const html = `<h2>Herramientas</h2><div class="button-container">${buttonsHTML}</div>`;
    showScreen('content', html);
}

// Screen: Crear Perfiles (Admin)
function showCrearPerfiles() {
    const userRows = appData.users.map(u => `
        <tr>
            <td>${u.username}</td>
            <td>${u.profile}</td>
            <td><button class="icon-btn delete" onclick="window.app.deleteUser('${u.username}')"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
    `).join('');

    const html = `
        <div class="content-section">
            <h3>Crear Nuevo Usuario</h3>
            <form id="add-user-form">
                <div class="form-group">
                    <label for="new-username">Nuevo Usuario:</label>
                    <input type="text" id="new-username" required>
                </div>
                <div class="form-group">
                    <label for="new-password">Nueva Contraseña:</label>
                    <input type="password" id="new-password" required>
                </div>
                <div class="form-group">
                    <label for="new-profile">Perfil:</label>
                    <select id="new-profile" required>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER">SUPER</option>
                        <option value="RRHH">RRHH</option>
                        <option value="PAÑOL">PAÑOL</option>
                    </select>
                </div>
                <button type="submit" class="btn">Crear Usuario</button>
            </form>
        </div>
        <div class="content-section">
            <h3>Usuarios Existentes</h3>
            <div class="table-container">
                <table>
                    <thead><tr><th>Usuario</th><th>Perfil</th><th>Acción</th></tr></thead>
                    <tbody>${userRows}</tbody>
                </table>
            </div>
        </div>
    `;
    showScreen('content', html);
    document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
}

// Screen: Agregar Personal
function showAgregarPersonal() {
    const personalRows = appData.personnel.map(p => `
        <tr>
            <td>${p.legajo}</td>
            <td>${p.nombre}</td>
            <td>${p.cuit}</td>
            <td>${p.base}</td>
        </tr>
    `).join('');
    
    const clearDbButton = hasPermission('CLEAR_DB') ? `<button class="action-button btn-danger" onclick="window.app.clearDatabase('personnel')"><i class="fas fa-trash-alt"></i> Limpiar Base de Datos</button>` : '';

    const html = `
        <div class="content-section">
            <h3>Agregar Personal</h3>
             <form id="add-personnel-form">
                <div class="form-group"><label>N° Legajo:</label><input type="text" id="p-legajo" required></div>
                <div class="form-group"><label>Nombre Completo:</label><input type="text" id="p-nombre" required></div>
                <div class="form-group"><label>CUIT:</label><input type="text" id="p-cuit" required></div>
                <div class="form-group"><label>Base/Grupo:</label><input type="text" id="p-base" required></div>
                <button type="submit" class="btn">Agregar</button>
            </form>
        </div>
        <div class="content-section">
            <h3>Listado de Personal</h3>
            <div class="controls">
                <label class="action-button" for="import-personnel-excel">Importar Excel/Txt</label>
                <input type="file" id="import-personnel-excel" class="hidden" accept=".xlsx, .xls, .txt">
                <button class="action-button" onclick="window.app.exportToExcel('personnel')">Exportar a Excel</button>
                ${clearDbButton}
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>N° Legajo</th><th>Nombre Completo</th><th>CUIT</th><th>Base/Grupo</th></tr></thead>
                    <tbody>${personalRows}</tbody>
                </table>
            </div>
        </div>
    `;
    showScreen('content', html);
    document.getElementById('add-personnel-form').addEventListener('submit', handleAddPersonnel);
    document.getElementById('import-personnel-excel').addEventListener('change', (e) => handleImport(e, 'personnel'));
}


// Screen: Tomar Asistencia
function showTomarAsistencia() {
    const bases = [...new Set(appData.personnel.map(p => p.base))];
    const baseOptions = bases.map(b => `<option value="${b}">${b}</option>`).join('');

    const html = `
        <div class="content-section">
            <h3>Tomar Asistencia</h3>
            <div class="form-group">
                <label for="base-filter">Filtrar por Base/Grupo:</label>
                <select id="base-filter">
                    <option value="">Todas</option>
                    ${baseOptions}
                </select>
            </div>
            <div class="controls">
                 <button class="action-button" onclick="window.app.exportToExcel('attendance')">Exportar Asistencia a Excel</button>
            </div>
            <div class="table-container">
                <table id="attendance-table">
                    <thead>
                        <tr>
                            <th>N° Legajo</th>
                            <th>Nombre Completo</th>
                            <th>Asistencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Rows will be populated by filter -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    showScreen('content', html);
    document.getElementById('base-filter').addEventListener('change', filterAttendanceTable);
    filterAttendanceTable(); // Initial population
}

// Screen: Cargar Herramientas
function showCargarHerramientas() {
    const toolRows = appData.tools.map(t => `
        <tr>
            <td>${t.cod}</td>
            <td>${t.nombre}</td>
            <td>${t.cant}</td>
            <td>${t.estado}</td>
            <td>${t.base}</td>
        </tr>
    `).join('');

    const clearDbButton = hasPermission('CLEAR_DB') ? `<button class="action-button btn-danger" onclick="window.app.clearDatabase('tools')"><i class="fas fa-trash-alt"></i> Limpiar Base de Datos</button>` : '';

    const html = `
        <div class="content-section">
            <h3>Cargar Herramientas</h3>
             <form id="add-tool-form">
                <div class="form-group"><label>Cod. Art:</label><input type="text" id="t-cod" required></div>
                <div class="form-group"><label>Nombre Herramienta:</label><input type="text" id="t-nombre" required></div>
                <div class="form-group"><label>Cantidad:</label><input type="number" id="t-cant" required></div>
                <div class="form-group"><label>Estado:</label><input type="text" id="t-estado" required></div>
                <div class="form-group"><label>Base/Grupo:</label><input type="text" id="t-base" required></div>
                <button type="submit" class="btn">Cargar</button>
            </form>
        </div>
        <div class="content-section">
            <h3>Listado de Herramientas</h3>
            <div class="controls">
                <label class="action-button" for="import-tools-excel">Importar Excel/Txt</label>
                <input type="file" id="import-tools-excel" class="hidden" accept=".xlsx, .xls, .txt">
                <button class="action-button" onclick="window.app.exportToExcel('tools')">Exportar a Excel</button>
                ${clearDbButton}
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Cod. Art</th><th>Nombre</th><th>Cant.</th><th>Estado</th><th>Base/Grupo</th></tr></thead>
                    <tbody>${toolRows}</tbody>
                </table>
            </div>
        </div>
    `;
    showScreen('content', html);
    document.getElementById('add-tool-form').addEventListener('submit', handleAddTool);
    document.getElementById('import-tools-excel').addEventListener('change', (e) => handleImport(e, 'tools'));
}

// Screen: Asignar Herramientas
function showAsignarHerramientas() {
     const bases = [...new Set(appData.personnel.map(p => p.base))];
    const baseOptions = bases.map(b => `<option value="${b}">${b}</option>`).join('');

    const html = `
        <div class="content-section">
            <h3>Asignar Herramientas</h3>
            <div class="form-group">
                <label for="assign-base-filter">Filtrar Personal por Base/Grupo:</label>
                <select id="assign-base-filter">
                    <option value="">Todas</option>
                    ${baseOptions}
                </select>
            </div>
             <div class="controls">
                 <button class="action-button" onclick="window.app.exportToExcel('toolAssignments')">Exportar Asignaciones a Excel</button>
            </div>
            <div class="table-container">
                <table id="assignment-table">
                    <thead>
                        <tr>
                            <th>N° Legajo</th>
                            <th>Nombre Completo</th>
                            <th>Asignación</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Rows will be populated by filter -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    showScreen('content', html);
    document.getElementById('assign-base-filter').addEventListener('change', filterAssignmentTable);
    filterAssignmentTable();
}


// --- FORM HANDLERS & ACTIONS --- //
function handleAddUser(e) {
    e.preventDefault();
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const profile = document.getElementById('new-profile').value;

    if (appData.users.some(u => u.username.toUpperCase() === username.toUpperCase())) {
        alert('El nombre de usuario ya existe.');
        return;
    }
    appData.users.push({ username, password, profile });
    saveData();
    showCrearPerfiles(); // Refresh screen
}

function deleteUser(username) {
    if (username.toUpperCase() === 'ADMIN') {
        alert('No se puede eliminar al usuario ADMIN principal.');
        return;
    }
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${username}?`)) {
        appData.users = appData.users.filter(u => u.username !== username);
        saveData();
        showCrearPerfiles();
    }
}

function handleAddPersonnel(e) {
    e.preventDefault();
    const newPerson = {
        legajo: document.getElementById('p-legajo').value,
        nombre: document.getElementById('p-nombre').value,
        cuit: document.getElementById('p-cuit').value,
        base: document.getElementById('p-base').value,
    };
    appData.personnel.push(newPerson);
    saveData();
    showAgregarPersonal();
}

function handleAddTool(e) {
    e.preventDefault();
    const newTool = {
        cod: document.getElementById('t-cod').value,
        nombre: document.getElementById('t-nombre').value,
        cant: document.getElementById('t-cant').value,
        estado: document.getElementById('t-estado').value,
        base: document.getElementById('t-base').value,
    };
    appData.tools.push(newTool);
    saveData();
    showCargarHerramientas();
}


function filterAttendanceTable() {
    const filterValue = document.getElementById('base-filter').value;
    const tableBody = document.querySelector("#attendance-table tbody");
    
    const filteredPersonnel = appData.personnel.filter(p => filterValue === "" || p.base === filterValue);

    tableBody.innerHTML = filteredPersonnel.map(p => `
        <tr>
            <td>${p.legajo}</td>
            <td>${p.nombre}</td>
            <td class="table-actions" data-legajo="${p.legajo}" data-nombre="${p.nombre}">
                <button class="icon-btn present" title="Presente" onclick="window.app.recordAttendance('${p.legajo}', 'Presente', this)"><i class="fas fa-check"></i></button>
                <button class="icon-btn absent" title="Ausente" onclick="window.app.recordAttendance('${p.legajo}', 'Ausente', this)"><i class="fas fa-times"></i></button>
                <button class="icon-btn replacement" title="Reemplazo" onclick="window.app.recordAttendance('${p.legajo}', 'Reemplazo', this)"><i class="fas fa-exclamation-circle yellow"></i></button>
                <input type="text" class="hidden" placeholder="Legajo Reemplazo">
            </td>
        </tr>
    `).join('');
}

function recordAttendance(legajo, status, element) {
    let reemplazo = null;
    if (status === 'Reemplazo') {
        const input = element.parentElement.querySelector('input[type="text"]');
        input.classList.toggle('hidden');
        if (input.classList.contains('hidden')) return; // Just showed it, wait for input
        reemplazo = prompt("Ingrese el N° de Legajo del reemplazo:");
        if (!reemplazo) return; // User cancelled
    }
    
    const record = {
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        legajo: legajo,
        nombre: appData.personnel.find(p => p.legajo === legajo)?.nombre,
        base: appData.personnel.find(p => p.legajo === legajo)?.base,
        estado: status,
        reemplazo: reemplazo
    };

    appData.attendance.push(record);
    saveData();
    
    const actionsCell = element.parentElement;
    actionsCell.innerHTML = `<strong>${status.toUpperCase()}</strong> ${reemplazo ? `(Reemplazo: ${reemplazo})` : ''}`;
    alert(`Asistencia registrada para Legajo ${legajo}: ${status}`);
}

function filterAssignmentTable() {
    const filterValue = document.getElementById('assign-base-filter').value;
    const tableBody = document.querySelector("#assignment-table tbody");

    const filteredPersonnel = appData.personnel.filter(p => filterValue === "" || p.base === filterValue);
    
    const toolOptions = appData.tools.map(t => `<option value="${t.cod}">${t.nombre} (${t.cant} disp.)</option>`).join('');

    tableBody.innerHTML = filteredPersonnel.map(p => `
        <tr>
            <td>${p.legajo}</td>
            <td>${p.nombre}</td>
            <td class="table-actions" data-legajo="${p.legajo}">
                <select class="tool-select"><option value="">Seleccione herramienta...</option>${toolOptions}</select>
                <input type="number" class="tool-qty" placeholder="Cant." style="width: 60px;">
                <button class="icon-btn present" title="Entregado" onclick="window.app.recordAssignment('${p.legajo}', 'Entregado', this)"><i class="fas fa-check"></i></button>
                <button class="icon-btn absent" title="Dañado" onclick="window.app.recordAssignment('${p.legajo}', 'Dañado', this)"><i class="fas fa-times"></i></button>
                <button class="icon-btn replacement" title="Faltan" onclick="window.app.recordAssignment('${p.legajo}', 'Faltan', this)"><i class="fas fa-exclamation-circle yellow"></i></button>
                <button class="icon-btn other" title="Otros" onclick="window.app.recordAssignment('${p.legajo}', 'Otros', this)"><i class="fas fa-info-circle"></i></button>
            </td>
        </tr>
    `).join('');
}


function recordAssignment(legajo, status, element) {
    const row = element.parentElement;
    const toolCod = row.querySelector('.tool-select').value;
    const quantity = row.querySelector('.tool-qty').value;
    const tool = appData.tools.find(t => t.cod === toolCod);

    if (!toolCod || !quantity) {
        alert("Por favor, seleccione una herramienta y especifique la cantidad.");
        return;
    }
    
    const record = {
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        legajo: legajo,
        nombrePersona: appData.personnel.find(p => p.legajo === legajo)?.nombre,
        codHerramienta: toolCod,
        nombreHerramienta: tool?.nombre,
        cantidad: quantity,
        estado: status
    };

    appData.toolAssignments.push(record);
    saveData();
    row.innerHTML = `<strong>${status.toUpperCase()}:</strong> ${quantity} x ${tool.nombre}`;
    alert(`Asignación registrada para Legajo ${legajo}`);
}

function clearDatabase(key) {
    if (confirm(`¿ESTÁ SEGURO? Esta acción eliminará permanentemente TODOS los datos de ${key.toUpperCase()} y no se puede deshacer.`)) {
        appData[key] = [];
        saveData();
        // Refresh the current view
        if (key === 'personnel') showAgregarPersonal();
        if (key === 'tools') showCargarHerramientas();
    }
}


// --- IMPORT/EXPORT --- //
function handleImport(event, key) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            // Basic validation
            if (json.length === 0) throw new Error("El archivo está vacío.");
            
            let dataToAdd = [];
            if(key === 'personnel'){
                dataToAdd = json.map(row => ({
                    legajo: row['N°LEG'] || row['legajo'],
                    nombre: row['NOMBRE COMPLETO'] || row['nombre'],
                    cuit: row['CUIT'] || row['cuit'],
                    base: row['BASE GRUPO'] || row['base']
                }));
            } else if (key === 'tools') {
                 dataToAdd = json.map(row => ({
                    cod: row['COD_ART'] || row['cod'],
                    nombre: row['NOMBRE HERRAMIENTA'] || row['nombre'],
                    cant: row['CANT'] || row['cant'],
                    estado: row['ESTADO'] || row['estado'],
                    base: row['BASE GRUPO'] || row['base'],
                }));
            }

            if(dataToAdd.some(item => Object.values(item).some(v => v === undefined))) {
                throw new Error("El archivo no tiene las columnas correctas. Revise el formato.");
            }

            appData[key].push(...dataToAdd);
            saveData();
            alert(`${json.length} registros importados correctamente.`);
            if (key === 'personnel') showAgregarPersonal();
            if (key === 'tools') showCargarHerramientas();

        } catch (error) {
            console.error("Error al importar:", error);
            alert(`Error al importar el archivo: ${error.message}. Asegúrese de que es un archivo Excel/Txt con el formato correcto.`);
        }
    };

    if (file.name.endsWith('.txt')) {
        reader.readAsText(file); // For TXT, need different parsing logic not implemented here but structure is ready
        alert("La importación de TXT no está completamente implementada, use Excel (XLSX).");
    } else {
        reader.readAsArrayBuffer(file);
    }
}

function exportToExcel(key) {
    const dataMap = {
        personnel: { data: appData.personnel, filename: 'Personal.xlsx', headers: [["N°LEG", "NOMBRE COMPLETO", "CUIT", "BASE GRUPO"]] },
        tools: { data: appData.tools, filename: 'Herramientas.xlsx', headers: [["COD_ART", "NOMBRE HERRAMIENTA", "CANT", "ESTADO", "BASE GRUPO"]] },
        attendance: { data: appData.attendance, filename: 'Asistencia.xlsx', headers: [["FECHA", "HORA", "N°LEG", "NOMBRE COMPLETO", "ESTADO", "REEMPLAZO", "BASE GRUPO"]] },
        toolAssignments: { data: appData.toolAssignments, filename: 'Asignacion_Herramientas.xlsx', headers: [["FECHA", "HORA", "N°LEG", "NOMBRE", "COD_HERRAMIENTA", "HERRAMIENTA", "CANTIDAD", "ESTADO"]] }
    };

    const config = dataMap[key];
    if (!config || config.data.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }
    
    let dataToExport;

    // Remap keys for export if needed
    if (key === 'personnel') {
        dataToExport = config.data.map(p => ({ "N°LEG": p.legajo, "NOMBRE COMPLETO": p.nombre, CUIT: p.cuit, "BASE GRUPO": p.base }));
    } else if (key === 'tools') {
        dataToExport = config.data.map(t => ({ "COD_ART": t.cod, "NOMBRE HERRAMIENTA": t.nombre, CANT: t.cant, ESTADO: t.estado, "BASE GRUPO": t.base }));
    } else if (key === 'attendance') {
        dataToExport = config.data.map(a => ({ FECHA: a.fecha, HORA: a.hora, "N°LEG": a.legajo, "NOMBRE COMPLETO": a.nombre, ESTADO: a.estado, REEMPLAZO: a.reemplazo, "BASE GRUPO": a.base }));
    } else if (key === 'toolAssignments') {
        dataToExport = config.data.map(a => ({ FECHA: a.fecha, HORA: a.hora, "N°LEG": a.legajo, NOMBRE: a.nombrePersona, "COD_HERRAMIENTA": a.codHerramienta, HERRAMIENTA: a.nombreHerramienta, CANTIDAD: a.cantidad, ESTADO: a.estado}));
    } else {
        dataToExport = config.data;
    }


    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, config.filename);
}

// --- INITIALIZATION --- //
function init() {
    loadData();
    loginForm.addEventListener('submit', handleLogin);
    backButton.addEventListener('click', goBack);
    mainMenuButton.addEventListener('click', goToMainMenu);
    logoutButton.addEventListener('click', handleLogout);

    // Expose functions to be called from inline HTML event handlers
    window.app = {
        showAsistenciaMenu,
        showHerramientasMenu,
        showCrearPerfiles,
        showAgregarPersonal,
        showTomarAsistencia,
        showCargarHerramientas,
        showAsignarHerramientas,
        deleteUser,
        clearDatabase,
        recordAttendance,
        recordAssignment,
        exportToExcel
    };
}

init();

