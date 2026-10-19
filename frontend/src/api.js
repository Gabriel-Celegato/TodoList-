const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`
    try {
      const data = await response.json()
      message = data.message || data.error || message
    } catch {
      // resposta sem JSON
    }
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}

export async function listTasks({ search = '', status = 'all' } = {}) {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  if (status !== 'all') params.set('status', status)
  const query = params.toString() ? `?${params.toString()}` : ''
  return request(`/api/tasks${query}`)
}

export function createTask({ title, dueDate }) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: title.trim(),
      dueDate: dueDate || null
    })
  })
}

export function updateTask(id, payload) {
  return request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export function deleteTask(id) {
  return request(`/api/tasks/${id}`, { method: 'DELETE' })
}