<script setup lang="ts">
import { useCounterStore } from "./store";
const counterStore = useCounterStore();
const handleClick = () => {
  // 状态的批量操作
  // counterStore.$patch((store: any) => {
  //   store.count++;
  //   store.fruits.push("水蜜桃" + store.count);
  // });
  counterStore.$patch({
    count: 20,
    fruits: [...counterStore.fruits, "橘子"],
  });
};
</script>

<template>
  <div>
    <h2>count: {{ counterStore.count }}</h2>
    <h2>doubleCount: {{ counterStore.doubleCount }}</h2>
    <button @click="counterStore.count++">+1</button>
    <button @click="counterStore.increment(5)">+5</button>
    <button @click="counterStore.count--">-1</button>
    <ul>
      <li v-for="item in counterStore.fruits" :key="item">{{ item }}</li>
    </ul>
    <button @click="handleClick">添加水果</button>
  </div>
</template>
