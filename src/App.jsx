import React, { useState, useEffect, useRef } from 'react';

// --- CONSTANTES & DADOS INICIAIS ---
const STORAGE_KEY = 'guepardo_task_state_v2';

const PROJECT_COLORS = [
  '#FBBF24', '#F97316', '#4B5563', '#000000', '#eb4034', '#53ba3a', 
  '#3aba9a', '#3a71ba', '#a93aba', '#d46e2a', '#d42a2a', '#db586e'
];

const INITIAL_PROJECTS = [
  { id: 1, name: 'Baja SAE 2027', color: '#FBBF24' },
  { id: 2, name: 'Manufatura Chassi', color: '#F97316' },
  { id: 3, name: 'Pesquisa Materiais', color: '#4B5563' }
];

const INITIAL_TASKS = [
  { id: 1, projectId: 1, title: 'Projeto Conceptual', column: 'feito', priority: 'alta', subgroup: 'Projeto', description: '', createdAt: '04/11/2026', lastMovedAt: '11/11/2026 15:34', links: [], subtasks: [] },
  { id: 2, projectId: 1, title: 'Validação CAD e simulação de elementos finitos no Chassi', column: 'fazendo', priority: 'urgente', subgroup: 'FEA', description: '', createdAt: '02/11/2026', lastMovedAt: '04/11/2026 14:30', links: [], subtasks: [] },
];

const INITIAL_GANTT = [
  { id: 1, title: 'Projeto Conceptual', start: 1, end: 5, color: '#3a71ba', row: 0 },
  { id: 2, title: 'Validação CAD', start: 7, end: 14, color: '#53ba3a', row: 1 },
  { id: 3, title: 'Nova Etapa', start: 9, end: 14, color: '#374151', row: 2 },
];

const INITIAL_EVENTS = [
  { id: 1, title: 'Reunião Geral', date: '2026-11-28', type: 'Evento Normal', description: 'Alinhamento com capitão', color: '#3a71ba' },
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
  const [milestones, setMilestones] = useState(() => loadInitialState('milestones', [{ id: 1, title: 'Design Freeze', day: 15, color: '#FBBF24' }]));

  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || 1);
  const [currentDate] = useState(new Date(2026, 10, 4));

  const [taskDrawer, setTaskDrawer] = useState({ isOpen: false, taskId: null });
  const [ganttDrawer, setGanttDrawer] = useState({ isOpen: false, stepId: null });
  const [eventDrawer, setEventDrawer] = useState({ isOpen: false, event: null });
  const [projectDrawer, setProjectDrawer] = useState({ isOpen: false, projectId: null });
  const [editingGanttTitleId, setEditingGanttTitleId] = useState(null);

  // Estados temporários para inputs
  const [draftSubtask, setDraftSubtask] = useState('');
  const [draftLinkName, setDraftLinkName] = useState('');
  const [draftLinkUrl, setDraftLinkUrl] = useState('');

  // Persistência Automática
  useEffect(() => {
    const payload = { projects, tasks, ganttSteps, dependencies, events, milestones };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [projects, tasks, ganttSteps, dependencies, events, milestones]);

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
  const addTask = (column) => setTasks([...tasks, { id: Date.now(), projectId: selectedProjectId, title: 'Nova Tarefa', column, priority: 'media', subgroup: '', description: '', createdAt: getShortDate(), lastMovedAt: null, links: [], subtasks: [] }]);
  const updateTask = (id, updates) => setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));

  const handleAddSubtask = (taskId) => {
    if (!draftSubtask.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, { subtasks: [...(task.subtasks||[]), { title: draftSubtask, completed: false }] });
    setDraftSubtask('');
  };

  const handleAddLink = (taskId) => {
    if (!draftLinkUrl.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, { links: [...(task.links||[]), { name: draftLinkName || 'Link', url: draftLinkUrl }] });
    setDraftLinkName('');
    setDraftLinkUrl('');
  };

  const addProject = () => {
    const name = prompt('Nome do novo projeto:');
    if (name) {
      const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
      const newId = Date.now();
      setProjects([...projects, { id: newId, name, color }]);
      setSelectedProjectId(newId);
    }
  };

  // --- GANTT LOGIC ---
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

  const handleGanttAction = (e, actionType, stepId) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const stepIndex = ganttSteps.findIndex(s => s.id === stepId);
    const step = ganttSteps[stepIndex];
    if (!step) return;

    const initialStart = step.start;
    const initialEnd = step.end;
    const initialRow = step.row;

    const handleMouseMove = (moveEvent) => {
      const deltaDays = Math.round((moveEvent.clientX - startX) / 40);
      const deltaRows = Math.round((moveEvent.clientY - startY) / 60);
      let newSteps = [...ganttSteps];

      if (actionType === 'move') {
        const newStart = Math.max(1, initialStart + deltaDays);
        const newRow = Math.max(0, initialRow + deltaRows);
        const duration = initialEnd - initialStart;
        newSteps[stepIndex] = { ...step, start: newStart, end: newStart + duration, row: newRow };
        setGanttSteps(propagateDependencies(newSteps, stepId, newStart - initialStart));
      } else if (actionType === 'resizeLeft') {
        const newStart = Math.min(initialEnd, Math.max(1, initialStart + deltaDays));
        newSteps[stepIndex] = { ...step, start: newStart };
        setGanttSteps(propagateDependencies(newSteps, stepId, newStart - initialStart));
      } else if (actionType === 'resizeRight') {
        const newEnd = Math.max(initialStart, initialEnd + deltaDays);
        newSteps[stepIndex] = { ...step, end: newEnd };
        setGanttSteps(propagateDependencies(newSteps, stepId, 0));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMilestoneDrag = (e, milestoneId) => {
    e.stopPropagation();
    const startX = e.clientX;
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    
    const initialDay = milestone.day;

    const handleMouseMove = (moveEvent) => {
      const deltaDays = Math.round((moveEvent.clientX - startX) / 40);
      const newDay = Math.max(1, initialDay + deltaDays);
      setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, day: newDay } : m));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const deleteDependency = (depId) => setDependencies(dependencies.filter(d => d.id !== depId));
  const updateGanttStep = (id, updates) => setGanttSteps(ganttSteps.map(s => s.id === id ? { ...s, ...updates } : s));

  // --- RENDERIZADORES ---
  const renderSidebar = () => (
    <div className="w-full h-16 md:w-64 md:h-full bg-[#1A1C23] text-white flex flex-row md:flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] md:shadow-2xl relative z-50 shrink-0">
      <div className="p-3 md:p-6 flex flex-col items-center justify-center border-r md:border-r-0 md:border-b border-gray-800 w-20 md:w-full shrink-0">
        <img src="guepardo_logo.png" alt="Símbolo Guepardo" className="w-8 h-8 md:w-16 md:h-16 object-contain md:mb-3" />
        <img src="guepardo_text.png" alt="Guepardo Motoracing" className="hidden md:block w-full h-8 object-contain" />
      </div>
      
      <nav className="flex-1 flex flex-row md:flex-col justify-center items-center md:items-stretch p-2 md:p-4 gap-4 md:gap-2 md:space-y-2">
        <button onClick={() => setActiveTab('kanban')} className={`p-3 rounded-lg flex items-center justify-center md:justify-start gap-3 transition-colors ${activeTab === 'kanban' ? 'bg-[#FF6B00] font-bold text-white' : 'hover:bg-gray-800 text-gray-300'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path strokeLinecap="round" strokeWidth="2" d="M9 4v16M15 4v16"/></svg>
          <span className="hidden md:block">Kanban</span>
        </button>
        <button onClick={() => setActiveTab('gantt')} className={`p-3 rounded-lg flex items-center justify-center md:justify-start gap-3 transition-colors ${activeTab === 'gantt' ? 'bg-[#FF6B00] font-bold text-white' : 'hover:bg-gray-800 text-gray-300'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h6M4 12h10M4 18h6 M12 6h8 M16 18h4"></path></svg>
          <span className="hidden md:block">Gantt</span>
        </button>
        <button onClick={() => setActiveTab('calendar')} className={`p-3 rounded-lg flex items-center justify-center md:justify-start gap-3 transition-colors ${activeTab === 'calendar' ? 'bg-[#FF6B00] font-bold text-white' : 'hover:bg-gray-800 text-gray-300'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line strokeLinecap="round" strokeWidth="2" x1="16" y1="2" x2="16" y2="6"></line><line strokeLinecap="round" strokeWidth="2" x1="8" y1="2" x2="8" y2="6"></line><line strokeLinecap="round" strokeWidth="2" x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span className="hidden md:block">Calendário</span>
        </button>
      </nav>

      {/* Backup e Logo da USP no final */}
      <div className="hidden md:flex flex-col gap-3 p-4 pt-6 border-t border-gray-800 mt-auto">
        <div className="flex flex-col gap-2 text-xs">
          <button onClick={handleExportBackup} className="w-full bg-[#2A2D3A] hover:bg-gray-700 text-gray-200 py-2.5 px-3 rounded font-bold transition-colors">
            Exportar Backup
          </button>
          <label className="w-full bg-[#2A2D3A] hover:bg-gray-700 text-gray-200 py-2.5 px-3 rounded font-bold text-center cursor-pointer transition-colors">
            Importar Backup
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
        <img src="eesc_usp_logo.png" alt="EESC USP" className="w-full h-auto mt-2 object-contain filter invert brightness-0 opacity-80 hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );

  const renderKanban = () => {
    const columns = ['fazer', 'fazendo', 'bloqueado', 'feito'];
    const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);
    const activeProject = projects.find(p => p.id === selectedProjectId);

    return (
      <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden relative">
        <div className="pt-4 px-4 bg-white border-b shadow-sm z-10 flex gap-2 overflow-x-auto items-end h-16">
          {projects.map(p => (
            <div 
              key={p.id} 
              className={`group relative p-3 pb-2 rounded-t-lg cursor-pointer min-w-[150px] font-bold text-white transition-all flex justify-between items-center ${p.id === selectedProjectId ? 'border-b-0 z-20 shadow-md ring-2 ring-offset-2 ring-gray-400' : 'opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: p.color }}
            >
              <span onClick={() => setSelectedProjectId(p.id)} className="flex-1 text-sm truncate">{p.name}</span>
              <button onClick={(e) => { e.stopPropagation(); setProjectDrawer({ isOpen: true, projectId: p.id }); }} className="opacity-0 group-hover:opacity-100 text-white bg-black/20 hover:bg-black/40 rounded px-2 py-0.5 ml-2 text-xs transition-opacity">✎</button>
            </div>
          ))}
          <button onClick={addProject} className="p-2.5 pb-2 mb-0.5 rounded-t-lg cursor-pointer font-bold bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors flex items-center justify-center w-10 text-sm">
            +
          </button>
        </div>

        <div className="flex-1 flex overflow-x-auto p-4 md:p-8 gap-6 items-start">
          {columns.map(col => (
            <div key={col} className="bg-[#E5E7EB] rounded-lg p-4 w-72 md:w-[340px] shrink-0 flex flex-col shadow-sm border border-gray-200" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col)}>
              <h3 className="font-bold text-gray-700 mb-4 uppercase text-xs tracking-wider">{col}</h3>
              <div className="flex-1 flex flex-col gap-3 min-h-[100px]">
                {projectTasks.filter(t => t.column === col).map(task => (
                  <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onClick={() => setTaskDrawer({ isOpen: true, taskId: task.id })} className="bg-white p-4 rounded shadow-sm border border-gray-100 cursor-grab hover:shadow-md transition-shadow group relative flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${task.priority === 'urgente' ? 'bg-red-100 text-red-700' : task.priority === 'alta' ? 'bg-orange-100 text-orange-700' : task.priority === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 text-sm leading-snug mb-3">
                      {task.title}
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                      <span className="text-xs font-semibold text-gray-400 truncate max-w-[120px]">{activeProject?.name}</span>
                      <div className="text-[10px] text-gray-400 text-right font-medium leading-tight">
                        <div>Criado: {task.createdAt}</div>
                        {task.lastMovedAt && <div>Movido: {task.lastMovedAt}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => addTask(col)} className="mt-4 p-2 text-gray-500 hover:bg-gray-300 rounded font-bold transition-colors text-sm">+ Nova Tarefa</button>
            </div>
          ))}
        </div>

        {/* GAVETA DE EDIÇÃO DO PROJETO */}
        {projectDrawer.isOpen && (
          <div className="absolute top-0 right-0 w-full md:w-80 h-full bg-white shadow-2xl md:border-l p-6 z-50">
             {(() => {
               const proj = projects.find(p => p.id === projectDrawer.projectId);
               if (!proj) return null;
               return (
                 <div className="flex flex-col h-full space-y-5">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <h2 className="text-lg font-bold text-[#2A3143]">Editar Projeto</h2>
                      <button onClick={() => setProjectDrawer({ isOpen: false, projectId: null })} className="text-gray-400 hover:text-gray-800 text-xl font-light">✕</button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Nome do Projeto</label>
                      <input className="w-full p-2.5 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none" value={proj.name} onChange={e => setProjects(projects.map(p => p.id === proj.id ? { ...p, name: e.target.value } : p))} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase">Cor do Projeto</label>
                      <div className="flex flex-wrap gap-2">
                        {PROJECT_COLORS.map(c => (
                          <button key={c} onClick={() => setProjects(projects.map(p => p.id === proj.id ? { ...p, color: c } : p))} className={`w-7 h-7 rounded-full shadow-sm border-2 ${proj.color === c ? 'border-gray-900 scale-125' : 'border-transparent hover:scale-110'} transition-transform`} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t">
                      <button onClick={() => { if(confirm('Tem certeza que deseja excluir o projeto e as tarefas associadas?')){ setProjects(projects.filter(p => p.id !== proj.id)); setTasks(tasks.filter(t => t.projectId !== proj.id)); setProjectDrawer({ isOpen: false, projectId: null }); setSelectedProjectId(projects[0]?.id || null); } }} className="text-xs text-red-500 font-bold hover:underline">
                        Excluir Projeto
                      </button>
                    </div>
                 </div>
               )
             })()}
          </div>
        )}

        {/* GAVETA LATERAL KANBAN */}
        {taskDrawer.isOpen && (
          <div className="absolute top-0 right-0 w-full md:w-[420px] h-full bg-white shadow-2xl md:border-l p-6 z-50 overflow-y-auto">
            {(() => {
              const task = tasks.find(t => t.id === taskDrawer.taskId);
              if (!task) return null;
              return (
                <div className="flex flex-col h-full space-y-5">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <h2 className="text-lg font-bold text-[#2A3143]">Detalhes da Tarefa</h2>
                    <button onClick={() => setTaskDrawer({ isOpen: false, taskId: null })} className="text-gray-400 hover:text-gray-800 text-xl font-light">✕</button>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Título</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none focus:border-gray-400" value={task.title} onChange={e => updateTask(task.id, { title: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Prioridade</label>
                      <select className="w-full p-2.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none bg-white appearance-none" value={task.priority} onChange={e => updateTask(task.id, { priority: e.target.value })}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Subgrupo</label>
                      <input className="w-full p-2.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none" value={task.subgroup || ''} onChange={e => updateTask(task.id, { subgroup: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Descrição & Links</label>
                    <textarea className="w-full p-2.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none min-h-[120px] resize-y" placeholder="Detalhes..." value={task.description || ''} onChange={e => updateTask(task.id, { description: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Etapas / Sub-tarefas</label>
                    <div className="space-y-2 mb-2">
                      {task.subtasks?.map((sub, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" checked={sub.completed} className="w-4 h-4 accent-gray-600 cursor-pointer" onChange={(e) => { const newSubtasks = [...task.subtasks]; newSubtasks[i] = { ...sub, completed: e.target.checked, completedAt: e.target.checked ? getShortDate() : null }; updateTask(task.id, { subtasks: newSubtasks }); }} />
                          <input className={`flex-1 min-w-0 bg-transparent border-b border-transparent focus:border-gray-300 outline-none text-sm ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700'}`} value={sub.title} onChange={(e) => { const newSubtasks = [...task.subtasks]; newSubtasks[i].title = e.target.value; updateTask(task.id, { subtasks: newSubtasks }); }} />
                          <button onClick={() => updateTask(task.id, { subtasks: task.subtasks.filter((_, idx) => idx !== i) })} className="text-gray-300 hover:text-red-500 font-bold px-1">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input className="flex-1 p-2 border border-gray-200 rounded text-sm focus:outline-none" placeholder="Nova etapa..." value={draftSubtask} onChange={e => setDraftSubtask(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleAddSubtask(task.id) }} />
                      <button onClick={() => handleAddSubtask(task.id)} className="bg-[#E5E7EB] hover:bg-gray-300 px-3 rounded font-bold text-gray-600">+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Links Anexados</label>
                    <div className="space-y-2 mb-2">
                      {task.links?.map((link, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex-1 truncate font-medium">{link.name}</a>
                          <button onClick={() => updateTask(task.id, { links: task.links.filter((_, idx) => idx !== i) })} className="text-gray-300 hover:text-red-500 font-bold px-1">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input className="w-1/3 p-2 border border-gray-200 rounded text-sm focus:outline-none" placeholder="Nome (Ex: Docs)" value={draftLinkName} onChange={e => setDraftLinkName(e.target.value)} />
                      <input className="flex-1 p-2 border border-gray-200 rounded text-sm focus:outline-none" placeholder="https://..." value={draftLinkUrl} onChange={e => setDraftLinkUrl(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleAddLink(task.id) }} />
                      <button onClick={() => handleAddLink(task.id)} className="bg-[#E5E7EB] hover:bg-gray-300 px-3 rounded font-bold text-gray-600">+</button>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t">
                    <button onClick={() => { setTasks(tasks.filter(t => t.id !== task.id)); setTaskDrawer({ isOpen: false, taskId: null }); }} className="text-xs text-red-500 font-bold hover:underline">
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
      const startY = (fromStep.row * 60) + 70;
      const endX = (toStep.start - 1) * 40;
      const endY = (toStep.row * 60) + 70;
      const pathData = `M ${startX} ${startY} C ${startX + 15} ${startY}, ${endX - 15} ${endY}, ${endX} ${endY}`;
      return (
        <g key={dep.id}>
          <path d={pathData} fill="none" stroke="transparent" strokeWidth="15" className="cursor-pointer" onClick={() => deleteDependency(dep.id)} />
          <path d={pathData} fill="none" stroke="#9ca3af" strokeWidth="2" className="pointer-events-none hover:stroke-red-500 transition-colors" />
        </g>
      );
    });

    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        <div className="flex justify-between items-center p-4 md:px-8 border-b bg-gray-50 z-30">
           <h2 className="text-xl md:text-2xl font-bold text-[#1A202C]">Cronograma / Gantt</h2>
           <div className="flex gap-2">
             <button 
                onClick={() => { 
                  const maxEnd = ganttSteps.length > 0 ? Math.max(...ganttSteps.map(s => s.end)) : 1;
                  setMilestones([...milestones, {id: Date.now(), title: 'Novo Milestone', day: maxEnd, color: '#FBBF24'}]); 
                }} 
                className="bg-[#FBBF24] hover:bg-[#F59E0B] text-black px-3 md:px-4 py-2 font-bold text-sm rounded shadow-sm flex items-center gap-1 transition-colors"
             >
               <span className="text-lg leading-none">⚑</span> Novo Milestone
             </button>
             <button onClick={() => setGanttSteps([...ganttSteps, {id: Date.now(), title: 'Nova Etapa', start: 1, end: 5, color: '#374151', row: ganttSteps.length}])} className="bg-[#374151] hover:bg-gray-900 text-white px-3 md:px-4 py-2 font-bold text-sm rounded shadow-sm transition-colors">
               + Nova Etapa
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-auto relative select-none" ref={ganttRef}>
          <div className="w-[4800px] relative h-full min-h-[800px]">
            <div className="flex border-b sticky top-0 bg-white z-20 shadow-sm">
              {days.map(d => <div key={d} className="w-[40px] flex-shrink-0 text-center text-[10px] text-gray-500 py-2 border-r bg-[#F9FAFB]">{d}</div>)}
            </div>
            
            <div className="absolute top-10 left-0 w-full h-[calc(100%-40px)] flex pointer-events-none opacity-20">
              {days.map(d => <div key={d} className="w-[40px] flex-shrink-0 border-r border-gray-300"></div>)}
            </div>
            
            {/* MILESTONES CORRIGIDOS COM POINTER-EVENTS ATIVO */}
            {milestones.map(m => (
              <div key={m.id} className="absolute top-0 h-full w-0.5 z-20" style={{ left: `${(m.day - 1) * 40 + 20}px`, backgroundColor: m.color || '#FBBF24' }}>
                <div 
                  className="absolute top-[42px] left-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded shadow cursor-grab active:cursor-grabbing hover:scale-110 transition-transform select-none" 
                  style={{ backgroundColor: m.color || '#FBBF24', color: m.color === '#ef4444' ? 'white' : 'black' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setMilestones(milestones.map(mile => mile.id === m.id ? { ...mile, color: mile.color === '#FBBF24' ? '#ef4444' : '#FBBF24' } : mile));
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMilestones(milestones.filter(mile => mile.id !== m.id));
                  }}
                  onMouseDown={(e) => handleMilestoneDrag(e, m.id)}
                >
                  ⚑
                </div>
              </div>
            ))}

            <svg className="absolute top-0 left-0 w-full h-full pointer-events-auto z-10">{drawConnections()}</svg>
            
            {ganttSteps.map(step => (
              <div 
                key={step.id} className="absolute h-10 rounded shadow-md flex items-center text-white font-bold text-sm group z-20 hover:brightness-110 transition-[filter]"
                style={{ left: `${(step.start - 1) * 40}px`, width: `${(step.end - step.start + 1) * 40}px`, top: `${step.row * 60 + 50}px`, backgroundColor: step.color }}
              >
                {/* Esticador Esquerdo */}
                <div className="absolute left-0 top-0 w-3 h-full cursor-w-resize bg-black/0 hover:bg-black/10 rounded-l" onMouseDown={(e) => handleGanttAction(e, 'resizeLeft', step.id)} />

                {/* Arrastar e Editar (Meio) */}
                <div className="flex-1 w-full h-full flex items-center px-4 cursor-grab active:cursor-grabbing overflow-hidden" onMouseDown={(e) => handleGanttAction(e, 'move', step.id)}>
                   {editingGanttTitleId === step.id ? (
                      <input
                        autoFocus
                        className="bg-black/20 border-none text-white outline-none w-full font-bold px-1 rounded shadow-inner"
                        defaultValue={step.title}
                        onBlur={(e) => { updateGanttStep(step.id, { title: e.target.value }); setEditingGanttTitleId(null); }}
                        onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                        onMouseDown={e => e.stopPropagation()}
                      />
                   ) : (
                      <span className="truncate w-full select-none" onDoubleClick={(e) => { e.stopPropagation(); setEditingGanttTitleId(step.id); }}>
                        {step.title}
                      </span>
                   )}
                </div>

                {/* Botão de Configuração Oculto (Aparece ao Hover) */}
                <button onClick={() => setGanttDrawer({ isOpen: true, stepId: step.id })} className="absolute right-4 opacity-0 group-hover:opacity-100 text-white bg-black/20 hover:bg-black/40 rounded px-1.5 py-0.5 text-[10px] transition-opacity z-10" onMouseDown={e => e.stopPropagation()}>⚙️</button>

                {/* Esticador Direito */}
                <div className="absolute right-0 top-0 w-3 h-full cursor-e-resize bg-black/0 hover:bg-black/10 rounded-r" onMouseDown={(e) => handleGanttAction(e, 'resizeRight', step.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* GAVETA DE CONFIGURAÇÃO DE ETAPAS GANTT */}
        {ganttDrawer.isOpen && (
          <div className="absolute top-0 right-0 w-full md:w-80 h-full bg-white shadow-2xl md:border-l p-6 z-50">
             {(() => {
               const step = ganttSteps.find(s => s.id === ganttDrawer.stepId);
               if (!step) return null;
               return (
                 <div className="flex flex-col h-full space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <h2 className="text-lg font-bold text-gray-800">Configurar Etapa</h2>
                      <button onClick={() => setGanttDrawer({ isOpen: false, stepId: null })} className="text-gray-400 hover:text-gray-800 text-xl font-light">✕</button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Título</label>
                      <input className="w-full p-2 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none focus:border-gray-400" value={step.title} onChange={e => updateGanttStep(step.id, { title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Início (Dia)</label>
                        <input type="number" className="w-full p-2 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none" value={step.start} onChange={e => updateGanttStep(step.id, { start: parseInt(e.target.value) || 1 })} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Fim (Dia)</label>
                        <input type="number" className="w-full p-2 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none" value={step.end} onChange={e => updateGanttStep(step.id, { end: parseInt(e.target.value) || 1 })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Linha Horizontal (Row)</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none" value={step.row} onChange={e => updateGanttStep(step.id, { row: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase">Cor</label>
                      <div className="flex flex-wrap gap-2">
                        {PROJECT_COLORS.map(c => (
                          <button key={c} onClick={() => updateGanttStep(step.id, { color: c })} className={`w-6 h-6 rounded-full shadow-sm border-2 ${step.color === c ? 'border-gray-900 scale-125' : 'border-transparent hover:scale-110'} transition-transform`} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t">
                      <button onClick={() => { setGanttSteps(ganttSteps.filter(s => s.id !== step.id)); setGanttDrawer({ isOpen: false, stepId: null }); }} className="text-xs text-red-500 font-bold hover:underline">
                        Excluir Etapa
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

  const renderCalendar = () => {
    const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
    const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div className="flex-1 flex flex-col md:flex-row bg-gray-50 overflow-hidden relative">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Novembro 2026</h1>
            <button onClick={() => setEventDrawer({ isOpen: true, event: { id: Date.now(), title: 'Novo Evento', date: '2026-11-10', type: 'Evento Normal', description: '', color: '#3a71ba' }})} className="w-full md:w-auto bg-[#1A1C23] text-white px-4 py-3 md:py-2 rounded font-bold hover:bg-gray-800">
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
                <div key={day} className={`min-h-[80px] md:min-h-[120px] bg-white border p-1 md:p-2 rounded flex flex-col shadow-sm transition-all hover:shadow-md ${isToday ? 'border-[#FF6B00] ring-1 ring-[#FF6B00]' : 'border-gray-200'}`}>
                  <div 
                    onClick={() => setEventDrawer({ isOpen: true, event: { id: Date.now(), title: 'Novo Evento', date: dateStr, type: 'Evento Normal', description: '', color: '#3a71ba' }})}
                    className="cursor-pointer text-right text-xs md:text-sm font-bold mb-1 md:mb-2 p-1 rounded hover:bg-gray-50"
                    style={dayEvents.length > 0 ? { color: dayEvents[0].color } : { color: isToday ? '#FF6B00' : '#9ca3af' }}
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
            <h2 className="text-lg md:text-xl font-bold text-[#1A202C]">Próximos Eventos</h2>
          </div>
          <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
            {sortedEvents.map(e => {
              const diffDays = Math.ceil((new Date(e.date) - currentDate) / (1000 * 60 * 60 * 24));
              let statusText = diffDays < 0 ? 'Passou' : diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Faltam ${diffDays} dias`;
              return (
                <div key={e.id} className="p-3 rounded-lg border border-gray-100 flex items-center gap-3 md:gap-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer" onClick={() => setEventDrawer({ isOpen: true, event: { ...e }})}>
                  <div className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-md bg-gray-50 border-l-4 shadow-sm" style={{ borderLeftColor: e.color }}>
                    <span className="text-[10px] font-bold text-gray-500 uppercase leading-none">Nov</span>
                    <span className="text-base md:text-lg font-black leading-none" style={{ color: e.color }}>{e.date.split('-')[2]}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm md:text-sm text-gray-800 leading-tight truncate">{e.title}</h3>
                    <div className="flex gap-2 text-[10px] md:text-xs mt-1">
                      <span className={`font-bold ${diffDays < 0 ? 'text-gray-400' : 'text-[#FF6B00]'}`}>{statusText}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GAVETA LATERAL DO EVENTO */}
        {eventDrawer.isOpen && (
          <div className="absolute top-0 right-0 w-full md:w-[380px] h-full bg-white shadow-2xl md:border-l p-6 z-50">
             <div className="flex flex-col h-full space-y-5">
                <div className="flex justify-between items-center pb-4 border-b">
                  <h2 className="text-lg font-bold text-[#2A3143]">Detalhes do Evento</h2>
                  <button onClick={() => setEventDrawer({ isOpen: false, event: null })} className="text-gray-400 hover:text-gray-800 text-xl font-light">✕</button>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Título do Evento</label>
                  <input className="w-full p-2.5 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none focus:border-gray-400" value={eventDrawer.event.title} onChange={e => setEventDrawer({ ...eventDrawer, event: { ...eventDrawer.event, title: e.target.value }})} />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Data</label>
                  <input type="date" className="w-full p-2.5 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none" value={eventDrawer.event.date} onChange={e => setEventDrawer({ ...eventDrawer, event: { ...eventDrawer.event, date: e.target.value }})} />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase">Cor do Evento</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map(c => (
                      <button key={c} onClick={() => setEventDrawer({ ...eventDrawer, event: { ...eventDrawer.event, color: c }})} className={`w-7 h-7 rounded-full shadow-sm border-2 ${eventDrawer.event.color === c ? 'border-gray-900 scale-125' : 'border-transparent hover:scale-110'} transition-transform`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Tipo</label>
                   <select className="w-full p-2.5 border border-gray-200 rounded text-sm text-gray-800 bg-white focus:outline-none" value={eventDrawer.event.type || 'Evento Normal'} onChange={e => setEventDrawer({...eventDrawer, event: {...eventDrawer.event, type: e.target.value}})}>
                     <option value="Evento Normal">Evento Normal</option>
                     <option value="Feriado">Feriado</option>
                     <option value="Marco">Marco / Reunião</option>
                   </select>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Descrição</label>
                   <textarea className="w-full p-2.5 border border-gray-200 rounded text-sm text-gray-800 focus:outline-none min-h-[120px] resize-y" placeholder="Alinhamento com capitão..." value={eventDrawer.event.description || ''} onChange={e => setEventDrawer({...eventDrawer, event: {...eventDrawer.event, description: e.target.value}})} />
                </div>

                <div className="mt-auto pt-4 border-t flex gap-2">
                  <button onClick={() => { setEvents(events.find(e => e.id === eventDrawer.event.id) ? events.map(e => e.id === eventDrawer.event.id ? eventDrawer.event : e) : [...events, eventDrawer.event]); setEventDrawer({ isOpen: false, event: null }); }} className="flex-1 p-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded shadow-sm transition-colors">
                    Salvar
                  </button>
                  {events.find(e => e.id === eventDrawer.event.id) && (
                    <button onClick={() => { setEvents(events.filter(e => e.id !== eventDrawer.event.id)); setEventDrawer({ isOpen: false, event: null }); }} className="flex-1 p-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded transition-colors">
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
    <div className="flex flex-col-reverse md:flex-row h-[100dvh] font-sans bg-gray-100 overflow-hidden text-gray-800 selection:bg-[#FF6B00] selection:text-white">
      {renderSidebar()}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'kanban' && renderKanban()}
        {activeTab === 'gantt' && renderGantt()}
        {activeTab === 'calendar' && renderCalendar()}
      </div>
    </div>
  );
}
