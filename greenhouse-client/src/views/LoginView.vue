<script setup lang="ts">

  import { useAuthStore } from '@/store/authStore'
  import { useRouter, useRoute } from 'vue-router'

  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()

  let redirect = route.query.redirect as string

  if (route.query.state) {
    redirect = route.query.state as string
  }

  if (!redirect) {
    redirect = '/game'
  }

  // If already logged in, redirect immediately
  if (auth.isLoggedIn) {
    router.push({ path: redirect })
  }

  // Perform token exhcnage
  if (route.query.code) {
    fetch('http://localhost:3001/auth/token', {
      method: 'POST',
      // TODO: Pull fields from config
      body: JSON.stringify({
        code: route.query.code,
        client_id: 'greenhouse-game-client',
        client_secret: 'publicS3cr3t',
        redirect_uri: 'http://localhost:3000/login/callback',
        grant_type: 'authorization_code'
      }),
      headers: {
        "Content-Type": "application/json",
      }
    }).then(response => {
      if (response.status === 403) {
        router.push({ path: '/error', query: { code: 1 } })
      }
      else if (response.status !== 200) {
        router.push({ path: '/error', query: { code: 0 } })
      }

      if (response.status !== 200) {
        throw new Error()
      }

      return response.json()
    })
    .then(json => {

      auth.updateToken({
        accessToken: json.access_token,
        expiresIn: json.expires_in,
        refreshToken: json.refresh_token,
        idToken: json.id_token
      })

      // Redirect to redirect view
      // TODO: Boilerplate
      router.push({ path: redirect })
    }).catch(err => {})
  }

</script>

<template>
  <div class="login">
    <h1>Login</h1>
    <a :href="`http://localhost:3001/auth/google?response_type=code&scope=game&state=${redirect}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin%2Fcallback&client_id=greenhouse-game-client&access_type=offline`">Log-in with Google</a>
  </div>
</template>

<style>
@media (min-width: 1024px) {
  .login {

  }
}
</style>
