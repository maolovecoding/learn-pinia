# pinia

## vuex 和pinia的对比

**vuex**的缺点：

1. ts支持较差
2. 命名空间有缺陷

**pinia**的优点：

1. ts兼容性好
2. 舍弃了命名空间
3. 不再区分`action`和`mutation`，只有action了。
4. 修改状态可以直接修改，也可以在action中修改
5. 更小巧
6. 可以创建多个store

### pinia的简单使用

**计数器**：

```ts
import { defineStore } from "pinia";

export default defineStore("counter", {
  state() {
    return {
      count: 0,
    };
  },
  getters: {
    doubleCounter(): number {
      return this.count * 2;
    },
  },
});
```

```vue
<script setup lang="ts">
import { useCounterStore } from "./store";
const counterStore = useCounterStore();
</script>

<template>
  <div>
    <h2>{{ counterStore.count }}</h2>
    <button @click="counterStore.count++">+1</button>
    <button @click="counterStore.count--">-1</button>
  </div>
</template>
```

**其实创建的counterStore**对象，就是一个响应式对象：或者你可以这样简单的先理解一下：

```ts
const counterStore = reactive({
  count:0,
  // ...
})
```

### pinia的 vuex用法

如果我们熟悉vuex，那么我们可能会这样使用pinia：

```ts
export default defineStore("counter", {
  state() {
    return {
      count: 0,
    };
  },
  getters: {
    doubleCounter(): number {
      return this.count * 2;
    },
  },
  // 同步异步都在action里面
  actions: {
    increment(num: number) {
      this.count += num;
    },
  },
});
```

### pinia的setup用法

但是，我们传递的第二个参数不一定是一个对象，也可以是一个setup函数：

```ts
// 第二个参数还可以是一个setup函数
export default defineStore("counter", () => {
  const state = reactive({
    count: 0,
  });
  const doubleCounter = computed(() => state.count * 2);
  const increment = (num: number) => (state.count += num);
  return {
    ...toRefs(state),
    doubleCounter,
    increment,
  };
});
```

我们发现，一样可以实现上面的功能。来到这里我只感觉到了一个字：**妙！**真的很优雅啊！
