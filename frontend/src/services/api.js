import axios from 'axios'

// En producción separada: VITE_API_URL=https://tu-backend.railway.app/api
// En producción same-origin (recomendado): dejar vacío, usa /api
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('pd_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pd_token')
      localStorage.removeItem('pd_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
