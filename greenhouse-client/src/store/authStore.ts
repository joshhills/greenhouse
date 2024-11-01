import { defineStore } from "pinia"
import { useLocalStorage } from '@vueuse/core'

export const useAuthStore = defineStore('auth', {
    state: () => {
        return {
            accessToken: useLocalStorage('accessToken', null),
            expiresIn: useLocalStorage('expiresIn', -1),
            refreshToken: useLocalStorage('refreshToken', null),
            idToken: useLocalStorage('idToken', null)
        }
    },
    getters: {
        isLoggedIn(state): boolean {

            const now = Date.now()

            // TODO: Could verify the structure
            return state.accessToken !== null
                && state.accessToken !== ''
                && now <  now + (state.expiresIn * 1000)
        }
    },
    actions: {
        updateToken (token: any) {
            this.accessToken = token.accessToken
            this.expiresIn = token.expiresIn
            this.refreshToken = token.refreshToken
            this.idToken = token.idToken
        },
        clearToken () {
            this.accessToken = null
            this.expiresIn = -1
            this.refreshToken = null
            this.idToken = null
        }
    }
})