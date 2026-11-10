import React, { useState, useEffect, useRef } from 'react';

// --- CONSTANTES & DADOS INICIAIS ---
const STORAGE_KEY = 'guepardo_task_state_v2';

const PROJECT_COLORS = [
  '#eb4034', '#53ba3a', '#3aba9a', '#3a71ba', 
  '#a93aba', '#d46e2a', '#d42a2a', '#db586e',
  '#FBBF24', '#F97316', '#374151', '#111827'
];

const INITIAL_PROJECTS = [
  { id: 1, name: 'Baja SAE 2027', color: '#FBBF24' },
  { id: 2, name: 'Manufatura Chassi', color: '#F97316' },
  { id: 3, name: 'Pesquisa Materiais', color: '#374151' }
];

const INITIAL_TASKS = [
  { id: 1, projectId: 1, title: 'Projeto Conceptual', column: 'fazer', priority: 'alta', createdAt: '04/11/2026', lastMovedAt: null, links: [], subtasks: [] },
  { id: 2, projectId: 1, title: 'Validação CAD e simulação de elementos finitos no Chassi', column: 'fazendo', priority: 'urgente', createdAt: '02/11/2026', lastMovedAt: '04/11/2026 14:30', links: [], subtasks: [] },
];

const INITIAL_GANTT = [
  { id: 1, title: 'Projeto Conceptual', start: 1, end: 5, color: '#3a71ba', row: 0 },
  { id: 2, title: 'Validação CAD', start: 6, end: 12, color: '#53ba3a', row: 1 },
];

const INITIAL_EVENTS = [
  { id: 1, title: 'Entrega Relatório', date: '2026-11-20', type: 'marco', color: '#eb4034' },
  { id: 2, title: 'Reunião Geral', date: '2026-11-28', type: 'marco', color: '#3a71ba' },
  { id: 3, title: 'Feriado', date: '2026-11-15', type: 'feriado', color: '#374151' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('kanban');

  // Inicialização com Carregamento Automático do localStorage
  const loadInitialState = (key, fallback) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key]) return parsed[key];
      }
    } catch (e) {
      console.error(`Erro ao carregar ${key} do localStorage:`, e);
    }
    return fallback;
  };

  const [projects, setProjects] = useState(() => loadInitialState('projects', INITIAL_PROJECTS));
  const [tasks, setTasks] = useState(() => loadInitialState('tasks', INITIAL_TASKS));
  const [ganttSteps, setGanttSteps] = useState(() => loadInitialState('ganttSteps', INITIAL_GANTT));
  const [dependencies, setDependencies] = useState(() => loadInitialState('dependencies', [{ id: 1, from: 1, to: 2 }]));
  const [events, setEvents] = useState(() => loadInitialState('events', INITIAL_EVENTS));
  const [milestones, setMilestones] = useState(() => loadInitialState('milestones', [{ id: 1, title: 'Design Freeze', day: 15, isDeadline: false }]));

  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const [currentDate] = useState(new Date(2026, 10, 4));

  const [taskDrawer, setTaskDrawer] = useState({ isOpen: false, taskId: null });
  const [ganttDrawer, setGanttDrawer] = useState({ isOpen: false, stepId: null });
  const [eventDrawer, setEventDrawer] = useState({ isOpen: false, event: null });

  // Persistência Automática a cada modificação nos dados
  useEffect(() => {
    const payload = { projects, tasks, ganttSteps, dependencies, events, milestones };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [projects, tasks, ganttSteps, dependencies, events, milestones]);

  // Funções de Importação e Exportação de Backup
  const handleExportBackup = () => {
    const payload = { projects, tasks, ganttSteps, dependencies, events, milestones };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', `guepardo_task_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.projects) setProjects(data.projects);
        if (data.tasks) setTasks(data.tasks);
        if (data.ganttSteps) setGanttSteps(data.ganttSteps);
        if (data.dependencies) setDependencies(data.dependencies);
        if (data.events) setEvents(data.events);
        if (data.milestones) setMilestones(data.milestones);
        alert('Backup carregado com sucesso!');
      } catch (err) {
        alert('Falha ao importar: Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  const getCurrentFormattedDate = () => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const getShortDate = () => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  };

  // --- KANBAN LOGIC ---
  const handleDragStart = (e, taskId) => e.dataTransfer.setData('taskId', taskId.toString());
  const handleDrop = (e, column) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    setTasks(tasks.map(t => t.id === taskId ? { ...t, column, lastMovedAt: getCurrentFormattedDate() } : t));
  };
  const addTask = (column) => setTasks([...tasks, { id: Date.now(), projectId: selectedProjectId, title: 'Nova Tarefa', column, priority: 'media', createdAt: getShortDate(), lastMovedAt: null, links: [], subtasks: [] }]);
  const updateTask = (id, updates) => setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));

  // --- GANTT LOGIC ---
  const [isConnecting, setIsConnecting] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const ganttRef = useRef(null);

  const propagateDependencies = (steps, stepId, deltaDays) => {
    let updatedSteps = [...steps];
    dependencies.filter(d => d.from === stepId).forEach(dep => {
      const parent = updatedSteps.find(s => s.id === dep.from);
      const child = updatedSteps.find(s => s.id === dep.to);
      if (parent && child && parent.end >= child.start) {
        const shift = (parent.end - child.start) + 1;
        updatedSteps[updatedSteps.findIndex(s => s.id === child.id)] = { ...child, start: child.start + shift, end: child.end + shift };
        updatedSteps = propagateDependencies(updatedSteps, child.id, shift);
      }
    });
    return updatedSteps;
  };

  const moveGanttStep = (id, deltaX) => {
    const deltaDays = Math.round(deltaX / 40);
    if (deltaDays === 0) return;
    let newSteps = [...ganttSteps];
    const stepIndex = newSteps.findIndex(s => s.id === id);
    const step = newSteps[stepIndex];
    const newStart = Math.max(1, step.start + deltaDays);
    newSteps[stepIndex] = { ...step, start: newStart, end: Math.min(120, newStart + (step.end - step.start)) };
    setGanttSteps(propagateDependencies(newSteps, id, deltaDays));
  };
  const deleteDependency = (depId) => setDependencies(dependencies.filter(d => d.id !== depId));

  // --- RENDERIZADORES ---
  const renderSidebar = () => (
    <div className="w-full h-16 md:w-64 md:h-full bg-gray-900 text-white flex flex-row md:flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] md:shadow-2xl relative z-50 shrink-0">
      
      <div className="p-3 md:p-6 flex flex-col items-center justify-center border-r md:border-r-0 md:border-b border-gray-800 w-20 md:w-full shrink-0">
        <img src="guepardo_logo.png" alt="Símbolo Guepardo" className="w-8 h-8 md:w-16 md:h-16 object-contain md:mb-3" />
        <img src="guepardo_text.png" alt="Guepardo Motoracing" className="hidden md:block w-full h-8 object-contain" />
      </div>
      
      <nav className="flex-1 flex flex-row md:flex-col justify-center items-center md:items-stretch p-2 md:p-4 gap-4 md:gap-0 md:space-y-2">
        <button onClick={() => setActiveTab('kanban')} className={`p-3 rounded-xl md:rounded flex items-center justify-center md:justify-start gap-3 transition-colors ${activeTab === 'kanban' ? 'bg-orange-600 font-bold' : 'hover:bg-gray-800'}`}>
          <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
          <span className="hidden md:block">Kanban</span>
        </button>
        <button onClick={() => setActiveTab('gantt')} className={`p-3 rounded-xl md:rounded flex items-center justify-center md:justify-start gap-3 transition-colors ${activeTab === 'gantt' ? 'bg-orange-600 font-bold' : 'hover:bg-gray-800'}`}>
          <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
          <span className="hidden md:block">Gantt</span>
        </button>
        <button onClick={() => setActiveTab('calendar')} className={`p-3 rounded-xl md:rounded flex items-center justify-center md:justify-start gap-3 transition-colors ${activeTab === 'calendar' ? 'bg-orange-600 font-bold' : 'hover:bg-gray-800'}`}>
          <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span className="hidden md:block">Calendário</span>
        </button>
      </nav>

      {/* PAINEL DE BACKUP (POSICIONADO LOGO ACIMA DA LOGO EESC-USP) */}
      <div className="hidden md:flex flex-col gap-2 p-4 border-t border-gray-800 text-xs">
        <button 
          onClick={handleExportBackup}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 px-3 rounded font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar Backup
        </button>

        <label className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 px-3 rounded font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Importar Backup
          <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
        </label>
      </div>

      <div className="p-3 md:p-6 md:mt-auto flex items-center justify-center border-l md:border-l-0 border-gray-800 w-20 md:w-full shrink-0">
        <img src="eesc_usp_logo.png" alt="EESC USP" className="w-12 md:w-full object-contain filter invert brightness-0 opacity-80 hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );

  const renderKanban = () => {
    const columns = ['fazer', 'fazendo', 'bloqueado', 'feito'];
    const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);
    const activeProject = projects.find(p => p.id === selectedProjectId);

    return (
      <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative">
        <div className="p-4 md:p-6 bg-white border-b shadow-sm z-10 flex gap-4 overflow-x-auto">
          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedProjectId(p.id)}
              className={`p-3 md:p-4 rounded-lg cursor-pointer min-w-[150px] md:min-w-[200px] font-bold text-white shadow-md transition-transform hover:-translate-y-1 ${p.id === selectedProjectId ? 'ring-4 ring-gray-900 ring-offset-2' : 'opacity-80'}`}
              style={{ backgroundColor: p.color }}
            >
              {p.name}
            </div>
          ))}
        </div>

        <div className="flex-1 flex overflow-x-auto p-4 md:p-6 gap-6 items-start">
          {columns.map(col => (
            <div key={col} className="bg-gray-200 rounded-xl p-4 w-72 md:w-80 shrink-0 flex flex-col shadow-inner" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col)}>
              <h3 className="font-bold text-gray-700 capitalize mb-4 uppercase text-sm tracking-wider">{col}</h3>
              <div className="flex-1 flex flex-col gap-3 min-h-[100px]">
                {projectTasks.filter(t => t.column === col).map(task => (
                  <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative flex flex-col justify-between">
                    
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <select 
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full outline-none appearance-none cursor-pointer uppercase ${task.priority === 'urgente' ? 'bg-red-100 text-red-700' : task.priority === 'alta' ? 'bg-orange-100 text-orange-700' : task.priority === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`} 
                        value={task.priority} 
                        onChange={(e) => updateTask(task.id, { priority: e.target.value })} 
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>

                      <button onClick={() => setTaskDrawer({ isOpen: true, taskId: task.id })} className="md:opacity-0 md:group-hover:opacity-100 font-bold px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded transition-all text-sm leading-none">+</button>
                    </div>

                    {/* CAMPO DE TÍTULO AUTO-RESPONSIVO (SE ADAPTA AO NÚMERO DE LINHAS SEM ALTURA MÍNIMA FIXA) */}
                    <textarea 
                      rows={1}
                      className="font-bold text-gray-800 w-full outline-none bg-transparent hover:bg-gray-50 p-1 -ml-1 rounded resize-none overflow-hidden text-sm leading-snug" 
                      value={task.title} 
                      ref={(node) => {
                        if (node) {
                          node.style.height = 'auto';
                          node.style.height = `${node.scrollHeight}px`;
                        }
                      }}
                      onChange={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                        updateTask(task.id, { title: e.target.value });
                      }} 
                      onMouseDown={(e) => e.stopPropagation()} 
                    />

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-end mt-2">
                      <span className="text-xs font-semibold text-gray-400 truncate max-w-[120px]">{activeProject?.name}</span>
                      <div className="text-[10px] text-gray-400 text-right font-medium leading-tight">
                        <div>Criado: {task.createdAt}</div>
                        {task.lastMovedAt && <div>Movido: {task.lastMovedAt}</div>}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
              <button onClick={() => addTask(col)} className="mt-4 p-2 text-gray-500 hover:bg-gray-300 rounded font-bold transition-colors">+ Nova Tarefa</button>
            </div>
          ))}
        </div>

        {/* GAVETA LATERAL KANBAN */}
        {taskDrawer.isOpen && (
          <div className="absolute top-0 right-0 w-full md:w-96 h-full bg-white shadow-2xl md:border-l p-6 z-50 overflow-y-auto">
            {(() => {
              const task = tasks.find(t => t.id === taskDrawer.taskId);
              if (!task) return null;
              return (
                <div className="flex flex-col h-full space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <h2 className="text-xl font-bold">Detalhes da Tarefa</h2>
                    <button onClick={() => setTaskDrawer({ isOpen: false, taskId: null })} className="text-gray-400 font-bold hover:text-red-500 text-xl">X</button>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Título</label>
                    <input className="w-full p-2 border rounded font-medium" value={task.title} onChange={e => updateTask(task.id, { title: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Links</label>
                    <div className="space-y-2 mb-2">
                      {task.links?.map((link, i) => (
                        <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                          <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex-1 text-sm font-bold truncate">{link.name}</a>
                          <button onClick={() => updateTask(task.id, { links: task.links.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-500 text-xs font-bold uppercase">Excluir</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { const name = prompt('Nome do link:'); const url = prompt('URL:'); if (name && url) updateTask(task.id, { links: [...(task.links||[]), {name, url}] }); }} className="text-sm font-bold text-orange-600 hover:text-orange-700">+ Adicionar Link</button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Etapas Internas</label>
                    <div className="space-y-2 mb-2">
                      {task.subtasks?.map((sub, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded border flex-wrap">
                          <input type="checkbox" checked={sub.completed} className="w-4 h-4 accent-orange-600" onChange={(e) => { const newSubtasks = [...task.subtasks]; newSubtasks[i] = { ...sub, completed: e.target.checked, completedAt: e.target.checked ? getShortDate() : null }; updateTask(task.id, { subtasks: newSubtasks }); }} />
                          <input className={`flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-bold ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700'}`} value={sub.title} onChange={(e) => { const newSubtasks = [...task.subtasks]; newSubtasks[i].title = e.target.value; updateTask(task.id, { subtasks: newSubtasks }); }} />
                          <button onClick={() => updateTask(task.id, { subtasks: task.subtasks.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-500 font-bold pl-1">X</button>
                          {sub.completed && sub.completedAt && <div className="w-full mt-1 text-[10px] text-green-600 font-bold whitespace-nowrap bg-green-50 px-1 py-0.5 rounded border border-green-200">Concluído: {sub.completedAt}</div>}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => updateTask(task.id, { subtasks: [...(task.subtasks||[]), { title: 'Nova Etapa', completed: false }] })} className="text-sm font-bold text-orange-600 hover:text-orange-700">+ Adicionar Etapa</button>
                  </div>

                  <div className="mt-auto pt-4 border-t pb-4 md:pb-0">
                    <button onClick={() => { setTasks(tasks.filter(t => t.id !== task.id)); setTaskDrawer({ isOpen: false, taskId: null }); }} className="w-full p-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded">
                      Excluir Tarefa
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderGantt = () => {
    const days = Array.from({ length: 120 }, (_, i) => i + 1);
    const drawConnections = () => dependencies.map(dep => {
      const fromStep = ganttSteps.find(s => s.id === dep.from);
      const toStep = ganttSteps.find(s => s.id === dep.to);
      if (!fromStep || !toStep) return null;
      const startX = fromStep.end * 40;
      const startY = (fromStep.row * 60) + 70 + 20;
      const endX = (toStep.start - 1) * 40;
      const endY = (toStep.row * 60) + 70 + 20;
      const pathData = `M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 30} ${endY}, ${endX} ${endY}`;
      return (
        <g key={dep.id}>
          <path d={pathData} fill="none" stroke="transparent" strokeWidth="15" className="cursor-pointer" onClick={() => deleteDependency(dep.id)} />
          <path d={pathData} fill="none" stroke="#9ca3af" strokeWidth="2" className="pointer-events-none hover:stroke-red-500 transition-colors" />
        </g>
      );
    });

    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        <div className="flex-1 overflow-auto relative select-none" ref={ganttRef}>
          <div className="w-[4800px] relative h-full min-h-[800px]">
            <div className="flex border-b sticky top-0 bg-white z-20">
              {days.map(d => <div key={d} className="w-[40px] flex-shrink-0 text-center text-xs text-gray-500 py-2 border-r bg-gray-50">{d}</div>)}
            </div>
            <div className="absolute top-10 left-0 w-full h-[calc(100%-40px)] flex pointer-events-none opacity-20">
              {days.map(d => <div key={d} className="w-[40px] flex-shrink-0 border-r border-gray-300"></div>)}
            </div>
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-auto z-10">{drawConnections()}</svg>
            {ganttSteps.map(step => (
              <div 
                key={step.id} className="absolute h-10 rounded shadow-md flex items-center px-3 text-white font-bold text-sm cursor-grab group z-20"
                style={{ left: `${(step.start - 1) * 40}px`, width: `${(step.end - step.start + 1) * 40}px`, top: `${step.row * 60 + 50}px`, backgroundColor: step.color }}
                onMouseDown={(e) => {
                  if (e.target.tagName === 'INPUT') return;
                  const startX = e.clientX;
                  const handleMouseMove = (moveEvent) => moveGanttStep(step.id, moveEvent.clientX - startX);
                  const handleMouseUp = () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
                  document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
                }}
              >
                <input className="bg-transparent border-none text-white outline-none w-full font-bold cursor-text" value={step.title} onChange={(e) => { const newSteps = [...ganttSteps]; newSteps.find(s => s.id === step.id).title = e.target.value; setGanttSteps(newSteps); }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
    const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div className="flex-1 flex flex-col md:flex-row bg-gray-50 overflow-hidden relative">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Novembro 2026</h1>
            <button onClick={() => setEventDrawer({ isOpen: true, event: { id: Date.now(), title: 'Novo Evento', date: '2026-11-10', type: 'marco', color: '#3a71ba' }})} className="w-full md:w-auto bg-gray-900 text-white px-4 py-3 md:py-2 rounded font-bold hover:bg-gray-800">
              + Adicionar Evento
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center font-bold text-gray-400 uppercase text-[10px] md:text-xs tracking-widest">{d}</div>
            ))}
            {daysInMonth.map(day => {
              const dateStr = `2026-11-${day.toString().padStart(2, '0')}`;
              const dayEvents = events.filter(e => e.date === dateStr);
              const isToday = day === 4; 
              
              return (
                <div key={day} className={`min-h-[80px] md:min-h-[120px] bg-white border p-1 md:p-2 rounded-lg md:rounded-xl flex flex-col shadow-sm transition-all hover:shadow-md ${isToday ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-100'}`}>
                  <div 
                    onClick={() => setEventDrawer({ isOpen: true, event: { id: Date.now(), title: 'Novo Evento', date: dateStr, type: 'marco', color: '#3a71ba' }})}
                    className="cursor-pointer text-right text-xs md:text-sm font-bold mb-1 md:mb-2 p-1 rounded hover:bg-gray-100"
                    style={dayEvents.length > 0 ? { color: dayEvents[0].color } : { color: isToday ? '#ea580c' : '#9ca3af' }}
                  >
                    NOV {day}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                    {dayEvents.map(e => (
                      <div key={e.id} onClick={() => setEventDrawer({ isOpen: true, event: { ...e }})} className="text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded font-bold text-white cursor-pointer truncate shadow-sm hover:opacity-80" style={{ backgroundColor: e.color }}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l shadow-xl flex flex-col h-1/3 md:h-full shrink-0">
          <div className="p-4 md:p-6 border-b">
            <h2 className="text-lg md:text-xl font-bold">Próximos Eventos</h2>
          </div>
          <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
            {sortedEvents.map(e => {
              const diffDays = Math.ceil((new Date(e.date) - currentDate) / (1000 * 60 * 60 * 24));
              let statusText = diffDays < 0 ? 'Passou' : diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Faltam ${diffDays} dias`;
              return (
                <div key={e.id} className="p-3 md:p-4 rounded-xl border flex items-center gap-3 md:gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setEventDrawer({ isOpen: true, event: { ...e }})}>
                  <div className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-50 border-2" style={{ borderColor: e.color }}>
                    <span className="text-[10px] font-bold text-gray-500 uppercase leading-none">Nov</span>
                    <span className="text-base md:text-lg font-black leading-none" style={{ color: e.color }}>{e.date.split('-')[2]}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm md:text-base text-gray-900 leading-tight truncate">{e.title}</h3>
                    <div className="flex gap-2 text-[10px] md:text-xs mt-1">
                      <span className={`font-bold ${diffDays < 0 ? 'text-gray-400' : 'text-orange-500'}`}>{statusText}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GAVETA LATERAL EVENTO */}
        {eventDrawer.isOpen && (
          <div className="absolute top-0 right-0 w-full md:w-80 h-full bg-white shadow-2xl md:border-l p-6 z-50">
             <div className="flex flex-col h-full space-y-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <h2 className="text-xl font-bold">{events.find(e => e.id === eventDrawer.event.id) ? 'Editar Evento' : 'Novo Evento'}</h2>
                  <button onClick={() => setEventDrawer({ isOpen: false, event: null })} className="text-gray-400 hover:text-red-500 font-bold text-xl">X</button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Título</label>
                  <input className="w-full p-2 border rounded font-medium" value={eventDrawer.event.title} onChange={e => setEventDrawer({ ...eventDrawer, event: { ...eventDrawer.event, title: e.target.value }})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Data</label>
                  <input type="date" className="w-full p-2 border rounded font-medium" value={eventDrawer.event.date} onChange={e => setEventDrawer({ ...eventDrawer, event: { ...eventDrawer.event, date: e.target.value }})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Cor do Evento</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map(c => (
                      <button key={c} onClick={() => setEventDrawer({ ...eventDrawer, event: { ...eventDrawer.event, color: c }})} className={`w-8 h-8 rounded-full shadow-sm border-2 ${eventDrawer.event.color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t flex flex-col gap-2 pb-4 md:pb-0">
                  <button onClick={() => { setEvents(events.find(e => e.id === eventDrawer.event.id) ? events.map(e => e.id === eventDrawer.event.id ? eventDrawer.event : e) : [...events, eventDrawer.event]); setEventDrawer({ isOpen: false, event: null }); }} className="w-full p-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded">
                    Salvar
                  </button>
                  {events.find(e => e.id === eventDrawer.event.id) && (
                    <button onClick={() => { setEvents(events.filter(e => e.id !== eventDrawer.event.id)); setEventDrawer({ isOpen: false, event: null }); }} className="w-full p-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded">
                      Excluir
                    </button>
                  )}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col-reverse md:flex-row h-[100dvh] font-sans bg-gray-100 overflow-hidden text-gray-800 selection:bg-orange-200">
      {renderSidebar()}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'kanban' && renderKanban()}
        {activeTab === 'gantt' && renderGantt()}
        {activeTab === 'calendar' && renderCalendar()}
      </div>
    </div>
  );
}
