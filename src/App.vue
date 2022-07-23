<script setup lang="ts">
import { useCounterStore } from "./store";
const counterStore = useCounterStore();
</script>

<template>
  <div>
    <h2>count: {{ counterStore.count }}</h2>
    <h2>doubleCount: {{ counterStore.doubleCount }}</h2>
    <button @click="counterStore.count++">+1</button>
    <button @click="counterStore.increment(5)">+5</button>
    <button @click="counterStore.count--">-1</button>
  </div>
</template>
