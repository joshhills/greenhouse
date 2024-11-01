<script setup lang="ts">
  import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <RouterLink to="/login">Login</RouterLink>
  <RouterLink to="/game">Game</RouterLink>
  <RouterLink to="/logout">Logout</RouterLink>
  
  <RouterView />
</template>

<style scoped>
  
</style>
