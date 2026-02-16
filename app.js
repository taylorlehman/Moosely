// Data Structure
let data = {
    releases: [],
    featureAreas: [],
    tasks: []
};

let currentTab = 'tasks';
let currentView = 'all';
let currentSort = 'releaseDate';
let currentFilter = null;

function switchTab(tab) {
    currentTab = tab;
    
    // Update UI
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    const filtersContainer = document.getElementById('filtersContainer');
    const taskListHeader = document.getElementById('taskListHeader');
    
    if (tab === 'tasks') {
        filtersContainer.style.display = 'flex';
        taskListHeader.style.display = 'grid';
    } else {
        filtersContainer.style.display = 'none';
        taskListHeader.style.display = 'none';
    }
    
    render();
}

// Load data from the server
async function loadData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            data = await response.json();
            render();
        } else {
            console.error("Failed to load data from server");
            renderEmptyState();
        }
    } catch (e) {
        console.error("Error connecting to server:", e);
        renderEmptyState();
    }
}

// Save data to the server
async function saveData() {
    try {
        await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error("Error saving data to server:", e);
        alert("Failed to save data to server. Please check if the server is running.");
    }
}

function downloadData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "work_tracker_data.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function clearData() {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
        localStorage.removeItem('workTrackerData');
        data = { releases: [], featureAreas: [], tasks: [] };
        renderEmptyState();
    }
}

// CSV Parsing Logic
function handleCSVUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseCSVAndLoad(text);
        input.value = ''; // Reset input
    };
    reader.readAsText(file);
}

function parseCSVAndLoad(csvText) {
    // Simple CSV parser handling quotes
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentField += '"';
                i++; 
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    if (rows.length < 2) {
        alert("CSV file appears to be empty or invalid.");
        return;
    }

    const headers = rows[0].map(h => h.trim());
    const records = rows.slice(1).map(row => {
        const record = {};
        headers.forEach((header, index) => {
            record[header] = row[index] || '';
        });
        return record;
    });

    processRecords(records);
}

function processRecords(records) {
    const releasesMap = {};
    const featureAreasMap = {};
    const newTasks = [];
    
    const parentTaskMap = {}; 

    records.forEach((record, index) => {
        const taskName = record['Name'];
        if (!taskName) return;
        
        const taskId = record['Task ID'] || `task-${Date.now()}-${index}`;
        parentTaskMap[taskName] = taskId;
        
        const releaseName = record['Release Version'] || 'Unassigned Release';
        const featureAreaName = record['Feature Area'] || 'Unassigned Feature Area';
        const status = record['Section/Column'] || 'Not Started';
        const dueDate = record['Due Date'];
        const parentTaskName = record['Parent task'];

        let releaseId = null;
        if (!releasesMap[releaseName] && releaseName) {
            releasesMap[releaseName] = {
                id: `release-${Object.keys(releasesMap).length + 1}`,
                name: releaseName,
                date: dueDate || '',
                launchMonth: ''
            };
        }
        if (releaseName) releaseId = releasesMap[releaseName].id;

        // Update release date if later
        if (releasesMap[releaseName] && dueDate && dueDate > releasesMap[releaseName].date) {
            releasesMap[releaseName].date = dueDate;
        }

        let featureAreaId = null;
        if (!featureAreasMap[featureAreaName] && featureAreaName) {
            featureAreasMap[featureAreaName] = {
                id: `feature-${Object.keys(featureAreasMap).length + 1}`,
                name: featureAreaName
            };
        }
        if (featureAreaName) featureAreaId = featureAreasMap[featureAreaName].id;

        const notes = [record['Notes'], record['Comment'], record['Comments']]
            .filter(Boolean)
            .join('\n\n');

        newTasks.push({
            id: taskId,
            name: taskName,
            releaseId: releaseId,
            featureAreaId: featureAreaId,
            status: status,
            dueDate: dueDate,
            assignee: record['Assignee'],
            notes: notes,
            parentTaskName: parentTaskName,
            subtasks: []
        });
    });

    // Pass 2: Link subtasks
    const rootTasks = [];
    const taskMap = {};
    newTasks.forEach(t => taskMap[t.id] = t);

    newTasks.forEach(task => {
        if (task.parentTaskName) {
            const parent = newTasks.find(t => t.name === task.parentTaskName);
            if (parent) {
                parent.subtasks.push(task);
            } else {
                rootTasks.push(task);
            }
        } else {
            rootTasks.push(task);
        }
    });

    data = {
        releases: Object.values(releasesMap),
        featureAreas: Object.values(featureAreasMap),
        tasks: rootTasks
    };

    saveData();
    render();
    alert("CSV Imported Successfully!");
}

// Helper to format date as Month Year
function formatMonthYear(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Helper to generate consistent colors from strings
function getColor(str) {
    if (!str) return '#ccc';
    const colors = [
        '#007bff', '#6610f2', '#6f42c1', '#e83e8c', '#dc3545', 
        '#fd7e14', '#ffc107', '#28a745', '#20c997', '#17a2b8',
        '#343a40', '#6c757d', '#0056b3', '#4c0bce', '#a71d2a'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Rendering Logic
function render() {
    const content = document.getElementById('content');
    content.innerHTML = '';
    const taskListHeader = document.getElementById('taskListHeader');
    const sortLabel = document.getElementById('sortLabel');
    const filterOptions = document.getElementById('filterOptions');

    // Handle Management Views (Tabs)
    if (currentTab === 'featureAreas') {
        const header = document.createElement('div');
        header.className = 'task-list-header';
        header.style.gridTemplateColumns = '1fr 80px';
        header.innerHTML = `<div>Feature Area Name</div><div style="text-align: right;">Actions</div>`;
        content.appendChild(header);

        const list = document.createElement('ul');
        data.featureAreas.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
            const li = document.createElement('li');
            li.style.gridTemplateColumns = '1fr 80px';
            li.innerHTML = `
                <div>
                    <span class="pill" style="background-color: ${f.color || getColor(f.name)}">${f.name}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn edit-btn" onclick="editItem('featureArea', '${f.id}')" title="Edit">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="icon-btn delete-btn" onclick="deleteItem('featureArea', '${f.id}')" title="Delete">
                        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
        content.appendChild(list);
        return;
    } else if (currentTab === 'releases') {
        const header = document.createElement('div');
        header.className = 'task-list-header';
        header.style.gridTemplateColumns = '2fr 1fr 1fr 80px';
        header.innerHTML = `<div>Release Name</div><div>Date</div><div>Launch Month</div><div style="text-align: right;">Actions</div>`;
        content.appendChild(header);

        const list = document.createElement('ul');
        data.releases.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date) - new Date(b.date);
        }).forEach(r => {
            const li = document.createElement('li');
            li.style.gridTemplateColumns = '2fr 1fr 1fr 80px';
            li.innerHTML = `
                <div>
                    <span class="pill" style="background-color: ${r.color || getColor(r.name)}">${r.name}</span>
                </div>
                <div>${r.date || '-'}</div>
                <div>${r.launchMonth || '-'}</div>
                <div class="task-actions">
                    <button class="icon-btn edit-btn" onclick="editItem('release', '${r.id}')" title="Edit">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="icon-btn delete-btn" onclick="deleteItem('release', '${r.id}')" title="Delete">
                        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
        content.appendChild(list);
        return;
    }

    // Standard Task Views
    if (data.tasks.length === 0) {
        renderEmptyState();
        return;
    }

    let filteredTasks = [...data.tasks];

    if (currentView === 'featureArea' && currentFilter) {
        filteredTasks = filteredTasks.filter(task => task.featureAreaId === currentFilter);
    } else if (currentView === 'release' && currentFilter) {
        filteredTasks = filteredTasks.filter(task => task.releaseId === currentFilter);
    }

    // Sort tasks
    filteredTasks.sort((a, b) => {
        const releaseA = data.releases.find(r => r.id === a.releaseId);
        const releaseB = data.releases.find(r => r.id === b.releaseId);
        const featureA = data.featureAreas.find(f => f.id === a.featureAreaId);
        const featureB = data.featureAreas.find(f => f.id === b.featureAreaId);

        if (!releaseA || !releaseB || !featureA || !featureB) return 0;

        if (currentSort === 'releaseDate') {
            const dateStrA = releaseA ? releaseA.date : '';
            const dateStrB = releaseB ? releaseB.date : '';

            if (!dateStrA && !dateStrB) return 0;
            if (!dateStrA) return 1; 
            if (!dateStrB) return -1;

            const dateA = new Date(dateStrA);
            const dateB = new Date(dateStrB);
            
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            
            if (featureA && featureB) {
                if (featureA.name < featureB.name) return -1;
                if (featureA.name > featureB.name) return 1;
            }
            return 0;
        } else if (currentSort === 'featureArea') {
            const nameA = featureA ? featureA.name : 'zzz';
            const nameB = featureB ? featureB.name : 'zzz';
            
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            
            const dateStrA = releaseA ? releaseA.date : '';
            const dateStrB = releaseB ? releaseB.date : '';
            
            if (!dateStrA && !dateStrB) return 0;
            if (!dateStrA) return 1;
            if (!dateStrB) return -1;

            const dateA = new Date(dateStrA);
            const dateB = new Date(dateStrB);

            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            return 0;
        }
    });

    // Bucketing Logic for Release View
    if (currentView === 'release' && currentFilter) {
        const buckets = {
            'Not Started': [],
            'In Progress': [],
            'Complete': []
        };
        const other = [];

        filteredTasks.forEach(t => {
            const s = t.status;
            if (s === 'Not Started') buckets['Not Started'].push(t);
            else if (s === 'In Progress') buckets['In Progress'].push(t);
            else if (s === 'Complete' || s === 'Completed') buckets['Complete'].push(t);
            else other.push(t);
        });

        // Render groups
        ['Not Started', 'In Progress', 'Complete'].forEach(status => {
            if (buckets[status].length > 0) {
                const header = document.createElement('div');
                header.className = 'group-header';
                header.innerText = status;
                content.appendChild(header);
                const ul = document.createElement('ul');
                buckets[status].forEach(task => ul.appendChild(createTaskElement(task)));
                content.appendChild(ul);
            }
        });

        if (other.length > 0) {
            const header = document.createElement('div');
            header.className = 'group-header';
            header.innerText = 'Other';
            content.appendChild(header);
            const ul = document.createElement('ul');
            other.forEach(task => ul.appendChild(createTaskElement(task)));
            content.appendChild(ul);
        }

    } else {
        // Standard Render
        const list = document.createElement('ul');
        filteredTasks.forEach(task => {
            list.appendChild(createTaskElement(task));
        });
        content.appendChild(list);
    }

    updateFilterOptions();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    const release = data.releases.find(r => r.id === task.releaseId);
    const feature = data.featureAreas.find(f => f.id === task.featureAreaId);

    const releaseName = release ? release.name : 'Unassigned';
    const releaseDate = release && release.date ? release.date : '';
    const launchMonth = release && release.launchMonth ? release.launchMonth : '';
    const displayDate = formatMonthYear(releaseDate);
    
    const featureName = feature ? feature.name : 'Unassigned';

    let subtasksHtml = '';
    if (task.subtasks && task.subtasks.length > 0) {
        const sortedSubtasks = [...task.subtasks].sort((a, b) => {
            const isCompleteA = a.status === 'Complete' || a.status === 'Completed';
            const isCompleteB = b.status === 'Complete' || b.status === 'Completed';
            if (isCompleteA === isCompleteB) return 0;
            return isCompleteA ? 1 : -1;
        });

        subtasksHtml = `<div class="subtasks">
            ${sortedSubtasks.map(st => {
                const isComplete = st.status === 'Complete' || st.status === 'Completed';
                const className = isComplete ? 'subtask-item completed' : 'subtask-item';
                return `
                <div class="${className}">
                    <span>${st.name}</span> <span style="font-size:0.8em; color:#999;">(${st.status})</span>
                </div>
                `;
            }).join('')}
        </div>`;
    }

    li.innerHTML = `
        <div class="task-info">
            <div class="task-name">${task.name}</div>
            <div class="task-meta">
                <span class="task-status">${task.status}</span>
            </div>
            ${subtasksHtml}
        </div>
        <div>
            <span class="pill" style="background-color: ${release && release.color ? release.color : getColor(releaseName)}">${releaseName}</span>
        </div>
        <div>
            <span style="color: #666; font-size: 0.9em;">${displayDate || '-'}</span>
        </div>
        <div>
            <span class="pill" style="background-color: ${feature && feature.color ? feature.color : getColor(featureName)}">${featureName}</span>
        </div>
        <div class="task-actions">
            <button class="icon-btn edit-btn" onclick="editItem('task', '${task.id}')" title="Edit">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="icon-btn delete-btn" onclick="deleteItem('task', '${task.id}')" title="Delete">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
        </div>
    `;
    return li;
}

function renderEmptyState() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="empty-state">
            <h3>No data found</h3>
            <p>Import a CSV file to get started or add items manually.</p>
        </div>
    `;
}

function updateView() {
    currentView = document.getElementById('viewSelect').value;
    currentSort = document.getElementById('sortSelect').value;
    const filterOptions = document.getElementById('filterOptions');
    const sortLabel = document.getElementById('sortLabel');
    const taskListHeader = document.getElementById('taskListHeader');
    
    // Default visibility
    sortLabel.style.display = 'inline-block';
    taskListHeader.style.display = 'grid';
    filterOptions.style.display = 'none';

    if (currentView === 'manageFeatureAreas' || currentView === 'manageReleases') {
        sortLabel.style.display = 'none';
        taskListHeader.style.display = 'none';
        currentFilter = null;
    } else if (currentView === 'all') {
        currentFilter = null;
    } else {
        filterOptions.style.display = 'block';
        let options = [];
        if (currentView === 'featureArea') {
            options = data.featureAreas.map(f => `<option value="${f.id}">${f.name}</option>`);
        } else if (currentView === 'release') {
            options = data.releases.map(r => `<option value="${r.id}">${r.name}</option>`);
        }
        
        const currentSelect = filterOptions.querySelector('select');
        const currentVal = currentSelect ? currentSelect.value : (options.length > 0 ? options[0].match(/value="([^"]+)"/)[1] : null);
        
        filterOptions.innerHTML = `<select onchange="currentFilter = this.value; render()">${options.join('')}</select>`;
        
        const newSelect = filterOptions.querySelector('select');
        if (newSelect) {
            if (currentVal && options.some(o => o.includes(currentVal))) {
                newSelect.value = currentVal;
            }
            currentFilter = newSelect.value;
        }
    }
    render();
}

function updateFilterOptions() {
    if (currentView !== 'all') {
        const filterOptions = document.getElementById('filterOptions');
        const select = filterOptions.querySelector('select');
        if (select) {
            const currentVal = select.value;
            let options = [];
            if (currentView === 'featureArea') {
                options = data.featureAreas.map(f => `<option value="${f.id}" ${f.id === currentVal ? 'selected' : ''}>${f.name}</option>`);
            } else if (currentView === 'release') {
                options = data.releases.map(r => `<option value="${r.id}" ${r.id === currentVal ? 'selected' : ''}>${r.name}</option>`);
            }
            select.innerHTML = options.join('');
        }
    }
}

// Modal & CRUD
function openModal(type, id = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('modalForm');
    
    modal.style.display = 'block';
    title.innerText = id ? `Edit ${type}` : `Add ${type}`;
    
    let item = null;
    if (id) {
        if (type === 'task') item = data.tasks.find(t => t.id === id);
        else if (type === 'release') item = data.releases.find(r => r.id === id);
        else if (type === 'featureArea') item = data.featureAreas.find(f => f.id === id);
    }

    let html = '';
    if (type === 'task') {
        html = `
            <label>Name: <input type="text" name="name" value="${item ? item.name : ''}" required></label>
            <label>Status: 
                <select name="status">
                    <option value="Not Started" ${item && item.status === 'Not Started' ? 'selected' : ''}>Not Started</option>
                    <option value="In Progress" ${item && item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Completed" ${item && (item.status === 'Completed' || item.status === 'Complete') ? 'selected' : ''}>Completed</option>
                </select>
            </label>
            <label>Release: 
                <select name="releaseId">
                    <option value="">Unassigned</option>
                    ${data.releases.map(r => `<option value="${r.id}" ${item && item.releaseId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                </select>
            </label>
            <label>Feature Area: 
                <select name="featureAreaId">
                    <option value="">Unassigned</option>
                    ${data.featureAreas.map(f => `<option value="${f.id}" ${item && item.featureAreaId === f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                </select>
            </label>
            <label>Notes: <textarea name="notes" rows="4" style="font-family: inherit; resize: vertical;">${item ? item.notes || '' : ''}</textarea></label>
            
            <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                    Subtasks 
                    <button type="button" id="addSubtaskBtn" style="width:auto; margin:0; padding: 6px 12px; font-size: 0.8em; background-color: #007bff;">+ Add Subtask</button>
                </label>
                <div id="subtasksContainer"></div>
            </div>

            <input type="hidden" name="id" value="${item ? item.id : ''}">
            <input type="hidden" name="type" value="task">
        `;
    } else if (type === 'release') {
        html = `
            <label>Name: <input type="text" name="name" value="${item ? item.name : ''}" required></label>
            <label>Date: <input type="date" name="date" value="${item ? item.date : ''}"></label>
            <label>Launch Month: <input type="month" name="launchMonth" value="${item ? item.launchMonth : ''}"></label>
            <label>Color: <input type="color" name="color" value="${item && item.color ? item.color : getColor(item ? item.name : '')}" style="height: 40px; padding: 2px;"></label>
            <input type="hidden" name="id" value="${item ? item.id : ''}">
            <input type="hidden" name="type" value="release">
        `;
    } else if (type === 'featureArea') {
        html = `
            <label>Name: <input type="text" name="name" value="${item ? item.name : ''}" required></label>
            <label>Color: <input type="color" name="color" value="${item && item.color ? item.color : getColor(item ? item.name : '')}" style="height: 40px; padding: 2px;"></label>
            <input type="hidden" name="id" value="${item ? item.id : ''}">
            <input type="hidden" name="type" value="featureArea">
        `;
    }
    
    html += `<button type="submit">Save</button>`;
    form.innerHTML = html;

    // Setup Subtask logic after HTML injection
    if (type === 'task') {
        const container = document.getElementById('subtasksContainer');
        const addBtn = document.getElementById('addSubtaskBtn');
        
        const createRow = (name = '', status = 'Not Started') => {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = (status === 'Complete' || status === 'Completed');
            checkbox.style.cssText = 'width: auto; margin: 0; cursor: pointer;';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = name;
            input.placeholder = 'Subtask name';
            input.style.cssText = 'flex-grow: 1; margin: 0; padding: 8px;';
            
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
            delBtn.style.cssText = 'width: 32px; height: 32px; margin: 0; padding: 0; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;';
            delBtn.onclick = () => div.remove();
            
            div.appendChild(checkbox);
            div.appendChild(input);
            div.appendChild(delBtn);
            container.appendChild(div);
        };

        if (item && item.subtasks) {
            item.subtasks.forEach(st => createRow(st.name, st.status));
        }

        addBtn.onclick = () => createRow();
    }
    
    form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const newData = Object.fromEntries(formData.entries());
        
        if (newData.type === 'task') {
            // Harvest subtasks
            const subtaskRows = document.querySelectorAll('#subtasksContainer > div');
            const newSubtasks = Array.from(subtaskRows).map(row => {
                const cb = row.querySelector('input[type="checkbox"]');
                const txt = row.querySelector('input[type="text"]');
                return {
                    name: txt.value,
                    status: cb.checked ? 'Complete' : 'Not Started'
                };
            }).filter(st => st.name.trim() !== ''); // Filter empty names

            if (newData.id) {
                const index = data.tasks.findIndex(t => t.id === newData.id);
                if (index !== -1) {
                    data.tasks[index] = { ...data.tasks[index], ...newData, subtasks: newSubtasks };
                }
            } else {
                newData.id = `task-${Date.now()}`;
                newData.subtasks = newSubtasks;
                data.tasks.push(newData);
            }
        } else if (newData.type === 'release') {
            if (newData.id) {
                const index = data.releases.findIndex(r => r.id === newData.id);
                if (index !== -1) data.releases[index] = { ...data.releases[index], ...newData };
            } else {
                newData.id = `release-${Date.now()}`;
                data.releases.push(newData);
            }
        } else if (newData.type === 'featureArea') {
            if (newData.id) {
                const index = data.featureAreas.findIndex(f => f.id === newData.id);
                if (index !== -1) data.featureAreas[index] = { ...data.featureAreas[index], ...newData };
            } else {
                newData.id = `feature-${Date.now()}`;
                data.featureAreas.push(newData);
            }
        }
        
        saveData();
        closeModal();
        render();
    };
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function editItem(type, id) {
    openModal(type, id);
}

function deleteItem(type, id) {
    if (!confirm('Are you sure?')) return;
    
    if (type === 'task') {
        data.tasks = data.tasks.filter(t => t.id !== id);
    } else if (type === 'release') {
        data.releases = data.releases.filter(r => r.id !== id);
        // Unassign tasks from this release instead of deleting?
        // Or delete tasks? "Cascading delete" was the previous behavior.
        // Let's keep cascading delete for consistency with previous behavior,
        // but now it's direct.
        data.tasks = data.tasks.filter(t => t.releaseId !== id);
    } else if (type === 'featureArea') {
        data.featureAreas = data.featureAreas.filter(f => f.id !== id);
        data.tasks = data.tasks.filter(t => t.featureAreaId !== id);
    }
    
    saveData();
    render();
}

// Initialize
loadData();

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
