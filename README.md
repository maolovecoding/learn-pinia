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

**或者这样使用也是可以的**：

```ts
export default defineStore({
  id: "counter",
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

## pinia原理

1. pinia中可以定义多个store，每个store都是一个reactive对象
2. pinia的实现借助了scopeEffect
3. 全局注册一个rootPinia，通过provide提供pinia
4. 每个store使用都必须在setup中，因为这里才能inject到pinia

### pinia的state的实现

**createPinia**：

```ts
export const symbolPinia = Symbol("rootPinia");
```

```ts
import { App, effectScope, markRaw, Plugin, ref, EffectScope, Ref } from "vue";
import { symbolPinia } from "./rootStore";

export const createPinia = () => {
  // 作用域scope 独立空间
  const scope = effectScope(true);
  // run方法发返回值就是这个fn的返回结果
  const state = scope.run(() => ref({}));
  // 将一个对象标记为不可被转为代理。返回该对象本身。
  const pinia = markRaw({
    install(app: App) {
      // pinia希望能被共享出去
      // 将pinia实例暴露到app上，所有的组件都可以通过inject注入进去
      app.provide(symbolPinia, pinia);
      // 可以在模板访问 直接通过 $pinia访问根pinia
      app.config.globalProperties.$pinia = pinia;
      // pinia也记录一下app 方便后续使用
      pinia._a = app;
    },
    // 所有的state
    state,
    _e: scope, // 管理整个应用的scope
    // 所有的store
    _s: new Map(),
  } as Plugin & IRootPinia);
  return pinia;
};

export interface IRootPinia {
  [key: symbol]: symbol;
  _a: App;
  state: Ref<any>;
  _e: EffectScope;
  _s: Map<string, any>;
}
```

**defineStore**:

```ts
import {
  getCurrentInstance,
  inject,
  effectScope,
  EffectScope,
  reactive,
} from "vue";
import { IRootPinia } from "./createPinia";
import { symbolPinia } from "./rootStore";

export function defineStore(options: IPiniaStoreOptions): any;
export function defineStore(
  id: string,
  options: Pick<IPiniaStoreOptions, "actions" | "getters" | "state">
): any;
export function defineStore(id: string, setup: () => any): any;
export function defineStore(idOrOptions: any, storeSetup?: any) {
  let id: string, options: any;
  if (typeof idOrOptions === "string") {
    id = idOrOptions;
    options = storeSetup;
  } else {
    // 这里就是一个参数的形式 id参数定义在对象内
    options = idOrOptions;
    id = idOrOptions.id;
  }
  // 注册一个store
  function useStore() {
    // 必须在setup中使用
    const currentInstance = getCurrentInstance();
    if (!currentInstance) throw new Error("pinia 需要在setup函数中使用");
    // 注入 pinia
    const pinia = inject<IRootPinia>(symbolPinia)!;
    // 还没注册
    if (!pinia._s.has(id)) {
      // counter:state:{count:0}
      createOptionsStore(id, options, pinia);
    }
    // 获取store
    const store = pinia._s.get(id);
    return store;
  }
  return useStore;
}

const createOptionsStore = (
  id: string,
  options: Pick<IPiniaStoreOptions, "actions" | "getters" | "state">,
  pinia: IRootPinia
) => {
  const { state, getters, actions } = options;
  // store单独的scope
  let scope: EffectScope;
  const setup = () => {
    // 缓存 state
    if (pinia.state.value[id]) {
      console.warn(`${id} store 已经存在！`);
    }
    const localState = (pinia.state.value[id] = state ? state() : {});
    return localState;
  };
  // scope可以停止所有的store 每个store也可以停止自己的
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });
  // 一个store 就是一个reactive对象
  const store = reactive({});
  Object.assign(store, setupStore);
  // 向pinia中放入store
  pinia._s.set(id, store);
  console.log(pinia)
};

export interface IPiniaStoreOptions {
  id?: string;
  state?: () => any;
  getters?: any;
  actions?: any;
}
```

此时，我们在页面依然可以进行对count数据的修改：

```ts
export default defineStore("counter", {
  state() {
    return {
      count: 0,
    };
  }
});
```

### actions 和getters

```ts
const createOptionsStore = (
  id: string,
  options: Pick<IPiniaStoreOptions, "actions" | "getters" | "state">,
  pinia: IRootPinia
) => {
  const { state, getters = {}, actions } = options;
  // store单独的scope
  let scope: EffectScope;
  const setup = () => {
    // 缓存 state
    if (pinia.state.value[id]) {
      console.warn(`${id} store 已经存在！`);
    }
    const localState = (pinia.state.value[id] = state ? state() : {});
    return Object.assign(
      localState,
      actions,
      Object.keys(getters).reduce(
        (computedGetter: { [key: string]: ComputedRef<any> }, name) => {
          // 计算属性可缓存
          computedGetter[name] = computed(() => {
            // 我们需要获取当前的store是谁
            return Reflect.apply(getters[name], store, [store]);
          });
          return computedGetter;
        },
        {}
      )
    );
  };
  // scope可以停止所有的store 每个store也可以停止自己的
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });
  // 一个store 就是一个reactive对象
  const store = reactive({});
  // 处理action的this问题
  for (const key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop === "function") {
      // 扩展action
      setupStore[key] = wrapAction(key, prop, store);
    }
  }
  Object.assign(store, setupStore);
  // 向pinia中放入store
  pinia._s.set(id, store);
  setTimeout(() => {
    console.log(pinia);
  }, 2000);
};
const wrapAction = (key: string, action: any, store: any) => {
  return (...args: Parameters<typeof action>) => {
    // 触发action之前 可以触发一些额外的逻辑
    const res = Reflect.apply(action, store, args);
    // 返回值也可以做处理
    return res;
  };
};
```

### setupStore的原理

```ts
function useStore() {
  // 必须在setup中使用
  const currentInstance = getCurrentInstance();
  if (!currentInstance) throw new Error("pinia 需要在setup函数中使用");
  // 注入 pinia
  const pinia = inject<IRootPinia>(symbolPinia)!;
  // 还没注册
  if (!pinia._s.has(id)) {
    if (isSetupStore) {
      // 创建setupStore
      createSetupStore(id, storeSetup, pinia);
    } else {
      // counter:state:{count:0}
      createOptionsStore(id, options, pinia);
    }
  }
  // 获取store
  const store = pinia._s.get(id);
  return store;
}
const createSetupStore = (id: string, setup: () => any, pinia: IRootPinia) => {
  // 一个store 就是一个reactive对象
  const store = reactive({});
  // store单独的scope
  let scope: EffectScope;
  // scope可以停止所有的store 每个store也可以停止自己的
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });
  // 处理action的this问题
  for (const key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop === "function") {
      // 扩展action
      setupStore[key] = wrapAction(key, prop, store);
    }
  }
  Object.assign(store, setupStore);
  // 向pinia中放入store
  pinia._s.set(id, store);
  return store;
};

const createOptionsStore = (
  id: string,
  options: Pick<IPiniaStoreOptions, "actions" | "getters" | "state">,
  pinia: IRootPinia
) => {
  const { state, getters = {}, actions } = options;
  const setup = () => {
    // 缓存 state
    if (pinia.state.value[id]) {
      console.warn(`${id} store 已经存在！`);
    }
    const localState = (pinia.state.value[id] = state ? state() : {});
    return Object.assign(
      localState,
      actions,
      Object.keys(getters).reduce(
        (computedGetter: { [key: string]: ComputedRef<any> }, name) => {
          // 计算属性可缓存
          computedGetter[name] = computed(() => {
            // 我们需要获取当前的store是谁
            return Reflect.apply(getters[name], store, [store]);
          });
          return computedGetter;
        },
        {}
      )
    );
  };
  const store = createSetupStore(id, setup, pinia);
};
```
