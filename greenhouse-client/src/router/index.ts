import { useAuthStore } from '@/store/authStore'
import { storeToRefs } from 'pinia'
import GameView from '@/views/GameView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import { createRouter, createWebHistory } from 'vue-router'
import ErrorView from '@/views/ErrorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login:pathMatch(.*)',
      name: 'login',
      component: LoginView
    },
    {
      path: '/logout',
      name: 'logout',
      children: [],
      beforeEnter: (to, from) => {
        const auth = useAuthStore()
        auth.clearToken()

        return router.push('/')
      }
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
      beforeEnter: (to, from) => {
        const auth = useAuthStore()

        if (!auth.isLoggedIn) {
          return router.push(`/login?redirect=${to.path}`)
        } else return true
      }
    },
    {
      path: '/:pathMatch(.*)',
      name: 'error',
      component: ErrorView
    }
  ]
})

export default router
