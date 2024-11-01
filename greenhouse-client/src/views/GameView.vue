<script setup lang="ts">

import Game from '../components/Game.vue'
import { useAuthStore } from '@/store/authStore';

const auth = useAuthStore()

</script>

<template>
  <Game :accessToken="auth.accessToken" />
</template>

<style scoped>
  
</style>
