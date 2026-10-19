import { useCallback, useEffect, useMemo, useState } from 'react'
import { createTask, deleteTask, listTasks, updateTask } from './api'

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  }

  const icons = {
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>,
    moon: <><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" /></>,
    pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9h18" /></>,
    check: <path d="m7 12 3 3 7-7" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-14.8-4L3 10" /><path d="M3 5v5h5" /><path d="M4 13a8.1 8.1 0 0 0 14.8 4L21 14" /><path d="M21 19v-5h-5" /></>,
    circleCheck: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>
  }

  return <svg {...common}>{icons[name]}</svg>
}

function normalizeDate(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function formatDate(value) {
  const dateValue = normalizeDate(value)
  if (!dateValue) return 'Sem prazo'
  const [y, m, d] = dateValue.split('-').map(Number)
  if (!y || !m || !d) return 'Sem prazo'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(y, m - 1, d))
}

function isOverdue(task) {
  if (task.completed || !task.due_date) return false
  const [y, m, d] = normalizeDate(task.due_date).split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const aDate = a.due_date ? new Date(`${normalizeDate(a.due_date)}T00:00:00`).getTime() : Infinity
    const bDate = b.due_date ? new Date(`${normalizeDate(b.due_date)}T00:00:00`).getTime() : Infinity
    if (aDate !== bDate) return aDate - bDate
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
}

function Modal({ mode, task, onClose, onSave, saving }) {
  const editing = mode === 'edit'
  const [title, setTitle] = useState(task?.title || '')
  const [dueDate, setDueDate] = useState(normalizeDate(task?.due_date))

  useEffect(() => {
    setTitle(task?.title || '')
    setDueDate(normalizeDate(task?.due_date))
  }, [task])

  async function submit(event) {
    event.preventDefault()
    if (!title.trim()) return
    await onSave({ title: title.trim(), dueDate: dueDate || null })
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-kicker">{editing ? 'TASK MANAGEMENT' : 'NEW TASK'}</span>
            <h2>{editing ? 'Edit Task' : 'Create Task'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="field">
            <span>Título</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              placeholder="Ex.: Finalizar documentação do projeto"
            />
          </label>

          <label className="field">
            <span>Data limite <small>(opcional)</small></span>
            <div className="date-input">
              <Icon name="calendar" size={17} />
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </label>

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button primary" disabled={!title.trim() || saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const overdue = isOverdue(task)

  return (
    <article className={`task-card ${task.completed ? 'is-completed' : ''} ${overdue ? 'is-overdue' : ''}`}>
      <div className="task-main">
        <button
          className={`check-button ${task.completed ? 'checked' : ''}`}
          onClick={() => onToggle(task)}
          aria-label={task.completed ? 'Desmarcar tarefa' : 'Marcar como concluída'}
        >
          {task.completed && <Icon name="check" size={14} />}
        </button>

        <div className="task-content">
          <div className="task-title-row">
            <h3 title={task.title}>{task.title}</h3>
            {overdue && <span className="badge overdue">Em atraso</span>}
          </div>

          <div className="task-meta">
            <span className={`date ${overdue ? 'danger' : ''}`}>
              <Icon name="calendar" size={14} />
              {formatDate(task.due_date)}
            </span>
            {task.completed && <span className="badge completed">Concluída</span>}
          </div>
        </div>
      </div>

      <div className="task-actions">
        <button className="icon-button action-edit" onClick={() => onEdit(task)} aria-label="Editar">
          <Icon name="pencil" size={16} />
        </button>
        <button className="icon-button action-delete" onClick={() => onDelete(task)} aria-label="Excluir">
          <Icon name="trash" size={16} />
        </button>
      </div>
    </article>
  )
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({ total: 0, completed: 0 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('taskboard-theme') === 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('taskboard-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 450)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadTasks = useCallback(async () => {
    try {
      setError('')
      const data = await listTasks({ search, status })
      setTasks(data.tasks || [])
      setStats({
        total: Number(data.total) || 0,
        completed: Number(data.completed) || 0
      })
    } catch (err) {
      setError(err.message || 'Não foi possível carregar as tarefas.')
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    setLoading(true)
    loadTasks()
  }, [loadTasks])

  const visibleTasks = useMemo(() => sortTasks(tasks), [tasks])
  const pending = Math.max(stats.total - stats.completed, 0)

  async function handleSave(payload) {
    setSaving(true)
    try {
      if (modal.mode === 'edit') {
        await updateTask(modal.task.id, payload)
      } else {
        await createTask(payload)
      }
      setModal(null)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a tarefa.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(task) {
    try {
      await updateTask(task.id, { completed: !Boolean(task.completed) })
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar a tarefa.')
    }
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(`Excluir a tarefa "${task.title}"?`)
    if (!confirmed) return

    try {
      await deleteTask(task.id)
      await loadTasks()
    } catch (err) {
      setError(err.message || 'Não foi possível excluir a tarefa.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="menu-button" aria-label="Menu">
          <Icon name="menu" size={20} />
        </button>

        <div className="brand">
          <span className="brand-mark"><Icon name="circleCheck" size={18} /></span>
          <span>Todo List</span>
        </div>

        <div className="topbar-actions">
          <span className="status-dot" title="API conectada"></span>
          <button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label="Alternar tema">
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h1>Minhas tarefas</h1>
            <p>Organize seus prazos e mantenha o trabalho em movimento.</p>
          </div>

          <button className="button primary desktop-create" onClick={() => setModal({ mode: 'create' })}>
            <Icon name="plus" size={17} />
            Criar tarefa
          </button>
        </section>

        <section className="toolbar">
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar tarefas..."
              aria-label="Buscar tarefas"
            />
            {searchInput && (
              <button className="clear-search" onClick={() => setSearchInput('')} aria-label="Limpar busca">
                <Icon name="close" size={15} />
              </button>
            )}
          </div>

          <div className="filters">
            <button className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')}>Todas</button>
            <button className={status === 'pending' ? 'active' : ''} onClick={() => setStatus('pending')}>Pendentes</button>
            <button className={status === 'completed' ? 'active' : ''} onClick={() => setStatus('completed')}>Concluídas</button>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span className="stat-label">TOTAL</span>
            <strong>{stats.total}</strong>
            <span className="stat-hint">tarefas</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">CONCLUÍDAS</span>
            <strong>{stats.completed}</strong>
            <span className="stat-hint">finalizadas</span>
          </div>
          <div className="stat-card highlight">
            <span className="stat-label">PENDENTES</span>
            <strong>{pending}</strong>
            <span className="stat-hint">em andamento</span>
          </div>
        </section>

        {error && (
          <div className="error-banner">
            <div>
              <strong>Não foi possível concluir a operação.</strong>
              <span>{error}</span>
            </div>
            <button className="icon-button" onClick={() => { setError(''); loadTasks() }} aria-label="Tentar novamente">
              <Icon name="refresh" size={17} />
            </button>
          </div>
        )}

        <section className="tasks-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TASKS</span>
              <h2>{search ? `Resultados para "${search}"` : status === 'completed' ? 'Tarefas concluídas' : status === 'pending' ? 'Tarefas pendentes' : 'Todas as tarefas'}</h2>
            </div>
            <span className="result-count">{visibleTasks.length} {visibleTasks.length === 1 ? 'item' : 'itens'}</span>
          </div>

          {loading ? (
            <div className="loading-list">
              {[1, 2, 3].map((item) => <div className="skeleton-card" key={item} />)}
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="circleCheck" size={30} /></div>
              <h3>You have no pending tasks.</h3>
              <p>{search ? 'Tente outra busca ou limpe o filtro.' : 'Crie uma tarefa para começar a organizar seu dia.'}</p>
              {!search && (
                <button className="button secondary" onClick={() => setModal({ mode: 'create' })}>
                  <Icon name="plus" size={16} />
                  Criar primeira tarefa
                </button>
              )}
            </div>
          ) : (
            <div className="task-list">
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onEdit={(selected) => setModal({ mode: 'edit', task: selected })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <button className="floating-add" onClick={() => setModal({ mode: 'create' })} aria-label="Criar tarefa">
        <Icon name="plus" size={26} />
      </button>

      {modal && (
        <Modal
          mode={modal.mode}
          task={modal.task}
          onClose={() => !saving && setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  )
}