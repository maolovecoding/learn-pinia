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
const handleResetClick = () => {
  counterStore.$reset();
};
counterStore.$onAction(({ after, onError, store }: any) => {
  after((res: any) => {
    // res是action的执行后的返回值
    console.log("状态修改成功后的回调", res);
  });
  // console.log(store);
});
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
    <button @click="handleResetClick">重置状态</button>
  </div>
</template>
