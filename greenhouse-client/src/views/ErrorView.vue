<script setup lang="ts">

  import { AuthError } from '@/model/ErrorCodes';
import { useRoute } from 'vue-router'

  const route = useRoute()

  let errorCode = 0
  
  if (route.query.code) {
    errorCode = +route.query.code
  }

  let errorReason = Object.values(AuthError)[errorCode]

</script>

<template>
    <p>Error {{ errorCode }}</p>
    <p>{{ errorReason }}</p>
</template>

<style scoped>
  
</style>
